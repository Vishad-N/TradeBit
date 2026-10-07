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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { PdfProcessor } from './pdf-processor';

type UploadedPdf = { buffer: Buffer; size: number };
const MAX_PDF_BYTES = (Number(process.env.MAX_PDF_MB) || 50) * 1024 * 1024;

export class CreateBookDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class UpdateBookDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
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
      data: { title: dto.title.trim(), description: dto.description?.trim() ?? '', originalFilePath: 'pending', status: 'PROCESSING' },
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

  async reprocess(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.status === 'PROCESSING') throw new BadRequestException('Book is already being processed');
    const pdf = await this.storage.get(book.originalFilePath);
    await this.prisma.book.update({ where: { id }, data: { status: 'PROCESSING', processingError: null } });
    setImmediate(() => this.process(id, pdf));
    return this.prisma.book.findUniqueOrThrow({ where: { id }, select: bookSelect });
  }

  private async process(bookId: string, pdf: Buffer) {
    try {
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

  @Post(':bookId/reprocess')
  reprocess(@Param('bookId') id: string) {
    return this.books.reprocess(id);
  }

  @Patch(':bookId')
  update(@Param('bookId') id: string, @Body() dto: UpdateBookDto) {
    return this.books.update(id, dto);
  }

  @Delete(':bookId')
  remove(@Param('bookId') id: string) {
    return this.books.remove(id);
  }
}

@Module({
  controllers: [AdminBooksController],
  providers: [BooksService, PdfProcessor],
  exports: [BooksService],
})
export class BooksModule {}
