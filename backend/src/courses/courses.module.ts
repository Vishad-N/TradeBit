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
  HttpCode,
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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CourseAccess, Role, ValidityUnit } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { sniff } from '../gallery/gallery.module';
import { assertTyped, auditDelete } from '../audit/audit';
import { CourseActivationService, VALIDITY_UNITS, assertValidity, isOpen, validityLabel } from './course-activation';

/** Keep in sync with src/lib/courseIcons.js (PRESET_IDS). */
export const COURSE_ICON_PRESETS = ['gold-coin', 'gold-bars', 'silver-coin', 'bitcoin', 'ethereum', 'solana', 'xrp', 'candlestick', 'liquidity', 'bos', 'ict', 'setup', 'order-flow'] as const;
const SVG_MAX_CHARS = 20000;

/** Same allow-list as sanitizeSvg in src/lib/courseIcons.js (which also runs at render time). */
const SVG_TAGS = new Set(['svg', 'g', 'defs', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'text', 'tspan', 'lineargradient', 'radialgradient',
  'stop', 'clippath', 'mask', 'use', 'symbol', 'title', 'desc', 'animate', 'animatetransform', 'animatemotion', 'set', 'mpath', 'filter', 'fegaussianblur',
  'feoffset', 'fecolormatrix', 'femerge', 'femergenode', 'feblend', 'feflood', 'fecomposite', 'fedropshadow']);
