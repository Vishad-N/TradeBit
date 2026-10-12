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
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

const MAX_BYTES = 3 * 1024 * 1024;
type Upload = { buffer: Buffer; size: number };

/** Multipart form fields arrive as strings. */
class ProfitShotDto {
  @IsOptional() @IsString() @MaxLength(120) caption?: string;
  @IsOptional() @IsString() @MaxLength(5) isActive?: string;
  @IsOptional() @IsString() @MaxLength(6) sortOrder?: string;
}

function sniff(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const bool = (v: string | undefined, fallback: boolean) => (v === undefined || v === '' ? fallback : v === 'true');

@Injectable()
export class ProfitShotsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  /** Public list for the landing page strip: image paths only, in display order. */
  async listPublic() {
    const rows = await this.prisma.profitShot.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((r) => ({ id: r.id, caption: r.caption, image: `/profit-shots/${r.id}/image?v=${r.updatedAt.getTime()}` }));
  }

  async image(id: string) {
    const r = await this.prisma.profitShot.findUnique({ where: { id } });
    if (!r || !r.isActive) throw new NotFoundException();
    const ext = r.imageKey.split('.').pop() || 'png';
    return { body: await this.storage.get(r.imageKey), mime: MIME[ext] || 'application/octet-stream' };
  }

  list() {
    return this.prisma.profitShot.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  private async store(id: string, file: Upload) {
    if (file.size > MAX_BYTES) throw new BadRequestException('Image must be 3MB or smaller.');
    const img = sniff(file.buffer);
    if (!img) throw new BadRequestException('Image must be a JPG, PNG or WEBP file.');
    const key = `profit-shots/${id}-${Date.now()}.${img.ext}`;
    await this.storage.put(key, file.buffer, img.mime);
    return key;
  }

  async create(dto: ProfitShotDto, file?: Upload) {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const row = await this.prisma.profitShot.create({
      data: { imageKey: 'pending', caption: dto.caption?.trim() || null, isActive: bool(dto.isActive, true), sortOrder: Number.parseInt(dto.sortOrder ?? '0', 10) || 0 },
    });
    try {
      return await this.prisma.profitShot.update({ where: { id: row.id }, data: { imageKey: await this.store(row.id, file) } });
    } catch (e) {
      await this.prisma.profitShot.delete({ where: { id: row.id } }).catch(() => undefined);
      throw e;
    }
  }

  async update(id: string, dto: ProfitShotDto, file?: Upload) {
    const existing = await this.prisma.profitShot.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Image not found');
    const data: { caption?: string | null; isActive?: boolean; sortOrder?: number; imageKey?: string } = {};
    if (dto.caption !== undefined) data.caption = dto.caption.trim() || null;
    if (dto.isActive !== undefined) data.isActive = bool(dto.isActive, existing.isActive);
    if (dto.sortOrder !== undefined) data.sortOrder = Number.parseInt(dto.sortOrder, 10) || 0;
    if (file) data.imageKey = await this.store(id, file);
    const updated = await this.prisma.profitShot.update({ where: { id }, data });
    if (file) await this.storage.deleteKey(existing.imageKey).catch(() => undefined);
    return updated;
  }

  async remove(id: string) {
    const r = await this.prisma.profitShot.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Image not found');
    await this.prisma.profitShot.delete({ where: { id } });
    await this.storage.deleteKey(r.imageKey).catch(() => undefined);
    return { deleted: true };
  }
}

@Controller('profit-shots')
class ProfitShotsPublicController {
  constructor(private readonly svc: ProfitShotsService) {}

  @Get()
  list() {
    return this.svc.listPublic();
  }

  @Get(':id/image')
  async image(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { body, mime } = await this.svc.image(id);
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(body);
  }
}

@Controller('admin/profit-shots')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class ProfitShotsAdminController {
  constructor(private readonly svc: ProfitShotsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  create(@Body() dto: ProfitShotDto, @UploadedFile() image?: Upload) {
    return this.svc.create(dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  update(@Param('id') id: string, @Body() dto: ProfitShotDto, @UploadedFile() image?: Upload) {
    return this.svc.update(id, dto, image);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

@Module({ controllers: [ProfitShotsPublicController, ProfitShotsAdminController], providers: [ProfitShotsService] })
export class ProfitShotsModule {}
