import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { CourseGrant, Prisma, ValidityUnit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { auditDelete, Actor } from '../audit/audit';

// ---------------------------------------------------------------- validity maths (pure)
export const VALIDITY_UNITS: ValidityUnit[] = ['DAY', 'WEEK', 'MONTH', 'YEAR', 'LIFETIME'];
/** Largest value the admin may enter per unit (keeps every date well inside what a database timestamp holds). */
const MAX_VALUE: Record<Exclude<ValidityUnit, 'LIFETIME'>, number> = { DAY: 3650, WEEK: 520, MONTH: 120, YEAR: 50 };

export function assertValidity(unit: ValidityUnit, value: number) {
  if (unit === 'LIFETIME') return;
  if (!Number.isInteger(value) || value < 1) throw new BadRequestException('Validity must be a whole number of 1 or more.');
  if (value > MAX_VALUE[unit]) throw new BadRequestException(`Validity cannot be more than ${MAX_VALUE[unit]} ${unit.toLowerCase()}s. Use Lifetime for no expiry.`);
}

/** Calendar-aware: 1 month after 31 Jan is 28/29 Feb, never 3 Mar. Returns null for LIFETIME (never expires). */
export function addValidity(from: Date, unit: ValidityUnit, value: number): Date | null {
  if (unit === 'LIFETIME') return null;
  const d = new Date(from.getTime());
  if (unit === 'DAY') d.setUTCDate(d.getUTCDate() + value);
  else if (unit === 'WEEK') d.setUTCDate(d.getUTCDate() + value * 7);
  else {
    const months = unit === 'YEAR' ? value * 12 : value;
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }
  return d;
}

export function validityLabel(unit: ValidityUnit, value: number) {
  if (unit === 'LIFETIME') return 'Lifetime';
  const word = unit.toLowerCase();
  return `${value} ${word}${value === 1 ? '' : 's'}`;
}

type ValidityCourse = { validityUnit: ValidityUnit; validityValue: number };
/** Is this enrolment row open right now? */
export const isOpen = (e: { status: string; expiresAt: Date | null }, now = new Date()) => e.status === 'ACTIVE' && (!e.expiresAt || e.expiresAt > now);

/**
 * Starts (or restarts) a learner's access. 'restart' counts the full validity from now (admin assignment, task approval,
 * a purchase after expiry). 'extend' (a payment that lands while access is still running) adds the validity on top of what is left.
 */
export async function grantAccess(
  db: Prisma.TransactionClient | PrismaService,
  userId: string,
  course: ValidityCourse & { id: string },
  source: CourseGrant,
  mode: 'restart' | 'extend' = 'restart',
  now = new Date(),
) {
  const existing = await db.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  let activatedAt = now;
  let expiresAt = addValidity(now, course.validityUnit, course.validityValue);
  if (mode === 'extend' && existing && isOpen(existing, now)) {
    activatedAt = existing.activatedAt ?? existing.createdAt;
    expiresAt = existing.expiresAt === null ? null : addValidity(existing.expiresAt, course.validityUnit, course.validityValue);
  }
  const data = { status: 'ACTIVE' as const, source, activatedAt, expiresAt, rejectionReason: null, decidedAt: now };
  return db.courseEnrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: { userId, courseId: course.id, ...data },
    update: data,
  });
}