// One well-formed tag: attributes need whitespace before them and a quoted value, so tricks like <a/onload=...> or unquoted values never match.
const SVG_TAG = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[a-zA-Z_:][\w:.-]*(?:\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))?)*)\s*(\/?)>/g;
const SVG_ATTR = /\s+([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

/** Trims and validates an admin-supplied SVG. Returns null for blank input; throws on anything that could run script. */
export function cleanCustomSvg(input: string): string | null {
  const svg = input.trim();
  if (!svg) return null;
  const bad = () => new BadRequestException('Custom icon must be a single, simple <svg> (no scripts, event handlers, external links or embedded HTML).');
  if (svg.length > SVG_MAX_CHARS) throw new BadRequestException('Custom icon is too large (20 KB max).');
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) throw bad();
  if ((svg.match(/<svg[\s>]/gi) || []).length !== 1) throw bad();
  // Allow-list: every "<" must open a well-formed tag from the allowed set, and every attribute must be safe.
  const rest = svg.replace(SVG_TAG, (_m, _close: string, name: string, attrs: string) => {
    if (!SVG_TAGS.has(name.toLowerCase())) throw bad();
    for (const m of attrs.matchAll(SVG_ATTR)) {
      const key = m[1].toLowerCase();
      const val = m[2] ?? m[3] ?? '';
      if (key.startsWith('on')) throw bad();
      if ((key === 'href' || key === 'xlink:href') && !val.trim().startsWith('#')) throw bad();
      if (key === 'attributename' && /^\s*(?:xlink:)?href\s*$|^\s*on/i.test(val)) throw bad();
    }
    return '';
  });
  if (rest.includes('<')) throw bad(); // comments, CDATA, doctype, entities declarations, stray markup
  if (/&#|&colon;|&tab;|&newline;/i.test(svg)) throw bad(); // entity-encoded tricks
  if (/javascript:|vbscript:|data:|<!ENTITY|<!DOCTYPE|expression\(|@import/i.test(svg)) throw bad();
  if (/url\(\s*["']?\s*(?!#)/i.test(svg)) throw bad(); // only in-document #refs
  return svg;
}

/** Archived ("deleted") rows stay in the database but are invisible to every read. */
const LIVE = { archivedAt: null } as const;

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
  /** How long access lasts from activation. Only affects activations from now on; people already active keep their end date. */
  @IsOptional() @IsIn(VALIDITY_UNITS) validityUnit?: ValidityUnit;
  @IsOptional() @IsInt() @Min(1) @Max(3650) validityValue?: number;
  @IsOptional() @IsBoolean() allowPayment?: boolean;
  /** Whole rupees. */
  @IsOptional() @IsInt() @Min(0) @Max(10000000) priceInr?: number;
  @IsOptional() @IsBoolean() allowTask?: boolean;
  @IsOptional() @IsString() @MaxLength(160) taskTitle?: string;
  @IsOptional() @IsString() @MaxLength(3000) taskDescription?: string;
  /** One of COURSE_ICON_PRESETS, or '' / null for "random from presets". */
  @IsOptional() @IsIn([...COURSE_ICON_PRESETS, '']) svgPresetId?: string | null;
  /** Inline SVG markup; '' / null clears it. */
  @IsOptional() @IsString() @MaxLength(SVG_MAX_CHARS) customSvg?: string | null;
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
class ReasonDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
class VerifyDto {
  @IsString() @MaxLength(100) razorpay_order_id!: string;
  @IsString() @MaxLength(100) razorpay_payment_id!: string;
  @IsString() @MaxLength(200) razorpay_signature!: string;
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
type EnrolRow = { courseId: string; status: string; source: string; activatedAt: Date | null; expiresAt: Date | null; rejectionReason: string | null; createdAt: Date };
/** `enrolled` = courses this user may open through their own enrolment right now (active and not expired); `mine` = every row they have. */
type Ctx = { user: Viewer; isAdmin: boolean; isClub: boolean; programme: boolean; enrolled: Set<string>; mine: Map<string, EnrolRow> };
type Reason = 'LOGIN' | 'CLUB' | 'ENROLL' | 'EXPIRED' | 'UNAVAILABLE';
const DAY_MS = 86_400_000;

/** Lets anonymous visitors through but still identifies logged-in ones (the catalog and previews are public). */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const [scheme, token] = String(req.headers['authorization'] || '').split(' ');
    if (scheme !== 'Bearer' || !token) return true;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; v?: number }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true, tokenVersion: true } });
      if (user && (payload.v ?? 0) === user.tokenVersion) req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    } catch { /* an expired token just means "anonymous" here */ }
    return true;
  }
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  // ---------- access rules
  private async ctx(user: Viewer): Promise<Ctx> {
    if (!user) return { user: null, isAdmin: false, isClub: false, programme: false, enrolled: new Set(), mine: new Map() };
    const [m, en, prog] = await Promise.all([
      this.prisma.mentorshipAccess.findUnique({ where: { userId: user.id }, select: { status: true } }),
      this.prisma.courseEnrollment.findMany({ where: { userId: user.id }, select: { courseId: true, status: true, source: true, activatedAt: true, expiresAt: true, rejectionReason: true, createdAt: true } }),
      this.prisma.programEnrollment.findUnique({ where: { userId: user.id }, select: { status: true } }),
    ]);
    return { user, isAdmin: user.role === ('ADMIN' as Role), isClub: m?.status === 'ACTIVE', programme: prog?.status === 'ACTIVE', enrolled: new Set(en.filter((e) => isOpen(e)).map((e) => e.courseId)), mine: new Map(en.map((e) => [e.courseId, e])) };
  }

  /** Whole-course access (ignores free previews). */
  private courseAllowed(c: Ctx, course: { id: string; access: CourseAccess }): { allowed: boolean; reason?: Reason } {
    if (c.isAdmin) return { allowed: true };
    if (!c.user) return { allowed: false, reason: 'LOGIN' };
    // A paid / approved programme enrolment opens every ENROLLED course, including ones added later.
    if (course.access === 'PUBLIC' || c.enrolled.has(course.id) || (course.access === 'ENROLLED' && c.programme)) return { allowed: true };
    if (course.access === 'CLUB' && c.isClub) return { allowed: true };
    const own = c.mine.get(course.id);
    if (own?.status === 'ACTIVE' && !isOpen(own)) return { allowed: false, reason: 'EXPIRED' }; // had access, the validity ran out
    return { allowed: false, reason: course.access === 'CLUB' ? 'CLUB' : 'ENROLL' };
  }

  private lessonAllowed(c: Ctx, course: { id: string; access: CourseAccess; published: boolean }, lesson: { isFreePreview: boolean }) {
    if (c.isAdmin) return { allowed: true } as { allowed: boolean; reason?: Reason };
    if (!course.published) return { allowed: false, reason: 'UNAVAILABLE' as Reason };
    // Watching any lesson needs an account, free previews included (the catalog and curriculum stay public).
    if (!c.user) return { allowed: false, reason: 'LOGIN' as Reason };
    if (lesson.isFreePreview) return { allowed: true };
    return this.courseAllowed(c, course);
  }

  /** What the course's validity is, for display. Null for open-to-all courses (nothing to activate, nothing expires). */
  private validity(course: { access: CourseAccess; validityUnit: ValidityUnit; validityValue: number }) {
    if (course.access === 'PUBLIC') return null;
    const lifetime = course.validityUnit === 'LIFETIME';
    return { unit: course.validityUnit, value: lifetime ? null : course.validityValue, label: validityLabel(course.validityUnit, course.validityValue), lifetime };
  }

  /** How a learner can switch the course on. Null when it is open to everyone. */
  private activation(course: { access: CourseAccess; allowPayment: boolean; priceInr: number; allowTask: boolean; taskTitle: string; taskDescription: string }) {
    if (course.access === 'PUBLIC') return null;
    return {
      payment: course.allowPayment && course.priceInr >= 1 ? { priceInr: course.priceInr } : null,
      task: course.allowTask && course.taskTitle.trim() ? { title: course.taskTitle, description: course.taskDescription } : null,
    };
  }

  /** This viewer's own access period for the course (null when it does not apply: logged out, admin, or open-to-all course). */
  private mine(c: Ctx, course: { id: string; access: CourseAccess }) {
    if (!c.user || c.isAdmin || course.access === 'PUBLIC') return null;
    const row = c.mine.get(course.id);
    const now = new Date();
    if (row && isOpen(row, now)) {
      return {
        state: 'ACTIVE' as const, source: row.source, lifetime: !row.expiresAt, activatedAt: row.activatedAt ?? row.createdAt, expiresAt: row.expiresAt,
        daysLeft: row.expiresAt ? Math.max(0, Math.ceil((row.expiresAt.getTime() - now.getTime()) / DAY_MS)) : null, via: null as string | null,
      };
    }
    // Open through the 1% Club or the programme instead: no personal end date.
    if (this.courseAllowed(c, course).allowed) {
      return { state: 'ACTIVE' as const, source: null, lifetime: true, activatedAt: null, expiresAt: null, daysLeft: null, via: c.programme && course.access === 'ENROLLED' ? 'PROGRAMME' : 'CLUB' };
    }
    if (!row) return { state: 'NONE' as const };
    if (row.status === 'ACTIVE') return { state: 'EXPIRED' as const, expiresAt: row.expiresAt };
    return { state: row.status as 'PENDING' | 'REJECTED' | 'REVOKED', rejectionReason: row.status === 'REJECTED' ? row.rejectionReason : null };
  }

  private thumb(c: { id: string; thumbKey: string | null; updatedAt: Date }) {
    return c.thumbKey ? `/courses/${c.id}/thumbnail?v=${c.updatedAt.getTime()}` : null;
  }

  // ---------- student: catalog
  async catalog(user: Viewer) {
    const c = await this.ctx(user);
    const courses = await this.prisma.course.findMany({
      where: { ...LIVE, ...(c.isAdmin ? {} : { published: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { modules: { where: LIVE, select: { lessons: { where: LIVE, select: { id: true, durationSec: true, isFreePreview: true } } } } },
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
        svgPresetId: course.svgPresetId,
        customSvg: course.customSvg,
        access: course.access,
        published: course.published,
        moduleCount: course.modules.length,
        lessonCount: lessons.length,
        previewCount: lessons.filter((l) => l.isFreePreview).length,
        durationSec: lessons.reduce((n, l) => n + l.durationSec, 0),
        completedCount: lessons.filter((l) => done.has(l.id)).length,
        canAccess: access.allowed,
        lockReason: access.reason || null,
        validity: this.validity(course),
        mine: this.mine(c, course),
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
      include: { modules: { where: LIVE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { lessons: { where: LIVE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } } },
    });
    if (!course || course.archivedAt || (!course.published && !c.isAdmin)) throw new NotFoundException('Course not found');
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
      svgPresetId: course.svgPresetId,
      customSvg: course.customSvg,
      access: course.access,
      published: course.published,
      canAccess: access.allowed,
      lockReason: access.reason || null,
      validity: this.validity(course),
      activation: this.activation(course),
      mine: this.mine(c, course),
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
    if (!lesson || !course || lesson.archivedAt || lesson.module.archivedAt || course.archivedAt || (!course.published && !c.isAdmin)) throw new NotFoundException('Lesson not found');
    const ok = this.lessonAllowed(c, course, lesson);

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId: course.id, ...LIVE },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { lessons: { where: LIVE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, title: true, durationSec: true, isFreePreview: true, vimeoId: true } } },
    });
    const flat = modules.flatMap((m) => m.lessons);
    const idx = flat.findIndex((l) => l.id === lesson.id);
    const progress = user ? await this.prisma.lessonProgress.findMany({ where: { userId: user.id, lessonId: { in: flat.map((l) => l.id) } } }) : [];
    const byLesson = new Map(progress.map((p) => [p.lessonId, p]));
    const nav = (l?: (typeof flat)[number]) => (l ? { id: l.id, title: l.title, locked: !this.lessonAllowed(c, course, l).allowed } : null);
    const mine = byLesson.get(lesson.id);

    return {
      course: { id: course.id, slug: course.slug, title: course.title, published: course.published, svgPresetId: course.svgPresetId, hasCustomIcon: Boolean(course.customSvg) },
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
      mine: this.mine(c, course), // this learner's own access period (start, end, days left)
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
    if (!lesson || !course || lesson.archivedAt || lesson.module.archivedAt || course.archivedAt) throw new NotFoundException('Lesson not found');
    if (!this.lessonAllowed(c, course, lesson).allowed) throw new ForbiddenException('You do not have access to this lesson.');

    // If the admin left the length blank, use the player's real duration for this student's completion check. It is
    // only stored on the lesson when an admin reports it: a student's request must never change shared course data.
    let duration = lesson.durationSec;
    if (!duration && dto.durationSec && dto.durationSec >= 1) {
      duration = Math.round(dto.durationSec);
      if (c.isAdmin) await this.prisma.lesson.update({ where: { id: lesson.id }, data: { durationSec: duration } }).catch(() => undefined);
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
      where: LIVE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { modules: { where: LIVE, select: { lessons: { where: LIVE, select: { id: true, durationSec: true, vimeoId: true } } } }, _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    });
    return rows.map((r) => {
      const lessons = r.modules.flatMap((m) => m.lessons);
      return {
        id: r.id, slug: r.slug, title: r.title, summary: r.summary, access: r.access, published: r.published,
        thumbnail: this.thumb(r), svgPresetId: r.svgPresetId, customSvg: r.customSvg, createdAt: r.createdAt, updatedAt: r.updatedAt,
        moduleCount: r.modules.length, lessonCount: lessons.length, missingVideo: lessons.filter((l) => !l.vimeoId).length,
        durationSec: lessons.reduce((n, l) => n + l.durationSec, 0), enrolled: r._count.enrollments,
      };
    });
  }

  async adminGet(id: string) {
    const r = await this.prisma.course.findUnique({
      where: { id },
      include: { modules: { where: LIVE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { lessons: { where: LIVE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } } },
    });
    if (!r || r.archivedAt) throw new NotFoundException('Course not found');
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
        svgPresetId: dto.svgPresetId || null, // null = random from presets
        customSvg: dto.customSvg ? cleanCustomSvg(dto.customSvg) : null,
        published: false, // always starts as a draft; publish once it has lessons
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateCourse(id: string, dto: CourseDto) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing || existing.archivedAt) throw new NotFoundException('Course not found');
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) { if (!dto.title.trim()) throw new BadRequestException('The title cannot be empty.'); data.title = dto.title.trim(); }
    if (dto.summary !== undefined) data.summary = dto.summary.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.access !== undefined) data.access = dto.access;
    if (dto.svgPresetId !== undefined) data.svgPresetId = dto.svgPresetId || null;
    if (dto.customSvg !== undefined) data.customSvg = dto.customSvg ? cleanCustomSvg(dto.customSvg) : null;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const taken = await this.prisma.course.findUnique({ where: { slug: dto.slug }, select: { id: true } });
      if (taken) throw new ConflictException('Another course already uses that web address.');
      data.slug = dto.slug;
    }
    if (dto.validityUnit !== undefined || dto.validityValue !== undefined) {
      const unit = dto.validityUnit ?? existing.validityUnit;
      const value = dto.validityValue ?? existing.validityValue;
      assertValidity(unit, value);
      data.validityUnit = unit;
      data.validityValue = unit === 'LIFETIME' ? 1 : value;
    }
    if (dto.allowPayment !== undefined || dto.priceInr !== undefined) {
      const allow = dto.allowPayment ?? existing.allowPayment;
      const price = dto.priceInr ?? existing.priceInr;
      if (allow && price < 1) throw new BadRequestException('Set a price of at least Rs 1 to sell this course online.');
      data.allowPayment = allow;
      data.priceInr = price;
    }
    if (dto.allowTask !== undefined || dto.taskTitle !== undefined || dto.taskDescription !== undefined) {
      const allow = dto.allowTask ?? existing.allowTask;
      const title = (dto.taskTitle ?? existing.taskTitle).trim();
      if (allow && !title) throw new BadRequestException('Give the task a title so learners know what to do.');
      data.allowTask = allow;
      data.taskTitle = title;
      data.taskDescription = (dto.taskDescription ?? existing.taskDescription).trim();
    }
    if (dto.published !== undefined) {
      if (dto.published) {
        const lessons = await this.prisma.lesson.count({ where: { ...LIVE, module: { courseId: id, ...LIVE } } });
        if (lessons === 0) throw new BadRequestException('Add at least one lesson before publishing this course.');
      }
      data.published = dto.published;
    }
    return this.prisma.course.update({ where: { id }, data });
  }

  /**
   * "Delete" = archive. Nothing is erased: the course, its modules and lessons, every learner's enrolment and progress and
   * every payment stay in the database (the foreign keys are RESTRICT, so even a hand-typed DELETE is refused). The course just
   * disappears from the site and the admin list. A course that has learners or payments is not archived at all:
   * unpublish it instead, so nobody who paid loses their course.
   */
  async deleteCourse(id: string, confirm: string | undefined, actor: AuthUser) {
    const c = await this.prisma.course.findUnique({ where: { id }, include: { modules: { include: { lessons: true } } } });
    if (!c || c.archivedAt) throw new NotFoundException('Course not found');
    const [payments, enrolled] = await Promise.all([
      this.prisma.coursePayment.count({ where: { courseId: id } }),
      this.prisma.courseEnrollment.count({ where: { courseId: id } }),
    ]);
    if (payments || enrolled) {
      throw new ConflictException(`This course has ${enrolled} learner(s) and ${payments} payment record(s), so it cannot be removed. Unpublish it instead.`);
    }
    assertTyped(confirm, c.title, `the course "${c.title}" and its modules and lessons`);
    await auditDelete(this.prisma, actor, 'Course', id, c.title, c, 'ARCHIVE');
    await this.prisma.course.update({ where: { id }, data: { archivedAt: new Date(), published: false } });
    return { deleted: true, archived: true };
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
    if (!(await this.prisma.course.findFirst({ where: { id: courseId, ...LIVE }, select: { id: true } }))) throw new NotFoundException('Course not found');
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Give the module a title.');
    const max = await this.prisma.courseModule.aggregate({ where: { courseId }, _max: { sortOrder: true } });
    return this.prisma.courseModule.create({ data: { courseId, title, description: dto.description?.trim() || '', sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  }

  async updateModule(id: string, dto: ModuleDto) {
    if (!(await this.prisma.courseModule.findFirst({ where: { id, ...LIVE }, select: { id: true } }))) throw new NotFoundException('Module not found');
    const data: Record<string, string> = {};
    if (dto.title !== undefined) { if (!dto.title.trim()) throw new BadRequestException('The title cannot be empty.'); data.title = dto.title.trim(); }
    if (dto.description !== undefined) data.description = dto.description.trim();
    return this.prisma.courseModule.update({ where: { id }, data });
  }

  /** Archives the module; its lessons and every learner's progress on them are kept. */
  async deleteModule(id: string, confirm: string | undefined, actor: AuthUser) {
    const m = await this.prisma.courseModule.findUnique({ where: { id }, include: { course: { select: { id: true, published: true } }, lessons: { where: LIVE } } });
    if (!m || m.archivedAt) throw new NotFoundException('Module not found');
    if (m.lessons.length) assertTyped(confirm, m.title, `the module "${m.title}" and its ${m.lessons.length} lesson(s)`);
    await auditDelete(this.prisma, actor, 'CourseModule', id, m.title, { ...m, course: undefined, courseId: m.course.id }, 'ARCHIVE');
    await this.prisma.courseModule.update({ where: { id }, data: { archivedAt: new Date() } });
    await this.unpublishIfEmpty(m.course.id, m.course.published);
    return { deleted: true, archived: true };
  }

  async reorderModules(courseId: string, ids: string[]) {
    const rows = await this.prisma.courseModule.findMany({ where: { courseId, ...LIVE }, select: { id: true } });
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
    if (!(await this.prisma.courseModule.findFirst({ where: { id: moduleId, ...LIVE }, select: { id: true } }))) throw new NotFoundException('Module not found');
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
    if (!(await this.prisma.lesson.findFirst({ where: { id, ...LIVE }, select: { id: true } }))) throw new NotFoundException('Lesson not found');
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) { if (!dto.title.trim()) throw new BadRequestException('The title cannot be empty.'); data.title = dto.title.trim(); }
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.durationSec !== undefined) data.durationSec = dto.durationSec;
    if (dto.isFreePreview !== undefined) data.isFreePreview = dto.isFreePreview;
    this.applyVideo(data, dto.video);
    return this.prisma.lesson.update({ where: { id }, data });
  }

  /** Archives the lesson; learners' progress on it is kept. */
  async deleteLesson(id: string, confirm: string | undefined, actor: AuthUser) {
    const l = await this.prisma.lesson.findUnique({ where: { id }, include: { module: { include: { course: { select: { id: true, published: true } } } } } });
    if (!l || l.archivedAt) throw new NotFoundException('Lesson not found');
    assertTyped(confirm, l.title, `the lesson "${l.title}"`);
    await auditDelete(this.prisma, actor, 'Lesson', id, l.title, { ...l, module: undefined, moduleId: l.moduleId, courseId: l.module.course.id }, 'ARCHIVE');
    await this.prisma.lesson.update({ where: { id }, data: { archivedAt: new Date() } });
    await this.unpublishIfEmpty(l.module.course.id, l.module.course.published);
    return { deleted: true, archived: true };
  }

  async reorderLessons(moduleId: string, ids: string[]) {
    const rows = await this.prisma.lesson.findMany({ where: { moduleId, ...LIVE }, select: { id: true } });
    this.assertSameSet(rows.map((r) => r.id), ids);
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.lesson.update({ where: { id }, data: { sortOrder: i } })));
    return { ok: true };
  }

  /** A published course with no lessons left would show an empty page, so it goes back to draft. */
  private async unpublishIfEmpty(courseId: string, published: boolean) {
    if (!published) return;
    if ((await this.prisma.lesson.count({ where: { ...LIVE, module: { courseId, ...LIVE } } })) === 0) {
      await this.prisma.course.update({ where: { id: courseId }, data: { published: false } });
    }
  }

  private assertSameSet(current: string[], next: string[]) {
    if (current.length !== next.length || new Set(next).size !== next.length || !next.every((id) => current.includes(id))) {
      throw new BadRequestException('The list changed while you were editing. Reload and try again.');
    }
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

/** A logged-in learner switching a course on: pay through Razorpay, or hand in the course task. */
@Controller('courses')
@UseGuards(AuthGuard)
class CourseActivationController {
  constructor(private readonly act: CourseActivationService) {}

  @Post(':id/pay') @HttpCode(200) @Throttle({ default: { ttl: 60_000, limit: 10 } })
  pay(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.act.startPayment(u, id); }

  @Post(':id/pay/verify') @HttpCode(200) @Throttle({ default: { ttl: 60_000, limit: 20 } })
  verify(@Param('id') id: string, @Body() dto: VerifyDto, @CurrentUser() u: AuthUser) { return this.act.verifyPayment(u.id, id, dto); }

  @Post(':id/task') @HttpCode(200) @Throttle({ default: { ttl: 60_000, limit: 10 } })
  task(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.act.submitTask(u.id, id); }
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
  constructor(private readonly svc: CoursesService, private readonly act: CourseActivationService) {}

  @Get() list() { return this.svc.adminList(); }
  @Post() create(@Body() dto: CourseDto) { return this.svc.createCourse(dto); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.adminGet(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CourseDto) { return this.svc.updateCourse(id, dto); }
  @Delete(':id') remove(@Param('id') id: string, @Query('confirm') confirm: string | undefined, @CurrentUser() admin: AuthUser) { return this.svc.deleteCourse(id, confirm, admin); }

  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: THUMB_MAX_BYTES, files: 1 } }))
  setThumbnail(@Param('id') id: string, @UploadedFile() image?: Upload) { return this.svc.setThumbnail(id, image); }
  @Delete(':id/thumbnail') clearThumbnail(@Param('id') id: string) { return this.svc.clearThumbnail(id); }

  @Post(':id/modules') createModule(@Param('id') id: string, @Body() dto: ModuleDto) { return this.svc.createModule(id, dto); }
  @Put(':id/modules/order') reorderModules(@Param('id') id: string, @Body() dto: OrderDto) { return this.svc.reorderModules(id, dto.ids); }

  // Who has this course: free assignments, paid buyers and task requests, each with their start and end dates.
  @Get(':id/enrollments') enrollments(@Param('id') id: string) { return this.act.list(id); }
  @Post(':id/enrollments') enroll(@Param('id') id: string, @Body() dto: EnrollDto) { return this.act.assign(id, dto.email); }
  @Patch(':id/enrollments/:userId/approve') approve(@Param('id') id: string, @Param('userId') userId: string) { return this.act.approve(id, userId); }
  @Patch(':id/enrollments/:userId/reject') reject(@Param('id') id: string, @Param('userId') userId: string, @Body() dto: ReasonDto) { return this.act.reject(id, userId, dto.reason); }
  @Patch(':id/enrollments/:userId/revoke') revoke(@Param('id') id: string, @Param('userId') userId: string) { return this.act.revoke(id, userId); }
  @Delete(':id/enrollments/:userId') unenroll(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() admin: AuthUser) { return this.act.remove(id, userId, admin); }
}

