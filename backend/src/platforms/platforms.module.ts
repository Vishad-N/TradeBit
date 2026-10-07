import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

const MAX_LOGO_BYTES = 1024 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type UploadedLogo = { buffer: Buffer; size: number };

/**
 * Multipart form fields arrive as strings. Everything is optional on update; create enforces name + a way to sign up.
 * "removeLogo" / "featured" / "isActive" are the strings 'true' | 'false'.
 */
class PlatformDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @IsOptional() @IsString() @MaxLength(400) description?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsString() @MaxLength(2000) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) referralUrl?: string;
  @IsOptional() @IsString() @MaxLength(120) referralCode?: string;
  @IsOptional() @IsString() @MaxLength(2000) websiteUrl?: string;
  @IsOptional() @IsString() @MaxLength(24) ctaLabel?: string;
  @IsOptional() @IsString() @MaxLength(5) featured?: string;
  @IsOptional() @IsString() @MaxLength(5) isActive?: string;
  @IsOptional() @IsString() @MaxLength(6) sortOrder?: string;
  @IsOptional() @IsString() @MaxLength(5) removeLogo?: string;
}

/** Only well-formed https URLs without embedded credentials may be stored (blocks javascript:, data:, http:, user:pass@). */
function httpsUrl(raw: string | undefined, field: string): string | null {
  const v = raw?.trim();
  if (!v) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new BadRequestException(`${field} is not a valid URL.`);
  }
  if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) {
    throw new BadRequestException(`${field} must be a valid https:// URL.`);
  }
  return v; // stored exactly as supplied: referral parameters are never rebuilt or normalised
}
const bool = (v: string | undefined, fallback: boolean) => (v === undefined || v === '' ? fallback : v === 'true');
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function sniffLogo(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null; // SVG is deliberately not accepted as an upload (script risk); use a logo URL for SVGs.
}
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

