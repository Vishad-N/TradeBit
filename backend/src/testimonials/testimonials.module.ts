import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
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
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
type UploadedPhoto = { buffer: Buffer; size: number };
const PHOTO_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function sniffPhoto(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

class TestimonialDto {
  @IsOptional() @IsIn(['TEXT', 'VIDEO']) kind?: string;
  @IsOptional() @IsString() @MaxLength(1000) quote?: string;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(120) role?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() @MaxLength(2000) videoUrl?: string;
  @IsOptional() @IsString() @MaxLength(12) duration?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(-9999) @Max(9999) sortOrder?: number;
}

/** Only well-formed https URLs without embedded credentials may be stored (blocks javascript:, data:, http:). */
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
  return v;
}

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  /** Public data for the landing page: active written reviews, plus the first active video story. */
  async listPublic() {
    const rows = await this.prisma.testimonial.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    const pick = (t: (typeof rows)[number]) => ({
      id: t.id,
      quote: t.quote,
      name: t.name,
      role: t.role,
      rating: t.rating,
      videoUrl: t.videoUrl,
      duration: t.duration,
      photo: t.photoKey ? `/testimonials/${t.id}/photo?v=${t.updatedAt.getTime()}` : t.photoUrl,
    });
    return {
      reviews: rows.filter((t) => t.kind === 'TEXT').map(pick),
      video: rows.filter((t) => t.kind === 'VIDEO').map(pick)[0] ?? null,
    };
  }

  list() {
    return this.prisma.testimonial.findMany({ orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(dto: TestimonialDto) {
    const kind = dto.kind || 'TEXT';
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required.');
    const quote = dto.quote?.trim() ?? '';
    if (!quote) throw new BadRequestException(kind === 'VIDEO' ? 'Add the headline quote shown on the video card.' : 'The review text is required.');
    const videoUrl = httpsUrl(dto.videoUrl, 'Video URL');
    if (kind === 'VIDEO' && !videoUrl) throw new BadRequestException('A video testimonial needs a video URL (YouTube, Vimeo or an .mp4 link).');
    return this.prisma.testimonial.create({
      data: {
        kind,
        name,
        quote,
        role: dto.role?.trim() ?? '',
        rating: dto.rating ?? 5,
        videoUrl: kind === 'VIDEO' ? videoUrl : null,
        duration: kind === 'VIDEO' ? dto.duration?.trim() || null : null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: TestimonialDto) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    const data: Prisma.TestimonialUpdateInput = {};
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('Name cannot be empty.');
      data.name = dto.name.trim();
    }
    if (dto.quote !== undefined) {
      if (!dto.quote.trim()) throw new BadRequestException('The quote cannot be empty.');
      data.quote = dto.quote.trim();
    }
    if (dto.role !== undefined) data.role = dto.role.trim();
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (existing.kind === 'VIDEO') {
      if (dto.videoUrl !== undefined) {
        const v = httpsUrl(dto.videoUrl, 'Video URL');
        if (!v) throw new BadRequestException('A video testimonial needs a video URL.');
        data.videoUrl = v;
      }
      if (dto.duration !== undefined) data.duration = dto.duration.trim() || null;
    }
    return this.prisma.testimonial.update({ where: { id }, data });
  }

  async remove(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Testimonial not found');
    await this.prisma.testimonial.delete({ where: { id } });
    if (t.photoKey) await this.storage.deleteKey(t.photoKey).catch(() => undefined);
    return { deleted: true };
  }

  /** Public: the avatar of an active testimonial. */
  async photo(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t || !t.isActive || !t.photoKey) throw new NotFoundException();
    const ext = t.photoKey.split('.').pop() || 'jpg';
    return { body: await this.storage.get(t.photoKey), mime: PHOTO_MIME[ext] || 'application/octet-stream' };
  }

  async setPhoto(id: string, file?: UploadedPhoto) {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Testimonial not found');
    if (file.size > MAX_PHOTO_BYTES) throw new BadRequestException('Photo must be 2MB or smaller.');
    const img = sniffPhoto(file.buffer);
    if (!img) throw new BadRequestException('Photo must be a JPG, PNG or WEBP image.');
    const key = `testimonials/${id}-${Date.now()}.${img.ext}`;
    await this.storage.put(key, file.buffer, img.mime);
    const updated = await this.prisma.testimonial.update({ where: { id }, data: { photoKey: key } });
    if (t.photoKey) await this.storage.deleteKey(t.photoKey).catch(() => undefined);
    return updated;
  }

  async clearPhoto(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Testimonial not found');
    if (t.photoKey) {
      await this.prisma.testimonial.update({ where: { id }, data: { photoKey: null } });
      await this.storage.deleteKey(t.photoKey).catch(() => undefined);
    }
    return { cleared: true };
  }
}

@Controller('testimonials')
class TestimonialsPublicController {
  constructor(private readonly svc: TestimonialsService) {}

  @Get()
  list() {
    return this.svc.listPublic();
  }

  @Get(':id/photo')
  async photo(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { body, mime } = await this.svc.photo(id);
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(body);
  }
}

@Controller('admin/testimonials')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class TestimonialsAdminController {
  constructor(private readonly svc: TestimonialsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() dto: TestimonialDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: TestimonialDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  setPhoto(@Param('id') id: string, @UploadedFile() photo?: UploadedPhoto) {
    return this.svc.setPhoto(id, photo);
  }

  @Delete(':id/photo')
  clearPhoto(@Param('id') id: string) {
    return this.svc.clearPhoto(id);
  }
}

@Module({ controllers: [TestimonialsPublicController, TestimonialsAdminController], providers: [TestimonialsService] })
export class TestimonialsModule {}
