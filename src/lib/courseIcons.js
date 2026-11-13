// Course icon presets + the "which icon does this course show?" rule.
//
// Resolution order (see resolveIcon):
//   1. course.customSvg      -> the admin's own inline SVG (sanitised before render)
//   2. course.svgPresetId    -> that specific preset
//   3. otherwise ("Random")  -> a preset picked by hashing course.id, so it is random-looking but never changes
//                               between visits, devices or deploys. A new course therefore gets a gold/crypto icon with no admin work.
//
// Fields live on the Course row as `svgPresetId` (nullable) and `customSvg` (nullable). Existing courses have both NULL,
// so they simply fall into rule 3; no course data is rewritten. The preset ids must match COURSE_ICON_PRESETS in
// backend/src/courses/courses.module.ts. `kind` is the key of the matching illustration in components/courses/fx/HeroArt.jsx;
// `color` / `rgb` become the card's --ac / --ac-rgb accent so the glow, chips and borders follow the icon.

export const ICON_PRESETS = [
  { id: 'gold-coin',   kind: 'goldcoin',  label: 'Gold coin (Au)',            sym: 'XAU', color: '#e8b923', rgb: '232,185,35' },
  { id: 'gold-bars',   kind: 'gold',      label: 'Gold bars / bullion',       sym: 'XAU', color: '#e8b923', rgb: '232,185,35' },
  { id: 'silver-coin', kind: 'silver',    label: 'Silver coin (Ag)',          sym: 'XAG', color: '#c4ccd8', rgb: '196,204,216' },
  { id: 'bitcoin',     kind: 'btc',       label: 'Bitcoin (₿)',               sym: 'BTC', color: '#f7931a', rgb: '247,147,26' },
  { id: 'ethereum',    kind: 'eth',       label: 'Ethereum (Ξ)',              sym: 'ETH', color: '#38d6e8', rgb: '56,214,232' },
  { id: 'solana',      kind: 'sol',       label: 'Solana',                    sym: 'SOL', color: '#a66bff', rgb: '166,107,255' },
  { id: 'xrp',         kind: 'xrp',       label: 'XRP',                       sym: 'XRP', color: '#00aae4', rgb: '0,170,228' },
  { id: 'candlestick', kind: 'candles',   label: 'Price action / candlesticks', sym: 'PA', color: '#2ee59d', rgb: '46,229,157' },
  { id: 'liquidity',   kind: 'liquidity', label: 'Liquidity / order blocks',  sym: 'LQ',  color: '#36d1c4', rgb: '54,209,196' },
  { id: 'bos',         kind: 'bos',       label: 'SMC · Break of Structure',  sym: 'BOS', color: '#ff7a59', rgb: '255,122,89' },
].map((p) => ({ ...p, tag: 'Gold & crypto', theme: { key: p.kind, label: p.label, sym: p.sym, color: p.color, rgb: p.rgb, tag: 'Gold & crypto' } }));

export const PRESET_IDS = ICON_PRESETS.map((p) => p.id);
export const presetById = (id) => ICON_PRESETS.find((p) => p.id === id) || null;

/** Mode of the admin picker: 'random' | 'custom' | a preset id. */
export const iconMode = (c) => (c?.customSvg ? 'custom' : presetById(c?.svgPresetId) ? c.svgPresetId : 'random');

const hash = (t) => [...String(t)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);

/** Deterministic "random" preset for a course id. Returns null when the course has no id yet (still loading). */
export function randomPresetFor(courseId) {
  return courseId ? ICON_PRESETS[hash(courseId) % ICON_PRESETS.length] : null;
}

/**
 * What to draw for a course: { type: 'custom', svg } | { type: 'preset', preset } | null (no id/preset known yet).
 * Custom wins, then an explicit preset, then the id-hash pick.
 */
export function resolveIcon(course) {
  // `hasCustomIcon` (lesson API) says a custom SVG exists without sending it; it still keeps this course out of the preset themes.
  if (course?.customSvg || course?.hasCustomIcon) return { type: 'custom', svg: course.customSvg || '' };
  const chosen = presetById(course?.svgPresetId);
  if (chosen) return { type: 'preset', preset: chosen };
  const random = randomPresetFor(course?.id);
  return random ? { type: 'preset', preset: random } : null;
}

// ---------------------------------------------------------------- custom SVG sanitiser
// Admin-only input, but it is rendered inline (so the .ha-* animations and --ac colours apply), so it is allow-listed both
// here and on the server (cleanCustomSvg in the backend). No scripts, event handlers, external references or HTML.
const TAGS = new Set(['svg', 'g', 'defs', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'text', 'tspan', 'lineargradient', 'radialgradient',
  'stop', 'clippath', 'mask', 'use', 'symbol', 'title', 'desc', 'animate', 'animatetransform', 'animatemotion', 'set', 'mpath', 'filter', 'fegaussianblur',
  'feoffset', 'fecolormatrix', 'femerge', 'femergenode', 'feblend', 'feflood', 'fecomposite', 'fedropshadow']);
const idRefs = /url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g;

/** Returns safe SVG markup (root gets class "ha" and loses fixed width/height) or null if it is not a usable SVG. `uid` namespaces ids. */
export function sanitizeSvg(markup, uid = 'ci') {
  if (typeof markup !== 'string' || typeof DOMParser === 'undefined') return null;
  let doc;
  try { doc = new DOMParser().parseFromString(markup, 'image/svg+xml'); } catch { return null; }
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;

  const ids = new Map();
  doc.querySelectorAll('[id]').forEach((el) => ids.set(el.getAttribute('id'), `${uid}-${el.getAttribute('id')}`));
  const rewrite = (v) => v.replace(idRefs, (_, q, id) => `url(#${ids.get(id) || `${uid}-${id}`})`);

  const walk = (el) => {
    [...el.children].forEach((child) => {
      if (!TAGS.has(child.localName.toLowerCase())) { child.remove(); return; }
      walk(child);
    });
    [...el.attributes].forEach((a) => {
      const name = a.name.toLowerCase();
      const v = a.value;
      const drop = () => el.removeAttribute(a.name);
      if (name.startsWith('on') || /javascript:|data:|vbscript:|expression\(|@import/i.test(v)) return drop();
      if (name === 'href' || name === 'xlink:href') { // only in-document references
        const t = v.trim();
        return t.startsWith('#') ? el.setAttribute(a.name, `#${ids.get(t.slice(1)) || `${uid}-${t.slice(1)}`}`) : drop();
      }
      if (name === 'id') return el.setAttribute('id', ids.get(v));
      if (/url\(/i.test(v)) return /url\(\s*['"]?\s*(?!#)/i.test(v) ? drop() : el.setAttribute(a.name, rewrite(v));
    });
  };
  walk(root);
  root.removeAttribute('width'); root.removeAttribute('height');
  root.setAttribute('class', `ha ${root.getAttribute('class') || ''}`.trim());
  root.setAttribute('aria-hidden', 'true'); root.setAttribute('focusable', 'false');
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', '0 0 400 400');
  return new XMLSerializer().serializeToString(root);
}
