import { BadRequestException, Body, Controller, Get, Injectable, Module, Patch, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

/** The links the admin can set. Anything else is rejected. */
export const SITE_LINK_KEYS = ['telegram', 'youtube', 'twitter', 'facebook', 'discord', 'instagram', 'tradingview'] as const;
type SiteLinkKey = (typeof SITE_LINK_KEYS)[number];

/** Only well-formed https URLs without embedded credentials may be stored (blocks javascript:, data:, http:). */
function httpsUrl(raw: string, label: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BadRequestException(`${label} is not a valid URL.`);
  }
  if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) {
    throw new BadRequestException(`${label} must be a valid https:// link.`);
  }
  return u.toString() === raw || u.toString() === `${raw}/` ? raw : u.toString();
}

@Injectable()
export class SiteLinksService {
  constructor(private readonly prisma: PrismaService) {}

  /** { telegram: 'https://...', ... } for the keys that have been set. */
  async all(): Promise<Partial<Record<SiteLinkKey, string>>> {
    const rows = await this.prisma.siteLink.findMany();
    const out: Partial<Record<SiteLinkKey, string>> = {};
    for (const r of rows) if ((SITE_LINK_KEYS as readonly string[]).includes(r.key)) out[r.key as SiteLinkKey] = r.url;
    return out;
  }

  /** Saves the given keys. An empty value removes the override so the site falls back to its default. */
  async save(body: Record<string, unknown>) {
    // Validate every entry first, then write them all in one transaction, so a bad link never leaves a half-saved form.
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const [key, value] of Object.entries(body ?? {})) {
      if (!(SITE_LINK_KEYS as readonly string[]).includes(key)) throw new BadRequestException(`Unknown link "${key}".`);
      if (typeof value !== 'string') throw new BadRequestException(`${key} must be text.`);
      const v = value.trim();
      if (v.length > 500) throw new BadRequestException(`${key} link is too long.`);
      if (!v) ops.push(this.prisma.siteLink.deleteMany({ where: { key } }));
      else {
        const url = httpsUrl(v, `The ${key} link`);
        ops.push(this.prisma.siteLink.upsert({ where: { key }, create: { key, url }, update: { url } }));
      }
    }
    await this.prisma.$transaction(ops);
    return this.all();
  }
}

@Controller('site-links')
class SiteLinksPublicController {
  constructor(private readonly links: SiteLinksService) {}

  @Get()
  list() {
    return this.links.all();
  }
}

@Controller('admin/site-links')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class SiteLinksAdminController {
  constructor(private readonly links: SiteLinksService) {}

  @Get()
  list() {
    return this.links.all();
  }

  @Patch()
  save(@Body() body: Record<string, unknown>) {
    return this.links.save(body);
  }
}

@Module({ controllers: [SiteLinksPublicController, SiteLinksAdminController], providers: [SiteLinksService] })
export class SiteLinksModule {}
