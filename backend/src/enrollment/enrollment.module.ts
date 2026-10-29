import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { EnrollmentStatus } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { TelegramService } from './telegram.service';
import { PricingModule, PricingService, effectivePrice } from '../pricing/pricing.module';

const RZP_API = 'https://api.razorpay.com/v1';
const STATUSES: EnrollmentStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED'];

class VerifyDto {
  @IsString() @MaxLength(100) razorpay_order_id!: string;
  @IsString() @MaxLength(100) razorpay_payment_id!: string;
  @IsString() @MaxLength(200) razorpay_signature!: string;
}
class ReasonDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

const hmac = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('hex');
function sameHex(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

@Injectable()
export class EnrollmentService {
  private readonly log = new Logger('Enrollment');
  constructor(private readonly prisma: PrismaService, private readonly pricing: PricingService, private readonly telegram: TelegramService) {}

  // Razorpay keys are read per call so they can be added to .env later without any code change.
  private keys() {
    const id = process.env.RAZORPAY_KEY_ID?.trim();
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    return id && secret ? { id, secret } : null;
  }

  /** What the programme costs this second (the live offer price while an offer runs). */
  private async price() {
    return effectivePrice((await this.pricing.all()).invitation);
  }

  // ---------- student
  async status(userId: string) {
    const [row, price] = await Promise.all([this.prisma.programEnrollment.findUnique({ where: { userId } }), this.price()]);
    return {
      state: row?.status ?? 'NONE',
      source: row?.source ?? null,
      rejectionReason: row?.status === 'REJECTED' ? row.rejectionReason : null,
      price,
      free: price === 0,
      gatewayReady: !!this.keys(),
      telegramBot: this.telegram.enabled,
      channelUrl: process.env.TELEGRAM_URL?.trim() || null,
    };
  }

  /**
   * One button, two paths. Free: the student must join the Telegram channel first (checked through the bot when it is set up,
   * otherwise the browser just sends them there), then the request is queued for an admin. Paid: create a Razorpay order the browser then pays.
   * The amount always comes from the server's pricing, never from the client.
   */
  async start(userId: string) {
    const existing = await this.prisma.programEnrollment.findUnique({ where: { userId } });
    if (existing?.status === 'ACTIVE') return { mode: 'ALREADY', ...(await this.status(userId)) };

    const price = await this.price();
    if (price === 0) {
      // A revoked student was removed on purpose, so they cannot simply re-request for free.
      if (existing?.status === 'REVOKED') throw new ForbiddenException('Your access was withdrawn. Please contact us.');
      if (existing?.status === 'PENDING') return { mode: 'PENDING', ...(await this.status(userId)) };
      if (this.telegram.enabled) {
        const link = await this.telegram.linkFor(userId);
        const step = !link.telegramUserId ? 'LINK' : !(await this.telegram.isMember(link.telegramUserId)) ? 'JOIN' : null;
        if (step) return { mode: 'TELEGRAM', step, botUrl: this.telegram.botUrl(link.token), ...(await this.status(userId)) };
      }
      if (!existing) await this.prisma.programEnrollment.create({ data: { userId, status: 'PENDING', source: 'FREE_APPROVAL' } });
      else if (existing.status === 'REJECTED') {
        await this.prisma.programEnrollment.update({ where: { userId }, data: { status: 'PENDING', source: 'FREE_APPROVAL', rejectionReason: null, requestedAt: new Date(), decidedAt: null, decidedById: null } });
      }
      return { mode: 'PENDING', ...(await this.status(userId)) };
    }

    const k = this.keys();
    if (!k) throw new ServiceUnavailableException('Online payment is not switched on yet. Please check back soon or contact us.');
    const amountPaise = Math.round(price * 100);
    let order: { id: string; amount: number; currency: string };
    try {
      const res = await fetch(`${RZP_API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${k.id}:${k.secret}`).toString('base64')}` },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `prog_${userId}`.slice(0, 40), notes: { userId, product: 'invitation' } }),
      });
      if (!res.ok) throw new Error(`Razorpay ${res.status}: ${(await res.text()).slice(0, 300)}`);
      order = await res.json();
    } catch (e) {
      this.log.error(`Could not create order: ${(e as Error).message}`);
      throw new ServiceUnavailableException('We could not start the payment. Please try again in a moment.');
    }
    await this.prisma.programPayment.create({ data: { userId, amountPaise, currency: order.currency, razorpayOrderId: order.id } });
    return { mode: 'PAY', keyId: k.id, orderId: order.id, amount: order.amount, currency: order.currency };
  }

  /** Called by the browser after Razorpay's checkout succeeds. The HMAC proves the payment is real. */
  async verify(userId: string, dto: VerifyDto) {
    const k = this.keys();
    if (!k) throw new ServiceUnavailableException('Online payment is not switched on.');
    if (!sameHex(hmac(k.secret, `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`), dto.razorpay_signature)) {
      throw new BadRequestException('We could not verify that payment.');
    }
    const order = await this.prisma.programPayment.findUnique({ where: { razorpayOrderId: dto.razorpay_order_id } });
    if (!order || order.userId !== userId) throw new NotFoundException('Order not found.');
    await this.settle(order.razorpayOrderId, dto.razorpay_payment_id);
    return this.status(userId);
  }

  /** Marks the order paid and activates the enrolment. Safe to call twice (browser callback + webhook). */
  private async settle(orderId: string, paymentId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.programPayment.findUnique({ where: { razorpayOrderId: orderId } });
      if (!order) return;
      if (order.status !== 'PAID') {
        await tx.programPayment.update({ where: { id: order.id }, data: { status: 'PAID', razorpayPaymentId: paymentId, paidAt: new Date() } });
      }
      const now = new Date();
      await tx.programEnrollment.upsert({
        where: { userId: order.userId },
        update: { status: 'ACTIVE', source: 'PAYMENT', rejectionReason: null, decidedAt: now },
        create: { userId: order.userId, status: 'ACTIVE', source: 'PAYMENT', decidedAt: now },
      });
    });
    this.log.log(`Order ${orderId} paid (${paymentId})`);
  }

  /** Razorpay -> us. Covers the buyer who pays and then closes the tab before the browser callback runs. */
  async webhook(raw: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!secret || !raw || !signature || !sameHex(hmac(secret, raw), signature)) throw new ForbiddenException();
    const event = JSON.parse(raw.toString('utf8'));
    const pay = event?.payload?.payment?.entity;
    if ((event?.event === 'payment.captured' || event?.event === 'order.paid') && pay?.order_id && pay?.id) {
      await this.settle(pay.order_id, pay.id);
    }
    return { ok: true };
  }

  /** Telegram -> us (webhook mode). Never throws on bad input so Telegram does not keep retrying. */
  telegramUpdate(update: any) { return this.telegram.handleUpdate(update).catch((e) => this.log.error(e.message)); }

  // ---------- admin
  async list(status?: string) {
    if (status && !STATUSES.includes(status as EnrollmentStatus)) throw new BadRequestException('Unknown status.');
    const rows = await this.prisma.programEnrollment.findMany({
      where: status ? { status: status as EnrollmentStatus } : {},
      orderBy: { requestedAt: 'desc' },
      take: 500,
      include: { user: { select: { name: true, email: true, phone: true } } },
    });
    return rows.map((r) => ({ id: r.id, status: r.status, source: r.source, rejectionReason: r.rejectionReason, requestedAt: r.requestedAt, decidedAt: r.decidedAt, user: r.user }));
  }

  private async decide(id: string, admin: AuthUser, status: EnrollmentStatus, reason?: string) {
    const row = await this.prisma.programEnrollment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Enrolment not found.');
    await this.prisma.programEnrollment.update({
      where: { id },
      data: { status, rejectionReason: status === 'REJECTED' ? reason?.trim() || null : null, decidedAt: new Date(), decidedById: admin.id },
    });
    this.log.log(`Enrolment ${id} -> ${status} by ${admin.email}`);
    return this.list();
  }
  approve(id: string, admin: AuthUser) { return this.decide(id, admin, 'ACTIVE'); }
  reject(id: string, admin: AuthUser, reason?: string) { return this.decide(id, admin, 'REJECTED', reason); }
  revoke(id: string, admin: AuthUser) { return this.decide(id, admin, 'REVOKED'); }
}

@Controller('enrollment')
class EnrollmentController {
  constructor(private readonly svc: EnrollmentService) {}

  @Get('me') @UseGuards(AuthGuard)
  me(@CurrentUser() u: AuthUser) { return this.svc.status(u.id); }

  @Post('start') @UseGuards(AuthGuard) @HttpCode(200) @Throttle({ default: { ttl: 60_000, limit: 10 } })
  start(@CurrentUser() u: AuthUser) { return this.svc.start(u.id); }

  @Post('verify') @UseGuards(AuthGuard) @HttpCode(200) @Throttle({ default: { ttl: 60_000, limit: 20 } })
  verify(@CurrentUser() u: AuthUser, @Body() dto: VerifyDto) { return this.svc.verify(u.id, dto); }

  @Post('telegram/webhook') @HttpCode(200) @SkipThrottle()
  async telegramWebhook(@Body() update: any, @Headers('x-telegram-bot-api-secret-token') secret?: string) {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (expected && (!secret || !sameHex(secret, expected))) throw new ForbiddenException();
    await this.svc.telegramUpdate(update);
    return { ok: true };
  }

  @Post('webhook') @HttpCode(200)
  webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-razorpay-signature') sig?: string) {
    return this.svc.webhook(req.rawBody, sig);
  }
}

@Controller('admin/enrollments')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class EnrollmentAdminController {
  constructor(private readonly svc: EnrollmentService) {}

  @Get() list(@Query('status') status?: string) { return this.svc.list(status); }
  @Patch(':id/approve') approve(@Param('id') id: string, @CurrentUser() a: AuthUser) { return this.svc.approve(id, a); }
  @Patch(':id/reject') reject(@Param('id') id: string, @CurrentUser() a: AuthUser, @Body() dto: ReasonDto) { return this.svc.reject(id, a, dto.reason); }
  @Patch(':id/revoke') revoke(@Param('id') id: string, @CurrentUser() a: AuthUser) { return this.svc.revoke(id, a); }
}

@Module({ imports: [PricingModule], controllers: [EnrollmentController, EnrollmentAdminController], providers: [EnrollmentService, TelegramService] })
export class EnrollmentModule {}
