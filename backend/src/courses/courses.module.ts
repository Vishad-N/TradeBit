import {
  BadRequestException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  Header,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { CourseAccess, Role } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { sniff } from '../gallery/gallery.module';

const THUMB_MAX_BYTES = 3 * 1024 * 1024;
const MAX_DURATION = 60 * 60 * 24; // a lesson is never longer than a day
const COMPLETE_AT = 0.9; // watching 90% of a video counts as finished
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
type Upload = { buffer: Buffer; size: number };

// ---------------------------------------------------------------- DTOs (the global pipe whitelists and rejects unknown fields)
class CourseDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(80) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'The web address may use lowercase letters, numbers and dashes only.' }) slug?: string;
  @IsOptional() @IsString() @MaxLength(400) summary?: string;
  @IsOptional() @IsString() @MaxLength(6000) description?: string;
  @IsOptional() @IsIn(['PUBLIC', 'CLUB', 'ENROLLED']) access?: CourseAccess;
  @IsOptional() @IsBoolean() published?: boolean;
}
class ModuleDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}
class LessonDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  /** A Vimeo link or a bare video id; an empty string removes the video. Only the id (and unlisted hash) is stored. */
  @IsOptional() @IsString() @MaxLength(300) video?: string;
  @IsOptional() @IsInt() @Min(0) @Max(MAX_DURATION) durationSec?: number;
  @IsOptional() @IsBoolean() isFreePreview?: boolean;
}
class OrderDto {
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
}
class EnrollDto {
  @IsEmail() @MaxLength(200) email!: string;
}
class ProgressDto {
  @IsOptional() @IsNumber() @Min(0) @Max(MAX_DURATION) positionSec?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(MAX_DURATION) durationSec?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
}

// ---------------------------------------------------------------- helpers
/** Accepts a bare id, vimeo.com/ID, vimeo.com/ID/HASH, player.vimeo.com/video/ID?h=HASH, manage/videos/ID... */
export function parseVimeo(input: string): { id: string; hash: string | null } {
  const raw = input.trim();
  const bad = () => new BadRequestException('That does not look like a Vimeo link or video ID. Paste the video link or its numeric ID.');
  if (/^\d{6,12}$/.test(raw)) return { id: raw, hash: null };
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw bad(); }
  if (!/(^|\.)vimeo\.com$/i.test(url.hostname)) throw bad();
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.findIndex((p) => /^\d{6,12}$/.test(p));
  if (at < 0) throw bad();
  const fromQuery = url.searchParams.get('h');
  const fromPath = parts[at + 1];
  const hash = [fromQuery, fromPath].find((h) => h && /^[0-9a-zA-Z]{6,20}$/.test(h)) || null;
  return { id: parts[at], hash };
}

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'course';

type Viewer = AuthUser | null;
type Ctx = { user: Viewer; isAdmin: boolean; isClub: boolean; enrolled: Set<string> };
type Reason = 'LOGIN' | 'CLUB' | 'ENROLL' | 'UNAVAILABLE';