@Controller('admin/course-modules')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class ModulesAdminController {
  constructor(private readonly svc: CoursesService) {}

  @Patch(':id') update(@Param('id') id: string, @Body() dto: ModuleDto) { return this.svc.updateModule(id, dto); }
  @Delete(':id') remove(@Param('id') id: string, @Query('confirm') confirm: string | undefined, @CurrentUser() admin: AuthUser) { return this.svc.deleteModule(id, confirm, admin); }
  @Post(':id/lessons') createLesson(@Param('id') id: string, @Body() dto: LessonDto) { return this.svc.createLesson(id, dto); }
  @Put(':id/lessons/order') reorderLessons(@Param('id') id: string, @Body() dto: OrderDto) { return this.svc.reorderLessons(id, dto.ids); }
}

@Controller('admin/course-lessons')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class LessonsAdminController {
  constructor(private readonly svc: CoursesService) {}

  @Patch(':id') update(@Param('id') id: string, @Body() dto: LessonDto) { return this.svc.updateLesson(id, dto); }
  @Delete(':id') remove(@Param('id') id: string, @Query('confirm') confirm: string | undefined, @CurrentUser() admin: AuthUser) { return this.svc.deleteLesson(id, confirm, admin); }
}

@Module({
  controllers: [CoursesPublicController, CourseActivationController, LearnController, CoursesAdminController, ModulesAdminController, LessonsAdminController],
  providers: [CoursesService, CourseActivationService, OptionalAuthGuard],
})
export class CoursesModule {}