// ---------------------------------------------------------------- Razorpay
const RZP_API = 'https://api.razorpay.com/v1';
const hmac = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('hex');
function sameHex(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const log = new Logger('CourseActivation');
const rzpAuth = (k: { id: string; secret: string }) => `Basic ${Buffer.from(`${k.id}:${k.secret}`).toString('base64')}`;
export const RZP_TIMEOUT_MS = 10_000;

/**
 * Asks Razorpay itself whether this payment really belongs to this order, for this amount, and is captured. The browser's
 * signature only proves Razorpay issued it, so this also covers a merchant account on manual capture (an authorised but
 * never-captured payment would otherwise unlock the course and then be auto-refunded). Returns false while still only authorised.
 */
export async function confirmCapture(k: { id: string; secret: string }, paymentId: string, orderId: string, amountPaise: number, currency: string): Promise<boolean> {
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${RZP_API}${path}`, { ...init, headers: { Authorization: rzpAuth(k), 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(RZP_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Razorpay ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json() as Promise<{ status: string; order_id: string | null; amount: number; currency: string }>;
  };
  try {
    let p = await call(`/payments/${encodeURIComponent(paymentId)}`);
    if (p.status === 'authorized') {
      await call(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: JSON.stringify({ amount: amountPaise, currency }) }).catch(() => undefined);
      p = await call(`/payments/${encodeURIComponent(paymentId)}`);
    }
    if (p.order_id !== orderId || p.amount !== amountPaise || p.currency !== currency) {
      log.error(`Payment ${paymentId} does not match order ${orderId} (got ${p.order_id} ${p.amount} ${p.currency}, expected ${amountPaise} ${currency})`);
      throw new BadRequestException('We could not verify that payment.');
    }
    return p.status === 'captured';
  } catch (e) {
    if (e instanceof HttpException) throw e;
    log.error(`Could not confirm payment ${paymentId}: ${(e as Error).message}`);
    throw new ServiceUnavailableException('We could not confirm your payment with the bank just yet. If you were charged, your access switches on automatically within a few minutes.');
  }
}

/**
 * Marks a course order paid and activates the buyer. Safe to call any number of times (browser callback + webhook):
 * only the call that flips CREATED -> PAID grants access. Does nothing for an order id that is not a course order.
 * `paid` (webhook only) is Razorpay's own amount/currency for the payment; a mismatch with the order we created is refused.
 * Same-learner settles are serialised with an advisory lock so two orders landing together both extend the validity.
 * A learner an admin revoked is not re-activated by an order they opened earlier: the payment is recorded and logged for a refund.
 */
export async function settleCoursePayment(prisma: PrismaService, orderId: string, paymentId: string, paid?: { amount: number; currency: string }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.coursePayment.findUnique({ where: { razorpayOrderId: orderId }, include: { course: true } });
    if (!order) return false;
    if (paid && (paid.amount !== order.amountPaise || paid.currency !== order.currency)) {
      log.error(`Refusing to settle ${orderId}: Razorpay says ${paid.amount} ${paid.currency}, order was ${order.amountPaise} ${order.currency}`);
      return false;
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`course:${order.userId}:${order.courseId}`}))`;
    const flipped = await tx.coursePayment.updateMany({
      where: { id: order.id, status: 'CREATED' },
      data: { status: 'PAID', razorpayPaymentId: paymentId, paidAt: new Date() },
    });
    if (flipped.count === 1) {
      const row = await tx.courseEnrollment.findUnique({ where: { userId_courseId: { userId: order.userId, courseId: order.courseId } }, select: { status: true } });
      if (row?.status === 'REVOKED') log.warn(`Payment ${paymentId} (order ${orderId}) arrived for a REVOKED learner (${order.userId}, course ${order.courseId}). Access NOT granted: refund it.`);
      else await grantAccess(tx, order.userId, order.course, 'PAYMENT', 'extend');
    }
    return true;
  });
}

/**
 * A full refund ends the access that payment bought (the end date becomes now, so the learner can buy again to renew).
 * Partial refunds are only logged: the admin decides. Returns whether the payment was one of ours.
 */
