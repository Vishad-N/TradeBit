import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { pageKey } from '../books/books.module';
import { computeWindow, covers, FreeScheduleService } from './free-schedule';

// ---------- DTOs ----------
class SaveProgressDto {
  @Type(() => Number) @IsInt() @Min(1) currentPage: number;
}
class CreateTaskDto {
  /** The books this task unlocks (one or more). `bookId` is still accepted for a single book. */
  @IsOptional() @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100) @IsString({ each: true }) bookIds?: string[];
  @IsOptional() @IsString() bookId?: string;
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsString() @MinLength(1) @MaxLength(5000) description: string;
}
class UpdateTaskDto {
  @IsOptional() @IsArray() @ArrayNotEmpty() @ArrayMaxSize(100) @IsString({ each: true }) bookIds?: string[];
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(5000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class RejectDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

const taskSelect = { id: true, title: true, description: true, isActive: true, createdAt: true, updatedAt: true } as const;
const taskBooksInclude = { books: { select: { book: { select: { id: true, title: true } } } } } as const;
const flattenBooks = <T extends { books: { book: { id: string; title: string } }[] }>(t: T) => ({ ...t, books: t.books.map((b) => b.book) });
const bookPublicSelect = { id: true, title: true, description: true, pageCount: true } as const;

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly free: FreeScheduleService) {}