@Injectable()
export class PlatformsService {
  private readonly log = new Logger('Platforms');
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  // ---------- public ----------
  /** Public card data. The referral URL is intentionally NOT included: sign-up goes through /go/:slug. */
  async listPublic() {
    const rows = await this.prisma.platform.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      logo: p.logoKey ? `/platforms/${p.slug}/logo?v=${p.updatedAt.getTime()}` : p.logoUrl,
      referralCode: p.referralCode,
      ctaLabel: p.ctaLabel,
      featured: p.featured,
      // Lets the card know it can show a sign-up link (a referral URL, or a website to open next to the code).
      canSignUp: Boolean(p.referralUrl || p.websiteUrl),
      hasReferralUrl: Boolean(p.referralUrl),
    }));
  }

  async logo(slug: string) {
    const p = await this.prisma.platform.findUnique({ where: { slug } });
    if (!p || !p.isActive || !p.logoKey) throw new NotFoundException();
    const ext = p.logoKey.split('.').pop() || 'png';
    return { body: await this.storage.get(p.logoKey), mime: MIME[ext] || 'application/octet-stream' };
  }

  /** Resolves a click: the referral URL as stored, or the normal registration page for code-only platforms. */
  async resolveClick(slug: string) {
    const p = await this.prisma.platform.findUnique({ where: { slug } });
    const target = p?.isActive ? p.referralUrl || p.websiteUrl : null;
    if (!p || !target) throw new NotFoundException('Unknown platform');
    // A simple counter only (no personal data). A logging failure must never block the redirect.
    this.prisma.platform.update({ where: { id: p.id }, data: { clicks: { increment: 1 }, lastClickAt: new Date() } }).catch((e) => this.log.warn(`click count failed: ${e?.message}`));
    return target;
  }

  // ---------- admin ----------
  list() {
    return this.prisma.platform.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  private async uniqueSlug(base: string, ignoreId?: string) {
    let slug = base || 'platform';
    for (let i = 2; await this.prisma.platform.findFirst({ where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined } }); i++) slug = `${base}-${i}`;
    return slug;
  }

  private async saveLogo(id: string, file: UploadedLogo) {
    if (file.size > MAX_LOGO_BYTES) throw new BadRequestException('Logo must be 1MB or smaller.');
    const img = sniffLogo(file.buffer);
    if (!img) throw new BadRequestException('Logo must be a JPG, PNG or WEBP image. For an SVG, use a logo URL instead.');
    const key = `platforms/${id}/logo-${Date.now()}.${img.ext}`;
    await this.storage.put(key, file.buffer, img.mime);
    return key;
  }

  async create(dto: PlatformDto, logo?: UploadedLogo) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required.');
    const referralUrl = httpsUrl(dto.referralUrl, 'Referral URL');
    const websiteUrl = httpsUrl(dto.websiteUrl, 'Website URL');
    const referralCode = dto.referralCode?.trim() || null;
    if (!referralUrl && !(referralCode && websiteUrl)) {
      throw new BadRequestException('Provide the official referral URL, or a referral code together with the platform\'s registration page (Website URL).');
    }
    const logoUrl = httpsUrl(dto.logoUrl, 'Logo URL');
    const requested = dto.slug?.trim().toLowerCase();
    if (requested && !SLUG.test(requested)) throw new BadRequestException('Slug may only contain lowercase letters, numbers and hyphens.');
    const slug = await this.uniqueSlug(requested || slugify(name));

    const id = (await this.prisma.platform.create({ data: { slug, name, referralUrl, referralCode, websiteUrl, logoUrl: logo ? null : logoUrl } })).id;
    try {
      const logoKey = logo ? await this.saveLogo(id, logo) : null;
      return await this.prisma.platform.update({
        where: { id },
        data: {
          description: dto.description?.trim() ?? '',
          category: dto.category?.trim() || null,
          ctaLabel: dto.ctaLabel?.trim() || null,
          featured: bool(dto.featured, false),
          isActive: bool(dto.isActive, true),
          sortOrder: Number.parseInt(dto.sortOrder ?? '0', 10) || 0,
          logoKey,
        },
      });
    } catch (e) {
      await this.prisma.platform.delete({ where: { id } }).catch(() => undefined); // do not leave a half-created card
      throw e;
    }
  }

  async update(id: string, dto: PlatformDto, logo?: UploadedLogo) {
    const existing = await this.prisma.platform.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Platform not found');
    const data: Prisma.PlatformUpdateInput = {};

    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('Name cannot be empty.');
      data.name = dto.name.trim();
    }
    if (dto.slug !== undefined && dto.slug.trim() && dto.slug.trim() !== existing.slug) {
      const s = dto.slug.trim().toLowerCase();
      if (!SLUG.test(s)) throw new BadRequestException('Slug may only contain lowercase letters, numbers and hyphens.');
      if (await this.prisma.platform.findFirst({ where: { slug: s, NOT: { id } } })) throw new ConflictException('That slug is already used.');
      data.slug = s;
    }
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.category !== undefined) data.category = dto.category.trim() || null;
    if (dto.ctaLabel !== undefined) data.ctaLabel = dto.ctaLabel.trim() || null;
    if (dto.referralCode !== undefined) data.referralCode = dto.referralCode.trim() || null;
    if (dto.referralUrl !== undefined) data.referralUrl = httpsUrl(dto.referralUrl, 'Referral URL');
    if (dto.websiteUrl !== undefined) data.websiteUrl = httpsUrl(dto.websiteUrl, 'Website URL');
    if (dto.featured !== undefined) data.featured = bool(dto.featured, existing.featured);
    if (dto.isActive !== undefined) data.isActive = bool(dto.isActive, existing.isActive);
    if (dto.sortOrder !== undefined) data.sortOrder = Number.parseInt(dto.sortOrder, 10) || 0;

    const finalUrl = 'referralUrl' in data ? (data.referralUrl as string | null) : existing.referralUrl;
    const finalWeb = 'websiteUrl' in data ? (data.websiteUrl as string | null) : existing.websiteUrl;
    const finalCode = 'referralCode' in data ? (data.referralCode as string | null) : existing.referralCode;
    if (!finalUrl && !(finalCode && finalWeb)) throw new BadRequestException('A platform needs a referral URL, or a referral code together with a Website URL.');

    let oldKey: string | null = null;
    if (logo) {
      data.logoKey = await this.saveLogo(id, logo);
      data.logoUrl = null;
      oldKey = existing.logoKey;
    } else if (dto.removeLogo === 'true') {
      data.logoKey = null;
      oldKey = existing.logoKey;
    }
    if (!logo && dto.logoUrl !== undefined) {
      data.logoUrl = httpsUrl(dto.logoUrl, 'Logo URL');
      if (data.logoUrl) {
        data.logoKey = null;
        oldKey = existing.logoKey ?? oldKey;
      }
    }
    const updated = await this.prisma.platform.update({ where: { id }, data });
    if (oldKey) await this.storage.deleteKey(oldKey).catch(() => undefined);
    return updated;
  }

  async remove(id: string) {
    const p = await this.prisma.platform.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Platform not found');
    await this.prisma.platform.delete({ where: { id } });
    if (p.logoKey) await this.storage.deleteKey(p.logoKey).catch(() => undefined);
    return { deleted: true };
  }
}

@Controller()
class PlatformsPublicController {
  constructor(private readonly svc: PlatformsService) {}

  @Get('platforms')
  list() {
    return this.svc.listPublic();
  }

  @Get('platforms/:slug/logo')
  async logo(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const { body, mime } = await this.svc.logo(slug);
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(body);
  }

  /** The Sign Up button: counts the click, then redirects to the platform's own referral URL. */
  @Get('go/:slug')
  async go(@Param('slug') slug: string, @Res() res: Response) {
    const target = await this.svc.resolveClick(slug);
    res.set('Cache-Control', 'no-store');
    res.redirect(302, target);
  }
}

@Controller('admin/platforms')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class PlatformsAdminController {
  constructor(private readonly svc: PlatformsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
  create(@Body() dto: PlatformDto, @UploadedFile() logo?: UploadedLogo) {
    return this.svc.create(dto, logo);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
  update(@Param('id') id: string, @Body() dto: PlatformDto, @UploadedFile() logo?: UploadedLogo) {
    return this.svc.update(id, dto, logo);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

@Module({ controllers: [PlatformsPublicController, PlatformsAdminController], providers: [PlatformsService] })
export class PlatformsModule {}
