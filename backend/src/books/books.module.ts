import {
  BadGatewayException,
  BadRequestException,
  Body,
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
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { PdfProcessor } from './pdf-processor';
import { fetchPdfFromLink } from './link-fetch';

type UploadedPdf = { buffer: Buffer; size: number };
const MAX_PDF_BYTES = (Number(process.env.MAX_PDF_MB) || 50) * 1024 * 1024;
// Books added from a link are downloaded by the server, so they can be larger than a browser upload.
const MAX_LINK_PDF_BYTES = (Number(process.env.MAX_LINK_PDF_MB) || 300) * 1024 * 1024;
const LINK_PREFIX = 'link:';
const MAX_COVER_BYTES = 2 * 1024 * 1024;
const COVER_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function sniffCover(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

export class CreateBookDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  /** Only 1% Club members (and admins, for testing) can read it. Arrives as the string "true" from the multipart upload form. */
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() clubOnly?: boolean;
}

export class CreateBookFromLinkDto extends CreateBookDto {
  @IsString() @MinLength(8) @MaxLength(1000) url: string;
}

export class UpdateBookDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() clubOnly?: boolean;
}

/** Admin-facing view: never includes originalFilePath. */
const bookSelect = {
  id: true,
  title: true,
  description: true,
  pageCount: true,
  status: true,
  processingError: true,
  isActive: true,
  clubOnly: true,
  coverKey: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const pageKey = (bookId: string, page: number) => `books/${bookId}/pages/${page}.jpg`;

@Injectable()
export class BooksService {
  private readonly log = new Logger('Books');
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly pdf: PdfProcessor) {}

  list() {
    return this.prisma.book.findMany({ select: bookSelect, orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateBookDto, file?: UploadedPdf) {
    if (!file) throw new BadRequestException('A PDF file is required');
    // Do not trust the extension or declared mime type: check the PDF signature.
    if (file.size > MAX_PDF_BYTES) throw new BadRequestException(`PDF is larger than ${MAX_PDF_BYTES / 1024 / 1024}MB`);
    if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequestException('File is not a valid PDF');

    const book = await this.prisma.book.create({
      data: { title: dto.title.trim(), description: dto.description?.trim() ?? '', clubOnly: dto.clubOnly === true, originalFilePath: 'pending', status: 'PROCESSING' },
    });
    const originalKey = `books/${book.id}/original.pdf`;
    try {
      await this.storage.put(originalKey, file.buffer, 'application/pdf');
    } catch (e: any) {
      // Do not leave a half-created book (stuck in PROCESSING) behind when storage rejects the upload.
      this.log.error(`Storing original for book ${book.id} failed: ${e?.message}`);
      await this.prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
      throw new BadGatewayException(`File storage rejected the upload: ${e?.message ?? 'unknown error'}`);
    }
    await this.prisma.book.update({ where: { id: book.id }, data: { originalFilePath: originalKey } });

    // Process in the background so the upload request returns immediately.
    setImmediate(() => this.process(book.id, file.buffer));
    return this.prisma.book.findUniqueOrThrow({ where: { id: book.id }, select: bookSelect });
  }

  /**
   * Adds a book from a link (Google Drive "anyone with the link", Dropbox, or any direct https link). The server
   * downloads the PDF in the background and converts it exactly like an uploaded one. The original is not stored
   * (small storage plans reject large files); only the link is kept so "Retry" can download it again.
   */
  async createFromLink(dto: CreateBookFromLinkDto) {
    const url = dto.url.trim();
    const book = await this.prisma.book.create({
      data: { title: dto.title.trim(), description: dto.description?.trim() ?? '', clubOnly: dto.clubOnly === true, originalFilePath: `${LINK_PREFIX}${url}`, status: 'PROCESSING' },
    });
    setImmediate(() => this.process(book.id, url));
    return this.prisma.book.findUniqueOrThrow({ where: { id: book.id }, select: bookSelect });
  }

  async reprocess(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.status === 'PROCESSING') throw new BadRequestException('Book is already being processed');
    const source = book.originalFilePath.startsWith(LINK_PREFIX) ? book.originalFilePath.slice(LINK_PREFIX.length) : await this.storage.get(book.originalFilePath);
    await this.prisma.book.update({ where: { id }, data: { status: 'PROCESSING', processingError: null } });
    setImmediate(() => this.process(id, source));
    return this.prisma.book.findUniqueOrThrow({ where: { id }, select: bookSelect });
  }

  private async process(bookId: string, source: Buffer | string) {
    try {
      const pdf = typeof source === 'string' ? await fetchPdfFromLink(source, MAX_LINK_PDF_BYTES) : source;
      const pageCount = await this.pdf.renderPages(pdf, (n, jpeg) => this.storage.put(pageKey(bookId, n), jpeg, 'image/jpeg'));
      await this.prisma.book.update({ where: { id: bookId }, data: { pageCount, status: 'READY', processingError: null } });
      this.log.log(`Book ${bookId} ready (${pageCount} pages)`);
    } catch (e: any) {
      this.log.error(`Book ${bookId} processing failed: ${e?.message}`);
      await this.prisma.book
        .update({ where: { id: bookId }, data: { status: 'FAILED', processingError: String(e?.message || 'Processing failed').slice(0, 500) } })
        .catch(() => undefined);
    }
  }

  async update(id: string, dto: UpdateBookDto) {
    try {
      return await this.prisma.book.update({ where: { id }, data: dto, select: bookSelect });
    } catch {
      throw new NotFoundException('Book not found');
    }
  }

  /** Public: the cover image of an active book. */
  async cover(id: string) {
    const b = await this.prisma.book.findUnique({ where: { id } });
    if (!b || !b.isActive || !b.coverKey) throw new NotFoundException();
    const ext = b.coverKey.split('.').pop() || 'jpg';
    return { body: await this.storage.get(b.coverKey), mime: COVER_MIME[ext] || 'application/octet-stream' };
  }

  async setCover(id: string, file?: { buffer: Buffer; size: number }) {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    const b = await this.prisma.book.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Book not found');
    if (file.size > MAX_COVER_BYTES) throw new BadRequestException('Cover must be 2MB or smaller.');
    const img = sniffCover(file.buffer);
    if (!img) throw new BadRequestException('Cover must be a JPG, PNG or WEBP image.');
    const key = `books/${id}/cover-${Date.now()}.${img.ext}`;
    await this.storage.put(key, file.buffer, img.mime);
    const updated = await this.prisma.book.update({ where: { id }, data: { coverKey: key }, select: bookSelect });
    if (b.coverKey) await this.storage.deleteKey(b.coverKey).catch(() => undefined);
    return updated;
  }

  async clearCover(id: string) {
    const b = await this.prisma.book.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Book not found');
    if (b.coverKey) {
      await this.prisma.book.update({ where: { id }, data: { coverKey: null } });
      await this.storage.deleteKey(b.coverKey).catch(() => undefined);
    }
    return { cleared: true };
  }

  async remove(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    await this.prisma.book.delete({ where: { id } });
    await this.storage.deletePrefix(`books/${id}`);
    return { deleted: true };
  }
}

@Controller('admin/books')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class AdminBooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  list() {
    return this.books.list();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES, files: 1 } }))
  create(@Body() dto: CreateBookDto, @UploadedFile() file?: UploadedPdf) {
    return this.books.create(dto, file);
  }

  @Post('from-link')
  createFromLink(@Body() dto: CreateBookFromLinkDto) {
    return this.books.createFromLink(dto);
  }

  @Post(':bookId/reprocess')
  reprocess(@Param('bookId') id: string) {
    return this.books.reprocess(id);
  }

  @Patch(':bookId')
  update(@Param('bookId') id: string, @Body() dto: UpdateBookDto) {
    return this.books.update(id, dto);
  }

  @Post(':bookId/cover')
  @UseInterceptors(FileInterceptor('cover', { limits: { fileSize: MAX_COVER_BYTES, files: 1 } }))
  setCover(@Param('bookId') id: string, @UploadedFile() cover?: { buffer: Buffer; size: number }) {
    return this.books.setCover(id, cover);
  }

  @Delete(':bookId/cover')
  clearCover(@Param('bookId') id: string) {
    return this.books.clearCover(id);
  }

  @Delete(':bookId')
  remove(@Param('bookId') id: string) {
    return this.books.remove(id);
  }
}

@Controller('books')
class PublicBooksController {
  constructor(private readonly books: BooksService) {}

  @Get(':bookId/cover')
  async cover(@Param('bookId') id: string, @Res({ passthrough: true }) res: Response) {
    const { body, mime } = await this.books.cover(id);
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(body);
  }
}

@Module({
  controllers: [AdminBooksController, PublicBooksController],
  providers: [BooksService, PdfProcessor],
  exports: [BooksService],
})
export class BooksModule {}