  // ---------- helpers ----------
  /** Who is asking: admins can open club-only books (for testing); 1% Club members are an ACTIVE mentorship. */
  private async who(userId: string) {
    const [u, m] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.mentorshipAccess.findUnique({ where: { userId }, select: { status: true } }),
    ]);
    return { isAdmin: u?.role === 'ADMIN', isClub: m?.status === 'ACTIVE' };
  }

  /**
   * An ACTIVE mentorship unlocks every ready book. Approval already granted the books that existed at the time;
   * this covers books added later (only for books the user has no access row for at all).
   */
  private async syncMentorshipAccess(userId: string) {
    const m = await this.prisma.mentorshipAccess.findUnique({ where: { userId } });
    if (m?.status !== 'ACTIVE') return;
    const missing = await this.prisma.book.findMany({ where: { isActive: true, status: 'READY', accesses: { none: { userId } } }, select: { id: true } });
    for (const b of missing) {
      await this.prisma.readingAccess
        .create({ data: { userId, bookId: b.id, status: 'ACTIVE', source: 'MENTORSHIP' } })
        .catch(() => undefined); // already created by a concurrent request
    }
  }

  /** Every protected book request goes through this: valid book, book ready, and an ACTIVE, unexpired access row. */
  private async assertAccess(userId: string, bookId: string) {
    await this.syncMentorshipAccess(userId);
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isActive || book.status !== 'READY') throw new NotFoundException({ code: 'BOOK_UNAVAILABLE', message: 'This book is not available.' });

    const access = await this.prisma.readingAccess.findUnique({ where: { userId_bookId: { userId, bookId } } });
    // 1% Club books: members and admins only. Tasks, old access rows and free days never open them.
    if (book.clubOnly) {
      const w = await this.who(userId);
      if (!w.isAdmin && !w.isClub) throw new ForbiddenException({ code: 'CLUB_ONLY', message: 'This book is only for 1% Club members.' });
      return { book, access };
    }
    // Free days: open to every logged-in user while the schedule is live (no access row needed).
    const schedule = await this.free.get();
    if (covers(schedule, book) && computeWindow(schedule)?.active) return { book, access };
    if (!access) throw new ForbiddenException({ code: 'ACCESS_REQUIRED', message: 'You do not have access to this book.' });
    if (access.status === 'ACTIVE' && access.expiresAt && access.expiresAt <= new Date()) {
      await this.prisma.readingAccess.update({ where: { id: access.id }, data: { status: 'EXPIRED' } });
      throw new ForbiddenException({ code: 'ACCESS_EXPIRED', message: 'Your reading access has expired.' });
    }
    if (access.status === 'EXPIRED') throw new ForbiddenException({ code: 'ACCESS_EXPIRED', message: 'Your reading access has expired.' });
    if (access.status === 'REVOKED') throw new ForbiddenException({ code: 'ACCESS_REVOKED', message: 'Your reading access has been revoked.' });
    return { book, access };
  }

  /**
   * An approved task submission unlocks every book linked to that task. Approval already granted the books linked
   * at the time; this covers books added to the task later (only for books the user has no access row for at all).
   */
  private async syncTaskAccess(userId: string) {
    const subs = await this.prisma.taskSubmission.findMany({
      where: { userId, status: 'APPROVED' },
      select: { reviewedAt: true, task: { select: { books: { select: { bookId: true, book: { select: { clubOnly: true } } } } } } },
    });
    if (!subs.length) return;
    const have = new Set((await this.prisma.readingAccess.findMany({ where: { userId }, select: { bookId: true } })).map((a) => a.bookId));
    const days = Number(process.env.READING_ACCESS_DAYS);
    for (const sub of subs) {
      for (const { bookId, book } of sub.task.books) {
        if (book.clubOnly || have.has(bookId)) continue;
        have.add(bookId);
        const base = sub.reviewedAt ?? new Date();
        const expiresAt = days > 0 ? new Date(base.getTime() + days * 86_400_000) : null;
        await this.prisma.readingAccess.create({ data: { userId, bookId, status: 'ACTIVE', source: 'TASK', expiresAt } }).catch(() => undefined);
      }
    }
  }

  // ---------- user: library ----------
  /**
   * Everything /read/books renders: every available book with this user's state for it, and for a locked book the
   * task that opens it (plus the other books that same task unlocks).
   */
  async library(user: AuthUser) {
    await this.syncMentorshipAccess(user.id);
    await this.syncTaskAccess(user.id);
    const who = await this.who(user.id);
    const schedule = await this.free.get();
    const window = computeWindow(schedule);

    const [books, accesses, progress, submissions] = await Promise.all([
      this.prisma.book.findMany({
        where: { isActive: true, status: 'READY' },
        select: { ...bookPublicSelect, clubOnly: true, coverKey: true, updatedAt: true, taskBooks: { select: { task: { select: { ...taskSelect, books: { select: { book: { select: { id: true, title: true, isActive: true, status: true } } } } } } } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.readingAccess.findMany({ where: { userId: user.id } }),
      this.prisma.readingProgress.findMany({ where: { userId: user.id } }),
      this.prisma.taskSubmission.findMany({ where: { userId: user.id } }),
    ]);
    const accessBy = new Map(accesses.map((a) => [a.bookId, a]));
    const progressBy = new Map(progress.map((p) => [p.bookId, p]));
    const submissionBy = new Map(submissions.map((x) => [x.taskId, x]));
    const now = new Date();

    const out = books.map((b) => {
      const access = accessBy.get(b.id);
      const prog = progressBy.get(b.id);
      const base = { id: b.id, title: b.title, description: b.description, pageCount: b.pageCount, clubOnly: b.clubOnly, cover: b.coverKey ? `/books/${b.id}/cover?v=${b.updatedAt.getTime()}` : null };
      const resume = { currentPage: prog?.currentPage ?? 1, progressPercentage: prog?.progressPercentage ?? 0 };

      // 1% Club books: open for members (and admins, for testing); everyone else sees a club lock, never a task.
      if (b.clubOnly) {
        if (who.isAdmin || who.isClub) return { ...base, state: 'UNLOCKED' as const, ...resume, task: null, adminPreview: who.isAdmin && !who.isClub };
        return { ...base, state: 'CLUB_ONLY' as const, task: null };
      }
      // Free days: open for everyone while the schedule is live; otherwise remember when it will be.
      const freeCovered = covers(schedule, b);
      if (freeCovered && window?.active) return { ...base, state: 'UNLOCKED' as const, ...resume, task: null, free: true, freeUntil: window.endsAt };
      const freeSoon = freeCovered && window ? { freeLabel: window.label, freeStartsAt: window.nextStartsAt } : {};

      // The newest active task that links this book is the one that opens it.
      const task = b.taskBooks.map((x) => x.task).filter((t) => t.isActive).sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())[0];
      const taskInfo = task && {
        id: task.id,
        title: task.title,
        description: task.description,
        unlocks: task.books.map((x) => x.book).filter((x) => x.isActive && x.status === 'READY').map((x) => ({ id: x.id, title: x.title })),
      };

      if (access?.status === 'ACTIVE' && !(access.expiresAt && access.expiresAt <= now)) {
        return { ...base, state: 'UNLOCKED' as const, ...resume, task: null };
      }
      if (access?.status === 'REVOKED') return { ...base, ...freeSoon, state: 'REVOKED' as const, task: taskInfo ?? null };
      if (access) return { ...base, ...freeSoon, state: 'EXPIRED' as const, task: taskInfo ?? null };
      if (!task) return { ...base, ...freeSoon, state: 'NO_TASK' as const, task: null };

      const sub = submissionBy.get(task.id);
      if (!sub) return { ...base, ...freeSoon, state: 'LOCKED' as const, task: taskInfo };
      if (sub.status === 'REJECTED') return { ...base, ...freeSoon, state: 'REJECTED' as const, task: taskInfo, rejectionReason: sub.rejectionReason };
      // PENDING_REVIEW, or APPROVED without an access row (should not happen): treat as waiting.
      return { ...base, ...freeSoon, state: 'PENDING_REVIEW' as const, task: taskInfo, submittedAt: sub.submittedAt };
    });

    // A user waiting on a 1:1 mentorship payment should see "access pending" on the Books page too.
    const latest = await this.prisma.mentorshipPayment.findFirst({ where: { userId: user.id }, orderBy: { submittedAt: 'desc' }, select: { status: true } });
    const mentorshipPayment = latest?.status === 'PENDING' || latest?.status === 'REJECTED' ? latest.status : null;
    const freeWindow = schedule.enabled && window ? { ...window, serverTime: new Date().toISOString() } : null;
    return { books: out, mentorshipPayment, freeWindow, isClubMember: who.isClub };
  }

  async submit(user: AuthUser, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { books: { select: { bookId: true } } } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found.' });
    if (!task.isActive) throw new ConflictException({ code: 'TASK_INACTIVE', message: 'This task is no longer active.' });

    // Nothing to do only when every book of the task is already open for this user.
    const open = await this.prisma.readingAccess.count({
      where: { userId: user.id, status: 'ACTIVE', bookId: { in: task.books.map((b) => b.bookId) }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    });
    if (task.books.length > 0 && open >= task.books.length) throw new ConflictException({ code: 'ALREADY_HAS_ACCESS', message: 'You already have reading access.' });

    // userId always comes from the authenticated session, never from the request body.
    const key = { taskId_userId: { taskId, userId: user.id } };
    const existing = await this.prisma.taskSubmission.findUnique({ where: key });
    if (existing?.status === 'APPROVED') throw new ConflictException({ code: 'ALREADY_APPROVED', message: 'Your submission was already approved.' });
    if (existing?.status === 'REJECTED') {
      await this.prisma.taskSubmission.update({
        where: key,
        data: { status: 'PENDING_REVIEW', rejectionReason: null, submittedAt: new Date(), reviewedAt: null, reviewedById: null },
      });
    } else if (!existing) {
      try {
        await this.prisma.taskSubmission.create({ data: { taskId, userId: user.id } });
      } catch (e) {
        // Two simultaneous clicks: the unique(taskId,userId) row already exists, which is fine.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    return this.library(user);
  }

  // ---------- user: books ----------
  async myBooks(userId: string) {
    await this.syncMentorshipAccess(userId);
    const accesses = await this.prisma.readingAccess.findMany({
      where: { userId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], book: { isActive: true, status: 'READY' } },
      include: { book: { select: { ...bookPublicSelect, clubOnly: true } } },
    });
    const w = await this.who(userId);
    return accesses.filter((a) => w.isAdmin || w.isClub || !a.book.clubOnly).map(({ book: { clubOnly: _c, ...book } }) => book);
  }

  async bookInfo(userId: string, bookId: string) {
    const { book } = await this.assertAccess(userId, bookId);
    return { id: book.id, title: book.title, description: book.description, pageCount: book.pageCount };
  }

  // ---------- user: session + pages ----------
  async startSession(user: AuthUser, bookId: string) {
    const { book, access } = await this.assertAccess(user.id, bookId);
    const token = randomBytes(24).toString('hex');
    // Replaces any previous session for this user+book, so a second device pushes the first one out.
    await this.prisma.readingSession.upsert({
      where: { userId_bookId: { userId: user.id, bookId } },
      update: { token, lastSeenAt: new Date() },
      create: { userId: user.id, bookId, token },
    });
    const progress = await this.prisma.readingProgress.findUnique({ where: { userId_bookId: { userId: user.id, bookId } } });
    return {
      sessionToken: token,
      title: book.title,
      pageCount: book.pageCount,
      currentPage: Math.min(Math.max(progress?.currentPage ?? 1, 1), book.pageCount),
      watermark: `${user.name} • Access #${(access?.id ?? user.id).slice(-6).toUpperCase()}`,
    };
  }

  async getPage(userId: string, bookId: string, pageNumber: number, sessionToken?: string) {
    const { book } = await this.assertAccess(userId, bookId);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > book.pageCount) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: 'Page not found.' });

    const session = await this.prisma.readingSession.findUnique({ where: { userId_bookId: { userId, bookId } } });
    if (!session || !sessionToken || session.token !== sessionToken) {
      throw new ConflictException({ code: 'SESSION_REPLACED', message: 'This book was opened in another window or device.' });
    }
    if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
      await this.prisma.readingSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }
    return this.storage.get(pageKey(bookId, pageNumber));
  }

  // ---------- user: progress ----------
  async getProgress(userId: string, bookId: string) {
    const { book } = await this.assertAccess(userId, bookId);
    const p = await this.prisma.readingProgress.findUnique({ where: { userId_bookId: { userId, bookId } } });
    return { bookId, pageCount: book.pageCount, currentPage: p?.currentPage ?? 1, progressPercentage: p?.progressPercentage ?? 0, lastReadAt: p?.lastReadAt ?? null };
  }

  async saveProgress(userId: string, bookId: string, requestedPage: number) {
    const { book } = await this.assertAccess(userId, bookId);
    const currentPage = Math.min(Math.max(requestedPage, 1), book.pageCount);
    const progressPercentage = Math.round((currentPage / book.pageCount) * 100);
    const p = await this.prisma.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { currentPage, progressPercentage, lastReadAt: new Date() },
      create: { userId, bookId, currentPage, progressPercentage },
    });
    return { bookId, pageCount: book.pageCount, currentPage: p.currentPage, progressPercentage: p.progressPercentage, lastReadAt: p.lastReadAt };
  }

  // ---------- admin: tasks ----------
  async listTasks() {
    const rows = await this.prisma.task.findMany({ select: { ...taskSelect, ...taskBooksInclude, _count: { select: { submissions: true } } }, orderBy: { createdAt: 'desc' } });
    return rows.map(flattenBooks);
  }

  private async existingBookIds(ids: string[]) {
    const unique = [...new Set(ids)];
    const found = await this.prisma.book.findMany({ where: { id: { in: unique } }, select: { id: true, clubOnly: true } });
    if (found.length !== unique.length) throw new NotFoundException('One of the selected books was not found');
    if (found.some((b) => b.clubOnly)) throw new BadRequestException('1% Club books cannot be unlocked by a task. Untick them or make the book public first.');
    return unique;
  }

  /** A task can unlock several books. Tasks are independent: publishing one does not switch the others off. */
  async createTask(dto: CreateTaskDto) {
    const ids = dto.bookIds?.length ? dto.bookIds : dto.bookId ? [dto.bookId] : [];
    if (!ids.length) throw new BadRequestException('Choose at least one book for this task.');
    const bookIds = await this.existingBookIds(ids);
    const task = await this.prisma.task.create({
      data: { title: dto.title.trim(), description: dto.description.trim(), books: { create: bookIds.map((bookId) => ({ bookId })) } },
      select: { ...taskSelect, ...taskBooksInclude },
    });
    return flattenBooks(task);
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    if (!(await this.prisma.task.findUnique({ where: { id } }))) throw new NotFoundException('Task not found');
    const { bookIds, ...rest } = dto;
    const bookIdList = bookIds ? await this.existingBookIds(bookIds) : null;
    const task = await this.prisma.task.update({
      where: { id },
      data: { ...rest, ...(bookIdList ? { books: { deleteMany: {}, create: bookIdList.map((bookId) => ({ bookId })) } } : {}) },
      select: { ...taskSelect, ...taskBooksInclude },
    });
    return flattenBooks(task);
  }

  /** Submissions and book links cascade with the task. */
  async deleteTask(id: string) {
    if (!(await this.prisma.task.findUnique({ where: { id } }))) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- admin: requests ----------
  private requestInclude = {
    user: { select: { id: true, name: true, email: true } },
    task: { select: { id: true, title: true, description: true, ...taskBooksInclude } },
  } as const;
  private withBooks<T extends { task: { books: { book: { id: string; title: string } }[] } }>(r: T) {
    return { ...r, task: flattenBooks(r.task) };
  }

  listRequests(status?: string) {
    const where: Prisma.TaskSubmissionWhereInput = {};
    if (status) {
      if (!['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Invalid status filter');
      where.status = status as SubmissionStatus;
    }
    return this.prisma.taskSubmission.findMany({ where, include: this.requestInclude, orderBy: { submittedAt: 'desc' }, take: 500 }).then((rows) => rows.map((r) => this.withBooks(r)));
  }

  async getRequest(id: string) {
    const r = await this.prisma.taskSubmission.findUnique({ where: { id }, include: this.requestInclude });
    if (!r) throw new NotFoundException('Request not found');
    return this.withBooks(r);
  }

  async approve(id: string, admin: AuthUser) {
    const sub = await this.prisma.taskSubmission.findUnique({ where: { id }, include: { task: { include: { books: { select: { bookId: true } } } } } });
    if (!sub) throw new NotFoundException('Request not found');
    const days = Number(process.env.READING_ACCESS_DAYS);
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
    const now = new Date();
    // Approving one task unlocks every book linked to it.
    await this.prisma.$transaction([
      this.prisma.taskSubmission.update({ where: { id }, data: { status: 'APPROVED', rejectionReason: null, reviewedAt: now, reviewedById: admin.id } }),
      ...sub.task.books.map(({ bookId }) =>
        this.prisma.readingAccess.upsert({
          where: { userId_bookId: { userId: sub.userId, bookId } },
          update: { status: 'ACTIVE', grantedAt: now, expiresAt },
          create: { userId: sub.userId, bookId, status: 'ACTIVE', grantedAt: now, expiresAt },
        }),
      ),
    ]);
    return this.getRequest(id);
  }

  async reject(id: string, admin: AuthUser, reason?: string) {
    const sub = await this.prisma.taskSubmission.findUnique({ where: { id }, include: { task: { include: { books: { select: { bookId: true } } } } } });
    if (!sub) throw new NotFoundException('Request not found');
    await this.prisma.$transaction([
      this.prisma.taskSubmission.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason?.trim() || null, reviewedAt: new Date(), reviewedById: admin.id } }),
      // Rejecting a previously approved submission also withdraws the task access it granted (never mentorship access).
      this.prisma.readingAccess.updateMany({
        where: { userId: sub.userId, bookId: { in: sub.task.books.map((b) => b.bookId) }, status: 'ACTIVE', source: 'TASK' },
        data: { status: 'REVOKED' },
      }),
    ]);
    return this.getRequest(id);
  }
}