export async function refundCoursePayment(prisma: PrismaService, paymentId: string, refundPaise: number) {
  const pay = await prisma.coursePayment.findUnique({ where: { razorpayPaymentId: paymentId } });
  if (!pay) return false;
  if (refundPaise < pay.amountPaise) {
    log.warn(`Partial refund (${refundPaise} of ${pay.amountPaise} paise) on payment ${paymentId}: access left as it is.`);
    return true;
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`course:${pay.userId}:${pay.courseId}`}))`;
    await tx.coursePayment.update({ where: { id: pay.id }, data: { status: 'REFUNDED' } });
    const row = await tx.courseEnrollment.findUnique({ where: { userId_courseId: { userId: pay.userId, courseId: pay.courseId } } });
    if (row && row.source === 'PAYMENT' && row.status === 'ACTIVE') {
      await tx.courseEnrollment.update({ where: { userId_courseId: { userId: pay.userId, courseId: pay.courseId } }, data: { expiresAt: new Date(), decidedAt: new Date() } });
    }
  });
  log.log(`Payment ${paymentId} refunded: access for ${pay.userId} on course ${pay.courseId} ended`);
  return true;
}

const MAX_OPEN_ORDERS_PER_DAY = 20;
const DAY_MS = 86_400_000;

type Viewer = { id: string; name: string; email: string };

@Injectable()
export class CourseActivationService {
  private readonly log = log;
  constructor(private readonly prisma: PrismaService) {}

  // Razorpay keys are read per call so they can be added to .env later without any code change.
  private keys() {
    const id = process.env.RAZORPAY_KEY_ID?.trim();
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    return id && secret ? { id, secret } : null;
  }

  private async openCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.published) throw new NotFoundException('Course not found');
    if (course.access === 'PUBLIC') throw new BadRequestException('This course is open to every member, so it does not need activating.');
    return course;
  }

  private async assertNotOpen(userId: string, courseId: string) {
    const row = await this.prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (row && isOpen(row)) throw new ConflictException('You already have access to this course.');
    return row;
  }

  /** Already open through the 1% Club or the programme: paying would only be a second charge for the same thing. */
  private async assertNotIncluded(userId: string, course: { access: string }) {
    if (course.access === 'CLUB' && (await this.prisma.mentorshipAccess.findUnique({ where: { userId }, select: { status: true } }))?.status === 'ACTIVE') {
      throw new ConflictException('Your 1% Club membership already includes this course.');
    }
    if (course.access === 'ENROLLED' && (await this.prisma.programEnrollment.findUnique({ where: { userId }, select: { status: true } }))?.status === 'ACTIVE') {
      throw new ConflictException('Your programme enrolment already includes this course.');
    }
  }

  // ---------- student: pay
  async startPayment(user: Viewer, courseId: string) {
    const course = await this.openCourse(courseId);
    if (!course.allowPayment || course.priceInr < 1) throw new BadRequestException('This course cannot be bought online.');
    const existing = await this.assertNotOpen(user.id, course.id);
    if (existing?.status === 'REVOKED') throw new ForbiddenException('Your access to this course was withdrawn. Please contact us.');
    await this.assertNotIncluded(user.id, course);

    const k = this.keys();
    if (!k) throw new ServiceUnavailableException('Online payment is not switched on yet. Please check back soon or contact us.');
    const amountPaise = course.priceInr * 100; // always the server's price, never the client's

    // Re-opening checkout (closed tab, second click, double tap) reuses the order from the last half hour instead of piling up new ones.
    const open = await this.prisma.coursePayment.findFirst({
      where: { userId: user.id, courseId: course.id, status: 'CREATED', amountPaise, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return { keyId: k.id, orderId: open.razorpayOrderId, amount: open.amountPaise, currency: open.currency, courseTitle: course.title };
    const today = await this.prisma.coursePayment.count({ where: { userId: user.id, status: 'CREATED', createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
    if (today >= MAX_OPEN_ORDERS_PER_DAY) throw new HttpException('Too many payment attempts today. Please try again tomorrow or contact us.', 429);

    let order: { id: string; amount: number; currency: string };
    try {
      const res = await fetch(`${RZP_API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: rzpAuth(k) },
        signal: AbortSignal.timeout(RZP_TIMEOUT_MS),
        body: JSON.stringify({
          amount: amountPaise, currency: 'INR', receipt: `crs_${Date.now().toString(36)}_${user.id.slice(-8)}`.slice(0, 40),
          notes: { userId: user.id, courseId: course.id, product: 'course' },
        }),
      });
      if (!res.ok) throw new Error(`Razorpay ${res.status}: ${(await res.text()).slice(0, 300)}`);
      order = await res.json();
    } catch (e) {
      this.log.error(`Could not create order: ${(e as Error).message}`);
      throw new ServiceUnavailableException('We could not start the payment. Please try again in a moment.');
    }
    await this.prisma.coursePayment.create({ data: { userId: user.id, courseId: course.id, amountPaise, currency: order.currency, razorpayOrderId: order.id } });
    return { keyId: k.id, orderId: order.id, amount: order.amount, currency: order.currency, courseTitle: course.title };
  }

  /** Called by the browser after Razorpay's checkout succeeds. The HMAC proves Razorpay issued it; Razorpay's API then confirms the capture. */
  async verifyPayment(userId: string, courseId: string, dto: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const k = this.keys();
    if (!k) throw new ServiceUnavailableException('Online payment is not switched on.');
    if (!sameHex(hmac(k.secret, `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`), dto.razorpay_signature)) {
      throw new BadRequestException('We could not verify that payment.');
    }
    const order = await this.prisma.coursePayment.findUnique({ where: { razorpayOrderId: dto.razorpay_order_id } });
    if (!order || order.userId !== userId || order.courseId !== courseId) throw new NotFoundException('Order not found.');
    if (order.status === 'PAID' && order.razorpayPaymentId && order.razorpayPaymentId !== dto.razorpay_payment_id) throw new ConflictException('This order was already paid.');
    if (order.status !== 'PAID' && !(await confirmCapture(k, dto.razorpay_payment_id, order.razorpayOrderId, order.amountPaise, order.currency))) {
      throw new ConflictException('Your payment is still being confirmed. Your access switches on automatically within a few minutes.');
    }
    await settleCoursePayment(this.prisma, order.razorpayOrderId, dto.razorpay_payment_id);
    this.log.log(`Course order ${order.razorpayOrderId} paid (${dto.razorpay_payment_id})`);
    return { ok: true };
  }

  // ---------- student: task
  async submitTask(userId: string, courseId: string) {
    const course = await this.openCourse(courseId);
    if (!course.allowTask) throw new BadRequestException('This course has no task.');
    const row = await this.assertNotOpen(userId, course.id);
    if (row?.status === 'REVOKED') throw new ForbiddenException('Your access to this course was withdrawn. Please contact us.');
    if (row?.status === 'PENDING') return { state: 'PENDING' };
    // Resubmitting after a rejection, or after an expiry, starts a fresh review. Access stays closed until it is approved.
    await this.prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      create: { userId, courseId: course.id, status: 'PENDING', source: 'TASK' },
      update: { status: 'PENDING', source: 'TASK', rejectionReason: null, decidedAt: null },
    });
    return { state: 'PENDING' };
  }

  // ---------- admin
  async list(courseId: string) {
    const rows = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
      orderBy: [{ updatedAt: 'desc' }],
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const now = new Date();
    // The latest settled payment per learner, so an admin can match a row to a Razorpay payment (refunds, support).
    const pays = await this.prisma.coursePayment.findMany({ where: { courseId, status: { in: ['PAID', 'REFUNDED'] } }, orderBy: { paidAt: 'asc' }, select: { userId: true, amountPaise: true, status: true, razorpayPaymentId: true, paidAt: true } });
    const lastPay = new Map(pays.map((p) => [p.userId, p]));
    return rows.map((r) => ({
      payment: lastPay.get(r.userId) ?? null,
      userId: r.userId, name: r.user.name, email: r.user.email, status: r.status, source: r.source,
      expired: r.status === 'ACTIVE' && !!r.expiresAt && r.expiresAt <= now,
      activatedAt: r.activatedAt ?? r.createdAt, expiresAt: r.expiresAt, rejectionReason: r.rejectionReason, requestedAt: r.createdAt,
    }));
  }

  private async course(courseId: string) {
    const c = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!c) throw new NotFoundException('Course not found');
    return c;
  }

  /** Free assignment: works whichever activation options the course has, and for any user with an account. */
  async assign(courseId: string, email: string) {
    const course = await this.course(courseId);
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
    if (!user) throw new NotFoundException('No account with that email. The person must sign up first.');
    await grantAccess(this.prisma, user.id, course, 'ADMIN', 'restart');
    return this.list(courseId);
  }

  async approve(courseId: string, userId: string) {
    const course = await this.course(courseId);
    const row = await this.prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (!row) throw new NotFoundException('Request not found.');
    await grantAccess(this.prisma, userId, course, row.source, 'restart');
    return this.list(courseId);
  }

  async reject(courseId: string, userId: string, reason?: string) {
    const row = await this.prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (!row) throw new NotFoundException('Request not found.');
    await this.prisma.courseEnrollment.update({ where: { userId_courseId: { userId, courseId } }, data: { status: 'REJECTED', rejectionReason: reason?.trim() || null, decidedAt: new Date() } });
    return this.list(courseId);
  }

  async revoke(courseId: string, userId: string) {
    const row = await this.prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (!row) throw new NotFoundException('Enrolment not found.');
    await this.prisma.courseEnrollment.update({ where: { userId_courseId: { userId, courseId } }, data: { status: 'REVOKED', decidedAt: new Date() } });
    return this.list(courseId);
  }

  async remove(courseId: string, userId: string, actor?: Actor) {
    const row = await this.prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (row) await auditDelete(this.prisma, actor, 'CourseEnrollment', `${courseId}:${userId}`, `enrolment of ${userId}`, row);
    await this.prisma.courseEnrollment.deleteMany({ where: { courseId, userId } });
    return this.list(courseId);
  }
}
