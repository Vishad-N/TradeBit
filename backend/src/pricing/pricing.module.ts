import { BadRequestException, Body, Controller, Get, Injectable, Module, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

export const PRODUCTS = ['invitation', 'club'] as const;
export type Product = (typeof PRODUCTS)[number];

/** What the site showed before pricing became configurable. Used until an admin saves something. */
const DEFAULTS: Record<Product, { listPrice: number; price: number }> = {
  invitation: { listPrice: 24999, price: 0 },
  club: { listPrice: 2000, price: 499 },
};

const MAX_PRICE = 100_000_000;
const MAX_OFFER_DAYS = 366;

type Row = {
  listPrice: unknown; price: unknown; offerEnabled: boolean; offerPrice: unknown;
  offerTitle: string | null; offerStartsAt: Date | null; offerEndsAt: Date | null;
};

export interface PricingView {
  listPrice: number;
  price: number;
  offerEnabled: boolean;
  offerPrice: number | null;
  offerTitle: string;
  offerStartsAt: string | null;
  offerEndsAt: string | null;
}

function toView(product: Product, r: Row | null): PricingView {
  if (!r) return { ...DEFAULTS[product], offerEnabled: false, offerPrice: null, offerTitle: '', offerStartsAt: null, offerEndsAt: null };
  return {
    listPrice: Number(r.listPrice),
    price: Number(r.price),
    offerEnabled: r.offerEnabled,
    offerPrice: r.offerPrice == null ? null : Number(r.offerPrice),
    offerTitle: r.offerTitle ?? '',
    offerStartsAt: r.offerStartsAt?.toISOString() ?? null,
    offerEndsAt: r.offerEndsAt?.toISOString() ?? null,
  };
}

/** An offer is live only while it is switched on, has a price, and `now` is inside its window. */
export function offerIsLive(v: PricingView, now = Date.now()): boolean {
  if (!v.offerEnabled || v.offerPrice == null || !v.offerEndsAt) return false;
  if (now >= Date.parse(v.offerEndsAt)) return false;
  return !v.offerStartsAt || now >= Date.parse(v.offerStartsAt);
}

export const effectivePrice = (v: PricingView, now = Date.now()) => (offerIsLive(v, now) ? (v.offerPrice as number) : v.price);

function money(raw: unknown, label: string): number {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > MAX_PRICE) {
    throw new BadRequestException(`${label} must be a number between 0 and ${MAX_PRICE.toLocaleString('en-US')}.`);
  }
  return Math.round(n * 100) / 100;
}

function date(raw: unknown, label: string): Date | null {
  if (raw == null || raw === '') return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} is not a valid date and time.`);
  return d;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async all(): Promise<Record<Product, PricingView>> {
    const rows = await this.prisma.productPricing.findMany();
    const by = new Map(rows.map(r => [r.product, r]));
    return { invitation: toView('invitation', by.get('invitation') ?? null), club: toView('club', by.get('club') ?? null) };
  }

  /** What a customer pays right now (regular price, or the offer price while an offer is live); null until an admin has saved a price. */
  async currentIfSaved(product: Product): Promise<number | null> {
    const row = await this.prisma.productPricing.findUnique({ where: { product } });
    return row ? effectivePrice(toView(product, row)) : null;
  }

  /** What the public site renders: live price, offer window and the server clock (countdowns ignore device clock errors). */
  async publicView() {
    const now = Date.now();
    const all = await this.all();
    const out: Record<string, unknown> = { serverTime: new Date(now).toISOString() };
    for (const p of PRODUCTS) {
      const v = all[p];
      const live = offerIsLive(v, now);
      out[p] = {
        listPrice: v.listPrice,
        regularPrice: v.price,
        price: live ? v.offerPrice : v.price,
        offer: live ? { title: v.offerTitle, price: v.offerPrice, startsAt: v.offerStartsAt, endsAt: v.offerEndsAt } : null,
      };
    }
    return out;
  }

  async save(body: Record<string, unknown>) {
    for (const key of Object.keys(body ?? {})) {
      if (!(PRODUCTS as readonly string[]).includes(key)) throw new BadRequestException(`Unknown product "${key}".`);
    }
    // Validate everything first so a bad second product never leaves the first half-saved.
    const writes: { product: Product; data: Record<string, unknown> }[] = [];
    for (const product of PRODUCTS) {
      const b = body?.[product] as Record<string, unknown> | undefined;
      if (!b) continue;
      const label = product === 'club' ? '1% Club' : 'Your Invitation';
      const listPrice = money(b.listPrice, `${label}: original price`);
      const price = money(b.price, `${label}: current price`);
      if (listPrice < price) throw new BadRequestException(`${label}: the original price cannot be lower than the current price.`);
      const offerEnabled = b.offerEnabled === true;
      let offerPrice: number | null = null;
      let offerTitle: string | null = null;
      let startsAt: Date | null = null;
      let endsAt: Date | null = null;
      if (offerEnabled || (b.offerPrice != null && b.offerPrice !== '')) {
        offerPrice = money(b.offerPrice, `${label}: offer price`);
        offerTitle = typeof b.offerTitle === 'string' ? b.offerTitle.trim().slice(0, 40) || null : null;
        startsAt = date(b.offerStartsAt, `${label}: offer start`);
        endsAt = date(b.offerEndsAt, `${label}: offer end`);
      }
      if (offerEnabled) {
        if (!endsAt) throw new BadRequestException(`${label}: set when the offer ends.`);
        if (endsAt.getTime() <= Date.now()) throw new BadRequestException(`${label}: the offer end time must be in the future.`);
        if (startsAt && startsAt >= endsAt) throw new BadRequestException(`${label}: the offer must start before it ends.`);
        if (endsAt.getTime() - (startsAt?.getTime() ?? Date.now()) > MAX_OFFER_DAYS * 864e5) {
          throw new BadRequestException(`${label}: an offer can run for at most ${MAX_OFFER_DAYS} days.`);
        }
        if ((offerPrice as number) > price) throw new BadRequestException(`${label}: the offer price should not be higher than the current price.`);
      }
      writes.push({ product, data: { listPrice, price, offerEnabled, offerPrice, offerTitle, offerStartsAt: startsAt, offerEndsAt: endsAt } });
    }
    await this.prisma.$transaction(writes.map(w => this.prisma.productPricing.upsert({ where: { product: w.product }, create: { product: w.product, ...w.data } as never, update: w.data as never })));
    return this.all();
  }
}

@Controller('pricing')
class PricingPublicController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  view() {
    return this.pricing.publicView();
  }
}

@Controller('admin/pricing')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class PricingAdminController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  async list() {
    return { serverTime: new Date().toISOString(), ...(await this.pricing.all()) };
  }

  @Put()
  async save(@Body() body: Record<string, unknown>) {
    return { serverTime: new Date().toISOString(), ...(await this.pricing.save(body)) };
  }
}

@Module({ controllers: [PricingPublicController, PricingAdminController], providers: [PricingService], exports: [PricingService] })
export class PricingModule {}
