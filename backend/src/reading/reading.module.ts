import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
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
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { pageKey } from '../books/books.module';

// ---------- DTOs ----------
class SaveProgressDto {
  @Type(() => Number) @IsInt() @Min(1) currentPage: number;
}
class CreateTaskDto {
  @IsString() bookId: string;
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsString() @MinLength(1) @MaxLength(5000) description: string;
}
class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(5000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class RejectDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

const taskSelect = { id: true, bookId: true, title: true, description: true, isActive: true, createdAt: true, updatedAt: true } as const;
const bookPublicSelect = { id: true, title: true, description: true, pageCount: true } as const;

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  // ---------- helpers ----------
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
    if (!access) throw new ForbiddenException({ code: 'ACCESS_REQUIRED', message: 'You do not have access to this book.' });
    if (access.status === 'ACTIVE' && access.expiresAt && access.expiresAt <= new Date()) {
      await this.prisma.readingAccess.update({ where: { id: access.id }, data: { status: 'EXPIRED' } });
      throw new ForbiddenException({ code: 'ACCESS_EXPIRED', message: 'Your reading access has expired.' });
    }
    if (access.status === 'EXPIRED') throw new ForbiddenException({ code: 'ACCESS_EXPIRED', message: 'Your reading access has expired.' });
    if (access.status === 'REVOKED') throw new ForbiddenException({ code: 'ACCESS_REVOKED', message: 'Your reading access has been revoked.' });
    return { book, access };
  }

  private activeTask() {
    return this.prisma.task.findFirst({
      where: { isActive: true, book: { isActive: true, status: 'READY' } },
      orderBy: { createdAt: 'desc' },
      select: taskSelect,
    });
  }

  // ---------- user: status / task ----------
  async currentTask() {
    const task = await this.activeTask();
    if (!task) throw new NotFoundException({ code: 'NO_ACTIVE_TASK', message: 'There is no active reading task right now.' });
    return task;
  }

  /** Single source of truth for what /read/books should render. */
  async status(user: AuthUser) {
    const core = await this.statusCore(user);
    if (core.state === 'ACCESS_ACTIVE') return { ...core, mentorshipPayment: null as null | 'PENDING' | 'REJECTED' };
    // A user waiting on a 1:1 mentorship payment should see "access pending" on the Books page too.
    const latest = await this.prisma.mentorshipPayment.findFirst({ where: { userId: user.id }, orderBy: { submittedAt: 'desc' }, select: { status: true } });
    const mentorshipPayment = latest?.status === 'PENDING' || latest?.status === 'REJECTED' ? latest.status : null;
    return { ...core, mentorshipPayment };
  }

  private async statusCore(user: AuthUser) {
    await this.syncMentorshipAccess(user.id);
    const task = await this.activeTask();
    if (!task) {
      // No reading task, but a user with access (e.g. via mentorship) can still read.
      const [first] = await this.myBooks(user.id);
      if (first) {
        const progress = await this.prisma.readingProgress.findUnique({ where: { userId_bookId: { userId: user.id, bookId: first.id } } });
        return { state: 'ACCESS_ACTIVE' as const, task: null, book: first, currentPage: progress?.currentPage ?? 1, progressPercentage: progress?.progressPercentage ?? 0 };
      }
      return { state: 'NO_ACTIVE_TASK' as const };
    }

    const access = await this.prisma.readingAccess.findUnique({ where: { userId_bookId: { userId: user.id, bookId: task.bookId } } });
    if (access) {
      const expired = access.status === 'ACTIVE' && access.expiresAt && access.expiresAt <= new Date();
      if (access.status === 'ACTIVE' && !expired) {
        const book = await this.prisma.book.findUniqueOrThrow({ where: { id: task.bookId }, select: bookPublicSelect });
        const progress = await this.prisma.readingProgress.findUnique({ where: { userId_bookId: { userId: user.id, bookId: task.bookId } } });
        return { state: 'ACCESS_ACTIVE' as const, task, book, currentPage: progress?.currentPage ?? 1, progressPercentage: progress?.progressPercentage ?? 0 };
      }
      if (access.status === 'REVOKED') return { state: 'ACCESS_REVOKED' as const, task };
      return { state: 'ACCESS_EXPIRED' as const, task };
    }

    const submission = await this.prisma.taskSubmission.findUnique({ where: { taskId_userId: { taskId: task.id, userId: user.id } } });
    if (!submission) return { state: 'NOT_SUBMITTED' as const, task };
    if (submission.status === 'REJECTED') return { state: 'REJECTED' as const, task, rejectionReason: submission.rejectionReason };
    // PENDING_REVIEW, or APPROVED without an access row (should not happen): treat as waiting.
    return { state: 'PENDING_REVIEW' as const, task, submittedAt: submission.submittedAt };
  }

  async submit(user: AuthUser, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found.' });
    if (!task.isActive) throw new ConflictException({ code: 'TASK_INACTIVE', message: 'This task is no longer active.' });

    const access = await this.prisma.readingAccess.findUnique({ where: { userId_bookId: { userId: user.id, bookId: task.bookId } } });
    if (access?.status === 'ACTIVE') throw new ConflictException({ code: 'ALREADY_HAS_ACCESS', message: 'You already have reading access.' });

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
    return this.status(user);
  }

  // ---------- user: books ----------
  async myBooks(userId: string) {
    await this.syncMentorshipAccess(userId);
    const accesses = await this.prisma.readingAccess.findMany({
      where: { userId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], book: { isActive: true, status: 'READY' } },
      include: { book: { select: bookPublicSelect } },
    });
    return accesses.map((a) => a.book);
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
      watermark: `${user.name} • Access #${access.id.slice(-6).toUpperCase()}`,
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
  listTasks() {
    return this.prisma.task.findMany({ select: { ...taskSelect, book: { select: { id: true, title: true } }, _count: { select: { submissions: true } } }, orderBy: { createdAt: 'desc' } });
  }

  /** Only one task is active at a time; a new task never deletes the history of the old one. */
  async createTask(dto: CreateTaskDto) {
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException('Book not found');
    const [, task] = await this.prisma.$transaction([
      this.prisma.task.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      this.prisma.task.create({ data: { bookId: dto.bookId, title: dto.title.trim(), description: dto.description.trim() }, select: taskSelect }),
    ]);
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    if (!(await this.prisma.task.findUnique({ where: { id } }))) throw new NotFoundException('Task not found');
    const ops: Prisma.PrismaPromise<any>[] = [];
    if (dto.isActive) ops.push(this.prisma.task.updateMany({ where: { isActive: true, NOT: { id } }, data: { isActive: false } }));
    ops.push(this.prisma.task.update({ where: { id }, data: dto, select: taskSelect }));
    const res = await this.prisma.$transaction(ops);
    return res[res.length - 1];
  }

  // ---------- admin: requests ----------
  private requestInclude = {
    user: { select: { id: true, name: true, email: true } },
    task: { select: { id: true, title: true, description: true, book: { select: { id: true, title: true } } } },
  } as const;

  listRequests(status?: string) {
    const where: Prisma.TaskSubmissionWhereInput = {};
    if (status) {
      if (!['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Invalid status filter');
      where.status = status as SubmissionStatus;
    }
    return this.prisma.taskSubmission.findMany({ where, include: this.requestInclude, orderBy: { submittedAt: 'desc' }, take: 500 });
  }

  async getRequest(id: string) {
    const r = await this.prisma.taskSubmission.findUnique({ where: { id }, include: this.requestInclude });
    if (!r) throw new NotFoundException('Request not found');
    return r;
  }

  async approve(id: string, admin: AuthUser) {
    const sub = await this.prisma.taskSubmission.findUnique({ where: { id }, include: { task: true } });
    if (!sub) throw new NotFoundException('Request not found');
    const days = Number(process.env.READING_ACCESS_DAYS);
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.taskSubmission.update({ where: { id }, data: { status: 'APPROVED', rejectionReason: null, reviewedAt: now, reviewedById: admin.id } }),
      this.prisma.readingAccess.upsert({
        where: { userId_bookId: { userId: sub.userId, bookId: sub.task.bookId } },
        update: { status: 'ACTIVE', grantedAt: now, expiresAt },
        create: { userId: sub.userId, bookId: sub.task.bookId, status: 'ACTIVE', grantedAt: now, expiresAt },
      }),
    ]);
    return this.getRequest(id);
  }

  async reject(id: string, admin: AuthUser, reason?: string) {
    const sub = await this.prisma.taskSubmission.findUnique({ where: { id }, include: { task: true } });
    if (!sub) throw new NotFoundException('Request not found');
    await this.prisma.$transaction([
      this.prisma.taskSubmission.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason?.trim() || null, reviewedAt: new Date(), reviewedById: admin.id } }),
      // Rejecting a previously approved submission also withdraws the access it granted.
      this.prisma.readingAccess.updateMany({ where: { userId: sub.userId, bookId: sub.task.bookId, status: 'ACTIVE' }, data: { status: 'REVOKED' } }),
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

  @Get('tasks/current')
  currentTask() {
    return this.reading.currentTask();
  }

  @Post('tasks/:taskId/submit')
  submit(@CurrentUser() u: AuthUser, @Param('taskId') taskId: string) {
    return this.reading.submit(u, taskId);
  }

  @Get('me/status')
  status(@CurrentUser() u: AuthUser) {
    return this.reading.status(u);
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
  constructor(private readonly reading: ReadingService) {}

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

@Module({ controllers: [ReadingController, AdminReadingController], providers: [ReadingService] })
export class ReadingModule {}
