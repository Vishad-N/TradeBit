import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ID = 'default';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_TZ = 'Asia/Kolkata';

export interface FreeSchedule {
  enabled: boolean;
  days: number[];
  startMinute: number;
  endMinute: number;
  timezone: string;
  allBooks: boolean;
  bookIds: string[];
}

export interface FreeWindow {
  active: boolean;
  /** When the current free window closes (only while active). Consecutive all-day days are merged, so Sat+Sun ends Sunday midnight. */
  endsAt: string | null;
  /** When the next one opens (only while inactive). */
  nextStartsAt: string | null;
  /** "Sat & Sun" or "Mon, Wed & Fri · 10:00 am – 6:00 pm" */
  label: string;
}

const EMPTY: FreeSchedule = { enabled: false, days: [], startMinute: 0, endMinute: 1440, timezone: DEFAULT_TZ, allBooks: true, bookIds: [] };

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Weekday (0 = Sunday), minutes after midnight and seconds in the given time zone. */
function localParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  return { dow: DAY_NAMES.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')), seconds: Number(get('second')) };
}

const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

function labelOf(s: FreeSchedule): string {
  const d = [...s.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // Monday first
  let days: string;
  if (d.length === 7) days = 'Every day';
  else if (d.length === 1) days = DAY_NAMES[d[0]];
  else days = `${d.slice(0, -1).map((x) => DAY_NAMES[x]).join(', ')} & ${DAY_NAMES[d[d.length - 1]]}`;
  return s.startMinute === 0 && s.endMinute === 1440 ? days : `${days} · ${clock(s.startMinute)} – ${clock(s.endMinute % 1440)}`;
}

/** Pure: where `schedule` stands at `nowMs`. Returns null when the schedule is off or has no days. */
export function computeWindow(s: FreeSchedule, nowMs = Date.now()): FreeWindow | null {
  if (!s.enabled || s.days.length === 0) return null;
  const { dow, minutes, seconds } = localParts(nowMs, s.timezone);
  const minNow = minutes + seconds / 60;
  const label = labelOf(s);
  if (s.days.includes(dow) && minNow >= s.startMinute && minNow < s.endMinute) {
    let remaining = s.endMinute - minNow;
    // An all-day window that runs into another all-day day is one continuous window.
    if (s.endMinute === 1440 && s.startMinute === 0) {
      for (let i = 1; i <= 7 && s.days.includes((dow + i) % 7); i++) remaining += 1440;
    }
    return { active: true, endsAt: new Date(nowMs + remaining * 60_000).toISOString(), nextStartsAt: null, label };
  }
  for (let ahead = 0; ahead <= 7; ahead++) {
    if (!s.days.includes((dow + ahead) % 7)) continue;
    const offset = ahead * 1440 + s.startMinute - minNow;
    if (offset > 0) return { active: false, endsAt: null, nextStartsAt: new Date(nowMs + offset * 60_000).toISOString(), label };
  }
  return { active: false, endsAt: null, nextStartsAt: null, label };
}

/** Pure: does the schedule cover this book (ignoring the clock)? Club-only books are never covered. */
export const covers = (s: FreeSchedule, book: { id: string; clubOnly: boolean }) => s.enabled && !book.clubOnly && (s.allBooks || s.bookIds.includes(book.id));

@Injectable()
export class FreeScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<FreeSchedule> {
    const r = await this.prisma.freeReadingSchedule.findUnique({ where: { id: ID } });
    return r ? { enabled: r.enabled, days: r.days, startMinute: r.startMinute, endMinute: r.endMinute, timezone: r.timezone, allBooks: r.allBooks, bookIds: r.bookIds } : { ...EMPTY };
  }

  async save(body: Record<string, unknown>) {
    const b = body ?? {};
    const enabled = b.enabled === true;
    const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number))] : [];
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new BadRequestException('Days must be weekdays from Sunday to Saturday.');
    const startMinute = Number(b.startMinute ?? 0);
    const endMinute = Number(b.endMinute ?? 1440);
    if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > 1439) throw new BadRequestException('The start time is not valid.');
    if (!Number.isInteger(endMinute) || endMinute < 1 || endMinute > 1440) throw new BadRequestException('The end time is not valid.');
    if (endMinute <= startMinute) throw new BadRequestException('The free window must end after it starts (it cannot run past midnight; use all day instead).');
    const timezone = typeof b.timezone === 'string' && b.timezone.trim() ? b.timezone.trim() : DEFAULT_TZ;
    if (!validTimezone(timezone)) throw new BadRequestException('That time zone is not recognised.');
    const allBooks = b.allBooks !== false;
    const requested = Array.isArray(b.bookIds) ? [...new Set(b.bookIds.filter((x): x is string => typeof x === 'string'))].slice(0, 500) : [];
    // Only real, public books can be listed; club-only books are dropped.
    const valid = requested.length ? (await this.prisma.book.findMany({ where: { id: { in: requested }, clubOnly: false }, select: { id: true } })).map((x) => x.id) : [];
    if (enabled && days.length === 0) throw new BadRequestException('Pick at least one free day.');
    if (enabled && !allBooks && valid.length === 0) throw new BadRequestException('Pick at least one book, or choose "All books".');
    const data = { enabled, days: days.sort((a, c) => a - c), startMinute, endMinute, timezone, allBooks, bookIds: valid };
    await this.prisma.freeReadingSchedule.upsert({ where: { id: ID }, create: { id: ID, ...data }, update: data });
    return this.view();
  }

  /** Schedule plus where it stands right now, for the admin screen. */
  async view() {
    const schedule = await this.get();
    return { ...schedule, serverTime: new Date().toISOString(), window: computeWindow(schedule) };
  }
}