// ---------- controllers ----------
@Controller('reading')
@UseGuards(AuthGuard)
class ReadingController {
  constructor(private readonly reading: ReadingService) {}

  @Get('books')
  books(@CurrentUser() u: AuthUser) {
    return this.reading.myBooks(u.id);
  }

  @Get('books/:bookId')
  book(@CurrentUser() u: AuthUser, @Param('bookId') bookId: string) {
    return this.reading.bookInfo(u.id, bookId);
  }

  @Post('books/:bookId/session')
  session(@CurrentUser() u: AuthUser, @Param('bookId') bookId: string) {
    return this.reading.startSession(u, bookId);
  }

  @Get('books/:bookId/pages/:pageNumber')
  async page(
    @CurrentUser() u: AuthUser,
    @Param('bookId') bookId: string,
    @Param('pageNumber', ParseIntPipe) pageNumber: number,
    @Headers('x-reading-session') sessionToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const image = await this.reading.getPage(u.id, bookId, pageNumber, sessionToken);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(image);
  }

  @Get('library')
  library(@CurrentUser() u: AuthUser) {
    return this.reading.library(u);
  }

  @Post('tasks/:taskId/submit')
  submit(@CurrentUser() u: AuthUser, @Param('taskId') taskId: string) {
    return this.reading.submit(u, taskId);
  }

