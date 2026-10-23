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
  CLUB: '1% Club members and anyone you enrol can watch. Others only see free previews.',
  ENROLLED: 'Only students you enrol by email can watch. Others only see free previews.',
};
