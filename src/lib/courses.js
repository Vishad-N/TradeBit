// Small helpers shared by the course pages (student + admin).

/** 3725 -> "1h 02m", 754 -> "12m", 45 -> "45s", 0 -> "" */
export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (!s) return '';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}

/** 754 -> "12:34", 3725 -> "1:02:05" (the clock style used on lesson rows). */
export function fmtClock(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/** "12:34" | "1:02:05" | "12" (minutes) -> seconds; '' -> 0; anything else -> null (invalid). */
export function parseClock(text) {
  const t = String(text || '').trim();
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const parts = t.split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n > 59)) return null;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** Mirrors the server: accepts a bare id, vimeo.com/ID[/HASH], player.vimeo.com/video/ID?h=HASH. */
export function parseVimeo(input) {
  const raw = String(input || '').trim();
  if (!raw) return { empty: true };
  if (/^\d{6,12}$/.test(raw)) return { id: raw, hash: null };
  let url;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return { error: true }; }
  if (!/(^|\.)vimeo\.com$/i.test(url.hostname)) return { error: true };
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.findIndex((p) => /^\d{6,12}$/.test(p));
  if (at < 0) return { error: true };
  const hash = [url.searchParams.get('h'), parts[at + 1]].find((h) => h && /^[0-9a-zA-Z]{6,20}$/.test(h)) || null;
  return { id: parts[at], hash };
}

export const ACCESS_LABEL = { PUBLIC: 'Free for members', CLUB: '1% Club', ENROLLED: 'Enrolled students' };
export const ACCESS_HELP = {
  PUBLIC: 'Any logged-in user can watch every lesson.',
  CLUB: '1% Club members can watch. Anyone else needs to be activated (assigned by you, paid, or approved task) using the options below.',
  ENROLLED: 'Only activated students can watch: assigned by you, paid, or approved task, using the options below.',
};

export const VALIDITY_UNIT_LABEL = { DAY: 'Days', WEEK: 'Weeks', MONTH: 'Months', YEAR: 'Years', LIFETIME: 'Lifetime' };

/** "2026-03-12T..." -> "12 Mar 2026" (the viewer's own timezone). */
export function fmtDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/** "Valid for 6 months from activation" / "Lifetime access" for the course-level validity the server sends. */
export function validityText(v) {
  if (!v) return '';
  return v.lifetime ? 'Lifetime access' : `Valid for ${v.label} from activation`;
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The viewer's own access period as a short line, e.g. "Active 12 Mar 2026 → 12 Mar 2027 · 120 days left". Empty when nothing applies. */
export function mineText(m) {
  if (!m) return '';
  if (m.state === 'ACTIVE') {
    if (m.via === 'PROGRAMME') return 'Included with your programme';
    if (m.via === 'CLUB') return 'Included with your 1% Club membership';
    const since = fmtDate(m.activatedAt);
    if (m.lifetime) return since ? `Lifetime access · since ${since}` : 'Lifetime access';
    return `${since ? `Active ${since} → ` : 'Access until '}${fmtDate(m.expiresAt)} · ${m.daysLeft === 0 ? 'ends today' : `${plural(m.daysLeft, 'day')} left`}`;
  }
  if (m.state === 'EXPIRED') return `Your access ended on ${fmtDate(m.expiresAt)}`;
  if (m.state === 'PENDING') return 'Waiting for approval';
  return '';
}

/** 'soon' when an active, dated access has a week or less left; 'ended' once it expired; '' otherwise. Drives the colour of the line. */
export const mineTone = (m) => (m?.state === 'EXPIRED' ? 'ended' : m?.state === 'ACTIVE' && m.daysLeft != null && m.daysLeft <= 7 ? 'soon' : '');

/** The short chip on a course card: this learner's own time left, else what a purchase gives. Null when there is nothing to say. */
export function validityChip(course) {
  const m = course.mine;
  if (m?.state === 'ACTIVE') {
    if (m.via) return 'Included';
    if (m.lifetime) return 'Lifetime';
    return m.daysLeft === 0 ? 'Ends today' : `${plural(m.daysLeft, 'day')} left`;
  }
  if (m?.state === 'EXPIRED') return 'Expired';
  if (!course.validity) return null;
  return course.validity.lifetime ? 'Lifetime' : `Valid ${course.validity.label}`;
}