  @Get('progress/:bookId')
  progress(@CurrentUser() u: AuthUser, @Param('bookId') bookId: string) {
    return this.reading.getProgress(u.id, bookId);
  }

  @Patch('progress/:bookId')
  saveProgress(@CurrentUser() u: AuthUser, @Param('bookId') bookId: string, @Body() dto: SaveProgressDto) {
    return this.reading.saveProgress(u.id, bookId, dto.currentPage);
  }
}

@Controller('admin')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class AdminReadingController {
  constructor(private readonly reading: ReadingService, private readonly free: FreeScheduleService) {}

  /** The recurring free-reading days (Admin -> Free Days). */
  @Get('free-reading')
  freeReading() {
    return this.free.view();
  }

  @Put('free-reading')
  saveFreeReading(@Body() body: Record<string, unknown>) {
    return this.free.save(body);
  }

  @Get('tasks')
  tasks() {
    return this.reading.listTasks();
  }

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) {
    return this.reading.createTask(dto);
  }

  @Patch('tasks/:taskId')
  updateTask(@Param('taskId') id: string, @Body() dto: UpdateTaskDto) {
    return this.reading.updateTask(id, dto);
  }

  @Delete('tasks/:taskId')
  deleteTask(@Param('taskId') id: string) {
    return this.reading.deleteTask(id);
  }

  @Get('reading/requests')
  requests(@Query('status') status?: string) {
    return this.reading.listRequests(status);
  }

  @Get('reading/requests/:id')
  request(@Param('id') id: string) {
    return this.reading.getRequest(id);
  }

  @Patch('reading/requests/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.reading.approve(id, admin);
  }

  @Patch('reading/requests/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() admin: AuthUser, @Body() dto: RejectDto) {
    return this.reading.reject(id, admin, dto.reason);
  }
}

@Module({ controllers: [ReadingController, AdminReadingController], providers: [ReadingService, FreeScheduleService] })
export class ReadingModule {}
