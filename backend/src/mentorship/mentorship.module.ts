import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';

const NETWORK = 'TRC20';
const MAX_SHOT_BYTES = 5 * 1024 * 1024;
const TX_HASH = /^[0-9a-fA-F]{64}$/; // a TRON transaction id is 64 hex characters
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/; // base58, 34 chars, starts with T
const MAX_AGE_DAYS = 90;

type UploadedImage = { buffer: Buffer; size: number };

class SubmitPaymentDto {
  @IsString() @MaxLength(40) amountPaid: string;
  @IsString() @MaxLength(80) txHash: string;
  @IsString() @MaxLength(40) paymentDate: string;
}
class RejectPaymentDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

/** Detects the real image type from the file signature (never trust the extension or declared mime). */
function sniffImage(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/**
 * LOCAL TESTING ONLY. When MENTORSHIP_TEST_MODE=true the payment step can be skipped. It is ignored (and refused
 * at startup) when NODE_ENV=production, so it can never be switched on by accident in a live deployment.
 */
const testModeRequested = () => process.env.MENTORSHIP_TEST_MODE === 'true';
const testModeEnabled = () => testModeRequested() && process.env.NODE_ENV !== 'production';

/** Payment settings come from the environment so the wallet address is never hard-coded in the frontend. */
function paymentConfig() {
  const price = process.env.MENTORSHIP_PRICE_USDT?.trim() || '';
  const wallet = process.env.MENTORSHIP_WALLET_ADDRESS?.trim() || '';
  return { priceUsdt: price, walletAddress: wallet, configured: Boolean(price) && TRON_ADDRESS.test(wallet) };
}

const userPaymentView = (p: { id: string; amountPaid: Prisma.Decimal; network: string; txHash: string; paymentDate: Date; status: string; rejectionReason: string | null; submittedAt: Date; reviewedAt: Date | null }) => ({
  id: p.id,
  amountPaid: p.amountPaid.toString(),
  network: p.network,
  txHash: p.txHash,
  paymentDate: p.paymentDate,
  status: p.status,
  rejectionReason: p.rejectionReason,
  submittedAt: p.submittedAt,
  reviewedAt: p.reviewedAt,
});

@Injectable()
export class MentorshipService {
  private readonly log = new Logger('Mentorship');
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {
    if (testModeRequested() && process.env.NODE_ENV === 'production') {
      this.log.error('MENTORSHIP_TEST_MODE is set but NODE_ENV=production: test mode is IGNORED. Remove MENTORSHIP_TEST_MODE from production.');
    } else if (testModeEnabled()) {
      this.log.warn('MENTORSHIP TEST MODE is ON: users can skip payment. Local testing only.');
    }
  }

  // ---------- user ----------
  paymentInfo() {
    const c = paymentConfig();
    return { priceUsdt: c.priceUsdt, network: NETWORK, walletAddress: c.configured ? c.walletAddress : '', configured: c.configured, testMode: testModeEnabled() };
  }

  async status(userId: string) {
    const access = await this.prisma.mentorshipAccess.findUnique({ where: { userId } });
    const latest = await this.prisma.mentorshipPayment.findFirst({ where: { userId }, orderBy: { submittedAt: 'desc' } });
    const payment = latest ? userPaymentView(latest) : null;
    if (access?.status === 'ACTIVE') {
      // The Telegram link is only ever sent to users whose payment was approved.
      return { state: 'APPROVED' as const, payment, telegramUrl: process.env.TELEGRAM_URL?.trim() || null };
    }
    if (latest?.status === 'PENDING') return { state: 'PENDING' as const, payment };
    if (latest?.status === 'REJECTED') return { state: 'REJECTED' as const, payment, rejectionReason: latest.rejectionReason };
    return { state: 'NOT_STARTED' as const, payment: null };
  }

  async submit(user: AuthUser, dto: SubmitPaymentDto, file?: UploadedImage) {
    if (!paymentConfig().configured) throw new ConflictException({ code: 'PAYMENTS_NOT_CONFIGURED', message: 'Mentorship payments are not available yet. Please try again later.' });

    // ---- validate input ----
    const txHash = dto.txHash.trim().toLowerCase();
    if (!TX_HASH.test(txHash)) throw new BadRequestException('Transaction hash must be 64 hexadecimal characters.');

    if (!/^\d{1,12}(\.\d{1,6})?$/.test(dto.amountPaid.trim())) throw new BadRequestException('Amount paid must be a positive number (up to 6 decimals).');
    const amount = new Prisma.Decimal(dto.amountPaid.trim());
    if (amount.lte(0)) throw new BadRequestException('Amount paid must be greater than zero.');

    const paymentDate = new Date(dto.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) throw new BadRequestException('Payment date is not a valid date.');
    const now = Date.now();
    if (paymentDate.getTime() > now + 24 * 3600_000) throw new BadRequestException('Payment date cannot be in the future.');
    if (paymentDate.getTime() < now - MAX_AGE_DAYS * 86_400_000) throw new BadRequestException(`Payment date must be within the last ${MAX_AGE_DAYS} days.`);

    if (!file) throw new BadRequestException('A payment screenshot is required.');
    if (file.size > MAX_SHOT_BYTES) throw new BadRequestException('Screenshot must be 5MB or smaller.');
    const image = sniffImage(file.buffer);
    if (!image) throw new BadRequestException('Screenshot must be a JPG, PNG or WEBP image.');

    // ---- state rules ----
    const access = await this.prisma.mentorshipAccess.findUnique({ where: { userId: user.id } });
    if (access?.status === 'ACTIVE') throw new ConflictException({ code: 'ALREADY_APPROVED', message: 'Your mentorship is already active.' });
    const pending = await this.prisma.mentorshipPayment.findFirst({ where: { userId: user.id, status: 'PENDING' } });
    if (pending) throw new ConflictException({ code: 'ALREADY_PENDING', message: 'You already have a payment waiting for verification.' });

    // A transaction can back only one submission. The only exception is the same user correcting a rejected one.
    const existing = await this.prisma.mentorshipPayment.findUnique({ where: { txHash } });
    if (existing && !(existing.userId === user.id && existing.status === 'REJECTED')) {
      throw new ConflictException({ code: 'TX_ALREADY_USED', message: 'This transaction hash has already been submitted.' });
    }

    const id = existing?.id ?? randomUUID();
    const screenshotKey = `payments/${id}/screenshot-${Date.now()}.${image.ext}`;
    await this.storage.put(screenshotKey, file.buffer, image.mime);

    try {
      const data = { amountPaid: amount, network: NETWORK, paymentDate, screenshotKey, status: 'PENDING' as const, rejectionReason: null, submittedAt: new Date(), reviewedAt: null, reviewedById: null };
      if (existing) await this.prisma.mentorshipPayment.update({ where: { id }, data });
      else await this.prisma.mentorshipPayment.create({ data: { id, userId: user.id, txHash, ...data } });
    } catch (e) {
      await this.storage.deleteKey(screenshotKey).catch(() => undefined);
      // Two simultaneous submissions of the same hash: the unique index decides.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException({ code: 'TX_ALREADY_USED', message: 'This transaction hash has already been submitted.' });
      throw e;
    }
    if (existing?.screenshotKey) await this.storage.deleteKey(existing.screenshotKey).catch(() => undefined);
    return this.status(user.id);
  }

  // ---------- admin ----------
  private readonly adminInclude = { user: { select: { id: true, name: true, email: true } } } as const;
  private adminView<T extends { screenshotKey: string; amountPaid: Prisma.Decimal }>(p: T) {
    const { screenshotKey: _omit, ...rest } = p;
    return { ...rest, amountPaid: p.amountPaid.toString(), hasScreenshot: true };
  }

  async list(status?: string) {
    const where: Prisma.MentorshipPaymentWhereInput = {};
    if (status) {
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Invalid status filter');
      where.status = status as any;
    }
    const rows = await this.prisma.mentorshipPayment.findMany({ where, include: this.adminInclude, orderBy: { submittedAt: 'desc' }, take: 500 });
    return rows.map((r) => this.adminView(r));
  }

  private async getOrThrow(id: string) {
    const p = await this.prisma.mentorshipPayment.findUnique({ where: { id }, include: this.adminInclude });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  async get(id: string) {
    return this.adminView(await this.getOrThrow(id));
  }

  async screenshot(id: string) {
    const p = await this.getOrThrow(id);
    const ext = p.screenshotKey.split('.').pop() || 'png';
    return { body: await this.storage.get(p.screenshotKey), mime: MIME[ext] || 'application/octet-stream' };
  }

  /** Activates the mentorship and unlocks every ready book. Existing ACTIVE reading rows (e.g. from an approved task) are left alone. */
  private async grantAccess(tx: Prisma.TransactionClient, userId: string, now: Date) {
    await tx.mentorshipAccess.upsert({ where: { userId }, update: { status: 'ACTIVE', grantedAt: now }, create: { userId, status: 'ACTIVE', grantedAt: now } });
    const books = await tx.book.findMany({ where: { isActive: true, status: 'READY' }, select: { id: true } });
    for (const b of books) {
      const row = await tx.readingAccess.findUnique({ where: { userId_bookId: { userId, bookId: b.id } } });
      if (row?.status === 'ACTIVE') continue;
      await tx.readingAccess.upsert({
        where: { userId_bookId: { userId, bookId: b.id } },
        update: { status: 'ACTIVE', grantedAt: now, expiresAt: null, source: 'MENTORSHIP' },
        create: { userId, bookId: b.id, status: 'ACTIVE', grantedAt: now, source: 'MENTORSHIP' },
      });
    }
  }

  /** Test mode only: skip payment and activate straight away. Responds 404 when test mode is off. */
  async testActivate(userId: string) {
    if (!testModeEnabled()) throw new NotFoundException();
    await this.prisma.$transaction((tx) => this.grantAccess(tx, userId, new Date()));
    this.log.warn(`Test mode: mentorship activated without payment for user ${userId}`);
    return this.status(userId);
  }

  async approve(id: string, admin: AuthUser) {
    const p = await this.getOrThrow(id);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.mentorshipPayment.update({ where: { id }, data: { status: 'APPROVED', rejectionReason: null, reviewedAt: now, reviewedById: admin.id } });
      await this.grantAccess(tx, p.userId, now);
    });
    this.log.log(`Payment ${id} approved by ${admin.email}`);
    return this.get(id);
  }

  async reject(id: string, admin: AuthUser, reason?: string) {
    const p = await this.getOrThrow(id);
    const wasApproved = p.status === 'APPROVED';
    await this.prisma.$transaction(async (tx) => {
      await tx.mentorshipPayment.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason?.trim() || null, reviewedAt: new Date(), reviewedById: admin.id } });
      if (wasApproved) {
        // Withdrawing an approval also withdraws what it granted, but not book access earned another way.
        await tx.mentorshipAccess.updateMany({ where: { userId: p.userId, status: 'ACTIVE' }, data: { status: 'REVOKED' } });
        await tx.readingAccess.updateMany({ where: { userId: p.userId, source: 'MENTORSHIP', status: 'ACTIVE' }, data: { status: 'REVOKED' } });
      }
    });
    return this.get(id);
  }
}