/** Lets anonymous visitors through but still identifies logged-in ones (the catalog and previews are public). */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const [scheme, token] = String(req.headers['authorization'] || '').split(' ');
    if (scheme !== 'Bearer' || !token) return true;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true } });
      if (user) req.user = user;
    } catch { /* an expired token just means "anonymous" here */ }
    return true;
  }
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  // ---------- access rules
  private async ctx(user: Viewer): Promise<Ctx> {
    if (!user) return { user: null, isAdmin: false, isClub: false, enrolled: new Set() };
    const [m, en] = await Promise.all([
      this.prisma.mentorshipAccess.findUnique({ where: { userId: user.id }, select: { status: true } }),
      this.prisma.courseEnrollment.findMany({ where: { userId: user.id }, select: { courseId: true } }),
    ]);
    return { user, isAdmin: user.role === ('ADMIN' as Role), isClub: m?.status === 'ACTIVE', enrolled: new Set(en.map((e) => e.courseId)) };
  }

  /** Whole-course access (ignores free previews). */
  private courseAllowed(c: Ctx, course: { id: string; access: CourseAccess }): { allowed: boolean; reason?: Reason } {
    if (c.isAdmin) return { allowed: true };
    if (!c.user) return { allowed: false, reason: 'LOGIN' };
    if (course.access === 'PUBLIC' || c.enrolled.has(course.id)) return { allowed: true };
    if (course.access === 'CLUB' && c.isClub) return { allowed: true };
    return { allowed: false, reason: course.access === 'CLUB' ? 'CLUB' : 'ENROLL' };
  }

  private lessonAllowed(c: Ctx, course: { id: string; access: CourseAccess; published: boolean }, lesson: { isFreePreview: boolean }) {
    if (c.isAdmin) return { allowed: true } as { allowed: boolean; reason?: Reason };
    if (!course.published) return { allowed: false, reason: 'UNAVAILABLE' as Reason };
    if (lesson.isFreePreview) return { allowed: true };
    return this.courseAllowed(c, course);
  }

  private thumb(c: { id: string; thumbKey: string | null; updatedAt: Date }) {
    return c.thumbKey ? `/courses/${c.id}/thumbnail?v=${c.updatedAt.getTime()}` : null;
  }

  // ---------- student: catalog
  async catalog(user: Viewer) {
    const c = await this.ctx(user);
    const courses = await this.prisma.course.findMany({
      where: c.isAdmin ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { modules: { select: { lessons: { select: { id: true, durationSec: true, isFreePreview: true } } } } },
    });
    const done = new Set(
      user ? (await this.prisma.lessonProgress.findMany({ where: { userId: user.id, completed: true }, select: { lessonId: true } })).map((p) => p.lessonId) : [],
    );
    return courses.map((course) => {
      const lessons = course.modules.flatMap((m) => m.lessons);
      const access = this.courseAllowed(c, course);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        thumbnail: this.thumb(course),
        access: course.access,
        published: course.published,
        moduleCount: course.modules.length,
        lessonCount: lessons.length,
        previewCount: lessons.filter((l) => l.isFreePreview).length,
        durationSec: lessons.reduce((n, l) => n + l.durationSec, 0),
        completedCount: lessons.filter((l) => done.has(l.id)).length,
        canAccess: access.allowed,
        lockReason: access.reason || null,
      };
    });
  }

  async thumbnail(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, select: { thumbKey: true, published: true } });
    if (!course?.thumbKey) throw new NotFoundException();
    const ext = course.thumbKey.split('.').pop() || 'png';
    return { body: await this.storage.get(course.thumbKey), mime: MIME[ext] || 'application/octet-stream', published: course.published };
  }

  // ---------- student: course page
  async detail(slug: string, user: Viewer) {
    const c = await this.ctx(user);
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: { modules: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { lessons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } } },
    });
    if (!course || (!course.published && !c.isAdmin)) throw new NotFoundException('Course not found');
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const prog = user && lessonIds.length
      ? await this.prisma.lessonProgress.findMany({ where: { userId: user.id, lessonId: { in: lessonIds } } })
      : [];
    const byLesson = new Map(prog.map((p) => [p.lessonId, p]));
    const access = this.courseAllowed(c, course);

    let completed = 0;
    let total = 0;
    let seconds = 0;
    const modules = course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      lessons: m.lessons.map((l) => {
        const p = byLesson.get(l.id);
        const ok = this.lessonAllowed(c, course, l);
        total++;
        seconds += l.durationSec;
        if (p?.completed) completed++;
        return {
          id: l.id,
          title: l.title,
          description: l.description,
          durationSec: l.durationSec,
          isFreePreview: l.isFreePreview,
          hasVideo: Boolean(l.vimeoId),
          locked: !ok.allowed,
          completed: Boolean(p?.completed),
          positionSec: p?.positionSec || 0,
        };
      }),
    }));

    // Where "Continue" should go: the lesson watched last if unfinished, else the first unfinished one the viewer can open.
    const flat = modules.flatMap((m) => m.lessons);
    const last = [...prog].filter((p) => !p.completed && p.positionSec > 0).sort((a, b) => +b.updatedAt - +a.updatedAt)[0];
    const resume = (last && flat.find((l) => l.id === last.lessonId && !l.locked))
      || flat.find((l) => !l.completed && !l.locked && l.hasVideo)
      || flat.find((l) => !l.locked && l.hasVideo)
      || null;

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      description: course.description,
      thumbnail: this.thumb(course),
      access: course.access,
      published: course.published,
      canAccess: access.allowed,
      lockReason: access.reason || null,
      loggedIn: Boolean(user),
      lessonCount: total,
      completedCount: completed,
      durationSec: seconds,
      resumeLessonId: resume?.id || null,
      resumeStarted: Boolean(resume && (resume.completed || resume.positionSec > 0)),
      modules,
    };
  }

  // ---------- student: one lesson (the only place a Vimeo id is ever returned)
  async lesson(lessonId: string, user: Viewer) {
    const c = await this.ctx(user);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
    const course = lesson?.module.course;
    if (!lesson || !course || (!course.published && !c.isAdmin)) throw new NotFoundException('Lesson not found');
    const ok = this.lessonAllowed(c, course, lesson);

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId: course.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { lessons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, title: true, durationSec: true, isFreePreview: true, vimeoId: true } } },
    });
    const flat = modules.flatMap((m) => m.lessons);
    const idx = flat.findIndex((l) => l.id === lesson.id);
    const progress = user ? await this.prisma.lessonProgress.findMany({ where: { userId: user.id, lessonId: { in: flat.map((l) => l.id) } } }) : [];
    const byLesson = new Map(progress.map((p) => [p.lessonId, p]));
    const nav = (l?: (typeof flat)[number]) => (l ? { id: l.id, title: l.title, locked: !this.lessonAllowed(c, course, l).allowed } : null);
    const mine = byLesson.get(lesson.id);

    return {
      course: { id: course.id, slug: course.slug, title: course.title, published: course.published },
      module: { id: lesson.module.id, title: lesson.module.title },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        durationSec: lesson.durationSec,
        isFreePreview: lesson.isFreePreview,
        hasVideo: Boolean(lesson.vimeoId),
        // Withheld unless this viewer may watch the lesson.
        vimeoId: ok.allowed ? lesson.vimeoId : null,
        vimeoHash: ok.allowed ? lesson.vimeoHash : null,
      },
      access: { allowed: ok.allowed, reason: ok.reason || null, loggedIn: Boolean(user) },
      progress: { positionSec: mine?.positionSec || 0, completed: Boolean(mine?.completed) },
      prev: nav(flat[idx - 1]),
      next: nav(flat[idx + 1]),
      outline: modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          durationSec: l.durationSec,
          isFreePreview: l.isFreePreview,
          hasVideo: Boolean(l.vimeoId),
          locked: !this.lessonAllowed(c, course, l).allowed,
          completed: Boolean(byLesson.get(l.id)?.completed),
        })),
      })),
    };
  }

  async saveProgress(lessonId: string, user: AuthUser, dto: ProgressDto) {
    const c = await this.ctx(user);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
    const course = lesson?.module.course;
    if (!lesson || !course) throw new NotFoundException('Lesson not found');
    if (!this.lessonAllowed(c, course, lesson).allowed) throw new ForbiddenException('You do not have access to this lesson.');

    // Fill in the length once if the admin left it blank (the player knows the real duration).
    let duration = lesson.durationSec;
    if (!duration && dto.durationSec && dto.durationSec >= 1) {
      duration = Math.round(dto.durationSec);
      await this.prisma.lesson.update({ where: { id: lesson.id }, data: { durationSec: duration } }).catch(() => undefined);
    }
    const existing = await this.prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
    const position = dto.positionSec === undefined ? existing?.positionSec || 0 : Math.max(0, Math.round(dto.positionSec));

    let completed = existing?.completed || false;
    if (dto.completed !== undefined) completed = dto.completed;
    else if (!completed && duration > 0 && position >= duration * COMPLETE_AT) completed = true;
    const completedAt = completed ? (existing?.completed ? existing.completedAt : new Date()) : null;

    const row = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId, positionSec: position, completed, completedAt },
      update: { positionSec: position, completed, completedAt },
    });
    return { positionSec: row.positionSec, completed: row.completed };
  }

  // ---------- admin: courses
  async adminList() {
    const rows = await this.prisma.course.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { modules: { select: { lessons: { select: { id: true, durationSec: true, vimeoId: true } } } }, _count: { select: { enrollments: true } } },
    });
    return rows.map((r) => {
      const lessons = r.modules.flatMap((m) => m.lessons);
      return {
        id: r.id, slug: r.slug, title: r.title, summary: r.summary, access: r.access, published: r.published,
        thumbnail: this.thumb(r), createdAt: r.createdAt, updatedAt: r.updatedAt,
        moduleCount: r.modules.length, lessonCount: lessons.length, missingVideo: lessons.filter((l) => !l.vimeoId).length,
        durationSec: lessons.reduce((n, l) => n + l.durationSec, 0), enrolled: r._count.enrollments,
      };
    });
  }

  async adminGet(id: string) {
    const r = await this.prisma.course.findUnique({
      where: { id },
      include: { modules: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { lessons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } } },
    });
    if (!r) throw new NotFoundException('Course not found');
    return { ...r, thumbKey: undefined, thumbnail: this.thumb(r) };
  }

  private async uniqueSlug(base: string, exceptId?: string) {
    let slug = base;
    for (let i = 2; ; i++) {
      const hit = await this.prisma.course.findUnique({ where: { slug }, select: { id: true } });
      if (!hit || hit.id === exceptId) return slug;
      slug = `${base}-${i}`;
    }
  }

  async createCourse(dto: CourseDto) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Give the course a title.');
    const max = await this.prisma.course.aggregate({ _max: { sortOrder: true } });
    return this.prisma.course.create({
      data: {
        title,
        slug: await this.uniqueSlug(dto.slug || slugify(title)),
        summary: dto.summary?.trim() || '',
        description: dto.description?.trim() || '',
        access: dto.access || 'PUBLIC',
        published: false, // always starts as a draft; publish once it has lessons
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateCourse(id: string, dto: CourseDto) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) { if (!dto.title.trim()) throw new BadRequestException('The title cannot be empty.'); data.title = dto.title.trim(); }
    if (dto.summary !== undefined) data.summary = dto.summary.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.access !== undefined) data.access = dto.access;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const taken = await this.prisma.course.findUnique({ where: { slug: dto.slug }, select: { id: true } });
      if (taken) throw new ConflictException('Another course already uses that web address.');
      data.slug = dto.slug;
    }
    if (dto.published !== undefined) {
      if (dto.published) {
        const lessons = await this.prisma.lesson.count({ where: { module: { courseId: id } } });
        if (lessons === 0) throw new BadRequestException('Add at least one lesson before publishing this course.');
      }
      data.published = dto.published;
    }
    return this.prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Course not found');
    await this.prisma.course.delete({ where: { id } });
    if (c.thumbKey) await this.storage.deleteKey(c.thumbKey).catch(() => undefined);
    return { deleted: true };
  }

  async setThumbnail(id: string, file?: Upload) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Course not found');
    if (!file) throw new BadRequestException('Choose an image to upload.');
    if (file.size > THUMB_MAX_BYTES) throw new BadRequestException('The thumbnail must be 3MB or smaller.');
    const img = sniff(file.buffer);
    if (!img) throw new BadRequestException('The thumbnail must be a JPG, PNG or WEBP image.');
    const key = `courses/${id}-${Date.now()}.${img.ext}`;
    await this.storage.put(key, file.buffer, img.mime);
    const updated = await this.prisma.course.update({ where: { id }, data: { thumbKey: key } });
    if (c.thumbKey) await this.storage.deleteKey(c.thumbKey).catch(() => undefined);
    return { thumbnail: this.thumb(updated) };
  }

  async clearThumbnail(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Course not found');
    await this.prisma.course.update({ where: { id }, data: { thumbKey: null } });
    if (c.thumbKey) await this.storage.deleteKey(c.thumbKey).catch(() => undefined);
    return { thumbnail: null };
  }

  // ---------- admin: modules
  async createModule(courseId: string, dto: ModuleDto) {
    if (!(await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw new NotFoundException('Course not found');
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Give the module a title.');
    const max = await this.prisma.courseModule.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    return this.prisma.courseModule.create({ data: { courseId, title, description: dto.description?.trim() || '', sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  }

  async updateModule(id: string, dto: ModuleDto) {
    if (!(await this.prisma.courseModule.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Module not found');
    const data: Record<string, string> = {};
    if (dto.title !== undefined) { if (!dto.title.trim()) throw new BadRequestException('The title cannot be empty.'); data.title = dto.title.trim(); }
    if (dto.description !== undefined) data.description = dto.description.trim();
    return this.prisma.courseModule.update({ where: { id }, data });
  }

  async deleteModule(id: string) {
    const m = await this.prisma.courseModule.findUnique({ where: { id }, include: { course: { select: { id: true, published: true } } } });
    if (!m) throw new NotFoundException('Module not found');
    await this.prisma.courseModule.delete({ where: { id } });
    await this.unpublishIfEmpty(m.course.id, m.course.published);
    return { deleted: true };
  }

  async reorderModules(courseId: string, ids: string[]) {
    const rows = await this.prisma.courseModule.findMany({ where: { courseId }, select: { id: true } });
    this.assertSameSet(rows.map((r) => r.id), ids);
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.courseModule.update({ where: { id }, data: { sortOrder: i } })));
    return { ok: true };
  }

  // ---------- admin: lessons
  private applyVideo(data: Record<string, unknown>, video: string | undefined) {
    if (video === undefined) return;
    if (!video.trim()) { data.vimeoId = null; data.vimeoHash = null; return; }
    const v = parseVimeo(video);
    data.vimeoId = v.id;
    data.vimeoHash = v.hash;
  }

  async createLesson(moduleId: string, dto: LessonDto) {
    if (!(await this.prisma.courseModule.findUnique({ where: { id: moduleId }, select: { id: true } }))) throw new NotFoundException('Module not found');
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Give the lesson a title.');
    const max = await this.prisma.lesson.aggregate({ where: { moduleId }, _max: { sortOrder: true } });
    const data: Record<string, unknown> = {};
    this.applyVideo(data, dto.video);
    return this.prisma.lesson.create({
      data: {
        moduleId, title, description: dto.description?.trim() || '', durationSec: dto.durationSec ?? 0,
        isFreePreview: dto.isFreePreview ?? false, sortOrder: (max._max.sortOrder ?? -1) + 1,
        ...(data as { vimeoId?: string | null; vimeoHash?: string | null }),
      },
    });
  }

  async updateLesson(id: string, dto: LessonDto) {
    if (!(await this.prisma.lesson.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Lesson not found');
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) { if (!dto.title.trim()) throw new BadRequestException('The title cannot be empty.'); data.title = dto.title.trim(); }
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.durationSec !== undefined) data.durationSec = dto.durationSec;
    if (dto.isFreePreview !== undefined) data.isFreePreview = dto.isFreePreview;
    this.applyVideo(data, dto.video);
    return this.prisma.lesson.update({ where: { id }, data });
  }

  async deleteLesson(id: string) {
    const l = await this.prisma.lesson.findUnique({ where: { id }, include: { module: { include: { course: { select: { id: true, published: true } } } } } });
    if (!l) throw new NotFoundException('Lesson not found');
    await this.prisma.lesson.delete({ where: { id } });
    await this.unpublishIfEmpty(l.module.course.id, l.module.course.published);
    return { deleted: true };
  }

  async reorderLessons(moduleId: string, ids: string[]) {
    const rows = await this.prisma.lesson.findMany({ where: { moduleId }, select: { id: true } });
    this.assertSameSet(rows.map((r) => r.id), ids);
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.lesson.update({ where: { id }, data: { sortOrder: i } })));
    return { ok: true };
  }

  /** A published course with no lessons left would show an empty page, so it goes back to draft. */
  private async unpublishIfEmpty(courseId: string, published: boolean) {
    if (!published) return;
    if ((await this.prisma.lesson.count({ where: { module: { courseId } } })) === 0) {
      await this.prisma.course.update({ where: { id: courseId }, data: { published: false } });
    }
  }

  private assertSameSet(current: string[], next: string[]) {
    if (current.length !== next.length || new Set(next).size !== next.length || !next.every((id) => current.includes(id))) {
      throw new BadRequestException('The list changed while you were editing. Reload and try again.');
    }
  }

  // ---------- admin: enrollments
  async enrollments(courseId: string) {
    const rows = await this.prisma.courseEnrollment.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } });
    return rows.map((r) => ({ userId: r.userId, name: r.user.name, email: r.user.email, createdAt: r.createdAt }));
  }

  async enroll(courseId: string, email: string) {
    if (!(await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw new NotFoundException('Course not found');
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
    if (!user) throw new NotFoundException('No account with that email. The person must sign up first.');
    await this.prisma.courseEnrollment.upsert({ where: { userId_courseId: { userId: user.id, courseId } }, create: { userId: user.id, courseId }, update: {} });
    return this.enrollments(courseId);
  }

  async unenroll(courseId: string, userId: string) {
    await this.prisma.courseEnrollment.deleteMany({ where: { courseId, userId } });
    return this.enrollments(courseId);
  }
}

// ---------------------------------------------------------------- controllers
@Controller('courses')
@UseGuards(OptionalAuthGuard)
class CoursesPublicController {
  constructor(private readonly svc: CoursesService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@CurrentUser() user?: AuthUser) {
    return this.svc.catalog(user || null);
  }

  @Get(':id/thumbnail')
  async thumbnail(@Param('id') id: string, @Res({ passthrough: true }) res: Response, @CurrentUser() user?: AuthUser) {
    const t = await this.svc.thumbnail(id);
    if (!t.published && user?.role !== ('ADMIN' as Role)) throw new NotFoundException();
    res.set({ 'Content-Type': t.mime, 'Cache-Control': t.published ? 'public, max-age=3600' : 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    return new StreamableFile(t.body);
  }

  @Get(':slug')
  @Header('Cache-Control', 'private, no-store')
  detail(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.svc.detail(slug, user || null);
  }
}

@Controller('learn')
class LearnController {
  constructor(private readonly svc: CoursesService) {}

  @Get('lessons/:id')
  @UseGuards(OptionalAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  lesson(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.svc.lesson(id, user || null);
  }

  @Put('lessons/:id/progress')
  @UseGuards(AuthGuard)
  progress(@Param('id') id: string, @Body() dto: ProgressDto, @CurrentUser() user: AuthUser) {
    return this.svc.saveProgress(id, user, dto);
  }
}

@Controller('admin/courses')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class CoursesAdminController {
  constructor(private readonly svc: CoursesService) {}

  @Get() list() { return this.svc.adminList(); }
  @Post() create(@Body() dto: CourseDto) { return this.svc.createCourse(dto); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.adminGet(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CourseDto) { return this.svc.updateCourse(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteCourse(id); }

  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: THUMB_MAX_BYTES, files: 1 } }))
  setThumbnail(@Param('id') id: string, @UploadedFile() image?: Upload) { return this.svc.setThumbnail(id, image); }
  @Delete(':id/thumbnail') clearThumbnail(@Param('id') id: string) { return this.svc.clearThumbnail(id); }

  @Post(':id/modules') createModule(@Param('id') id: string, @Body() dto: ModuleDto) { return this.svc.createModule(id, dto); }
  @Put(':id/modules/order') reorderModules(@Param('id') id: string, @Body() dto: OrderDto) { return this.svc.reorderModules(id, dto.ids); }

  @Get(':id/enrollments') enrollments(@Param('id') id: string) { return this.svc.enrollments(id); }
  @Post(':id/enrollments') enroll(@Param('id') id: string, @Body() dto: EnrollDto) { return this.svc.enroll(id, dto.email); }
  @Delete(':id/enrollments/:userId') unenroll(@Param('id') id: string, @Param('userId') userId: string) { return this.svc.unenroll(id, userId); }
}

@Controller('admin/course-modules')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class ModulesAdminController {
  constructor(private readonly svc: CoursesService) {}

  @Patch(':id') update(@Param('id') id: string, @Body() dto: ModuleDto) { return this.svc.updateModule(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteModule(id); }
  @Post(':id/lessons') createLesson(@Param('id') id: string, @Body() dto: LessonDto) { return this.svc.createLesson(id, dto); }
  @Put(':id/lessons/order') reorderLessons(@Param('id') id: string, @Body() dto: OrderDto) { return this.svc.reorderLessons(id, dto.ids); }
}

@Controller('admin/course-lessons')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class LessonsAdminController {
  constructor(private readonly svc: CoursesService) {}

  @Patch(':id') update(@Param('id') id: string, @Body() dto: LessonDto) { return this.svc.updateLesson(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteLesson(id); }
}

@Module({
  controllers: [CoursesPublicController, LearnController, CoursesAdminController, ModulesAdminController, LessonsAdminController],
  providers: [CoursesService, OptionalAuthGuard],
})
export class CoursesModule {}