@Controller('mentorship')
@UseGuards(AuthGuard)
class MentorshipController {
  constructor(private readonly svc: MentorshipService) {}

  @Get('status')
  status(@CurrentUser() u: AuthUser) {
    return this.svc.status(u.id);
  }

  @Get('payment-info')
  info() {
    return this.svc.paymentInfo();
  }

  @Post('test-activate')
  testActivate(@CurrentUser() u: AuthUser) {
    return this.svc.testActivate(u.id);
  }

  @Post('payments')
  @Throttle({ default: { ttl: 60_000, limit: Number(process.env.PAYMENT_RATE_LIMIT_PER_MIN) || 6 } })
  @UseInterceptors(FileInterceptor('screenshot', { limits: { fileSize: MAX_SHOT_BYTES, files: 1 } }))
  submit(@CurrentUser() u: AuthUser, @Body() dto: SubmitPaymentDto, @UploadedFile() file?: UploadedImage) {
    return this.svc.submit(u, dto, file);
  }
}

@Controller('admin/mentorship/payments')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class AdminMentorshipController {
  constructor(private readonly svc: MentorshipService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.svc.list(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Get(':id/screenshot')
  async screenshot(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { body, mime } = await this.svc.screenshot(id);
    res.set({ 'Content-Type': mime, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(body);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.svc.approve(id, admin);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() admin: AuthUser, @Body() dto: RejectPaymentDto) {
    return this.svc.reject(id, admin, dto.reason);
  }
}

@Module({ controllers: [MentorshipController, AdminMentorshipController], providers: [MentorshipService] })
export class MentorshipModule {}
