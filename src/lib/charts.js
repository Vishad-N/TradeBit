// Chart + artwork generators. Every function returns an SVG markup string built
// only from constants and a seeded RNG, so the output is deterministic and safe
// to inject with dangerouslySetInnerHTML.

export const K = { l: '#F3F4EF', c: '#151814', lime: '#B8D83D', pl: '#DCE8C0' };
const F = 'Space Grotesk, sans-serif';
const NSE = 'vector-effect="non-scaling-stroke"';

/* ---------- chart engine ---------- */
export const rng = s => () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646);

export function ohlc(way, n, seed, vol) {
  const r = rng(seed), out = [];
  let prev = way[0][1];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let k = 0;
    while (k < way.length - 2 && t > way[k + 1][0]) k++;
    const [t0, p0] = way[k], [t1, p1] = way[k + 1];
    const tgt = p0 + (p1 - p0) * ((t - t0) / ((t1 - t0) || 1));
    const c = tgt + (r() - .5) * vol, o = prev;
    out.push({ o, c, h: Math.max(o, c) + r() * vol * .55, l: Math.min(o, c) - r() * vol * .55 });
    prev = c;
  }
  return out;
}

// Returns the candle markup plus the scales, so annotations can be placed on it.
export function candles(data, box, o = {}) {
  const lo = Math.min(...data.map(d => d.l)), hi = Math.max(...data.map(d => d.h)), pad = (hi - lo) * .08;
  const X = i => box.x + (i + .5) * box.w / data.length;
  const Y = p => box.y + box.h - (p - (lo - pad)) / ((hi + pad) - (lo - pad)) * box.h;
  const col = o.color || K.pl, cw = Math.max(1.4, box.w / data.length * (o.body || .56));
  let g = '';
  if (o.grid) {
    for (let i = 0; i <= o.grid; i++) { const y = box.y + i * box.h / o.grid; g += `<line x1="${box.x}" x2="${box.x + box.w}" y1="${y}" y2="${y}" stroke="${o.gridColor}" ${NSE}/>`; }
    for (let i = 0; i <= o.grid * 2; i++) { const x = box.x + i * box.w / (o.grid * 2); g += `<line y1="${box.y}" y2="${box.y + box.h}" x1="${x}" x2="${x}" stroke="${o.gridColor}" ${NSE}/>`; }
  }
  let c = '';
  data.forEach((d, i) => {
    const up = d.c >= d.o, y1 = Y(Math.max(d.o, d.c)), y2 = Y(Math.min(d.o, d.c));
    const op = o.opacity ?? 1;
    c += `<g class="cd" style="--i:${i}" opacity="${op}"><line x1="${X(i)}" x2="${X(i)}" y1="${Y(d.h)}" y2="${Y(d.l)}" stroke="${col}" ${NSE}/><rect x="${X(i) - cw / 2}" y="${y1}" width="${cw}" height="${Math.max(1, y2 - y1)}" fill="${up ? col : (o.hollowFill || 'none')}" stroke="${col}" ${NSE}/></g>`;
  });
  return {
    svg: `<g>${g}</g><g>${c}</g>`,
    X, Y, data,
    at: t => { const i = Math.round(t * (data.length - 1)), d = data[i]; return { i, x: X(i), hi: Y(d.h), lo: Y(d.l), c: Y(d.c) }; },
  };
}

export const pill = (x, y, t, bg, fg, anchor = 'middle', fs = 9.5) => {
  const w = t.length * fs * .66 + 16, rx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return `<g><rect x="${rx}" y="${y - 10}" width="${w}" height="20" rx="10" fill="${bg}"/><text x="${rx + w / 2}" y="${y + 3.4}" text-anchor="middle" font-family="${F}" font-weight="600" font-size="${fs}" letter-spacing="1.2" fill="${fg}">${t}</text></g>`;
};

const paths = (n, fn, attrs) => {
  let s = '';
  for (let k = 1; k <= n; k++) s += `<path d="${fn(k)}" ${typeof attrs === 'function' ? attrs(k) : attrs}/>`;
  return s;
};

/* ---------- silhouette-following artwork ---------- */
// hero charcoal form contours (follow the arched slab)
export const formTopo = () => paths(6, k => `M${170 + k * 42} 900 V${330 + k * 6} C${170 + k * 42} ${150 + k * 34} ${300 + k * 26} ${20 + k * 42} 480 ${20 + k * 42} H800`, NSE);

// hero cap contours (parallel to asymmetric curve)
export const heroCapTopo = () => paths(5, k => `M0 ${86 + k * 3} C34 ${86 + k * 3} ${72 + k} ${70 + k * 6} 100 ${k * 17}`, NSE);

// pale-lime trust zone topography
export function trustTopo() {
  let d = '';
  for (let k = 0; k < 9; k++) {
    let p = `M0 ${60 + k * 40}`;
    for (let x = 0; x <= 1440; x += 90) p += ` Q${x + 45} ${60 + k * 40 + Math.sin((x + k * 120) / 210) * 26} ${x + 90} ${60 + k * 40 + Math.cos((x + k * 80) / 260) * 14}`;
    d += `<path d="${p}" fill="none" stroke="${K.c}" stroke-opacity=".07" ${NSE}/>`;
  }
  return d;
}

export function trustIn() {
  let d = '';
  for (let k = 0; k < 7; k++) d += `<ellipse cx="1080" cy="320" rx="${140 + k * 90}" ry="${70 + k * 46}" fill="none" stroke="${K.pl}" stroke-opacity="${.13 - k * .012}" ${NSE}/>`;
  return d;
}

// problem: contours flowing toward the half-cut
export const probArt = () => paths(10, k => `M-10 ${k * 8} H${36 - k * 3} C${66 - k * 4} ${k * 8} ${90 - k * 4} ${20 + k * 8} ${100 - k * 3.5} ${100 + k * 9} L${100 - k * 3.5} 240`, k => `fill="none" stroke="${K.pl}" stroke-opacity="${(.16 - k * .011).toFixed(3)}" ${NSE}`);

// problem: fragmented chart lines + crossed-out levels
export function probLines() {
  const r = rng(12);
  let d = '';
  for (let k = 0; k < 4; k++) {
    let x = 0, y = 380 + k * 190, p = '';
    while (x < 1440) {
      const seg = 60 + r() * 140;
      let q = `M${x} ${y}`;
      for (let j = 0; j < 4; j++) { x += seg / 4; y += (r() - .5) * 80; q += ` L${x} ${y}`; }
      p += `<path d="${q}" fill="none" stroke="${K.pl}" stroke-opacity=".12" ${NSE}/>`;
      x += 40 + r() * 80;
    }
    d += p;
  }
  [520, 830, 1060].forEach(y => { d += `<line x1="0" x2="1440" y1="${y}" y2="${y}" stroke="${K.pl}" stroke-opacity=".08" stroke-dasharray="8 10" ${NSE}/><text x="1380" y="${y - 8}" fill="${K.pl}" fill-opacity=".25" font-size="14" font-family="${F}" text-anchor="end">✕ INVALID LEVEL</text>`; });
  return d;
}

// education: contours following the curved-diagonal entry
export const eduArt = () => paths(9, k => `M${64 + k * 5} -2 C${36 + k * 5} ${4 + k * 6} ${12 + k * 4} ${32 + k * 8} ${-2} ${100 + k * 10}`, k => `fill="none" stroke="${K.c}" stroke-opacity="${(.14 - k * .012).toFixed(3)}" ${NSE}`);

// final arch: lime arc + pale-lime contours following oval and vertical sides
export function archArt() {
  let d = '';
  for (let k = 1; k <= 9; k++) {
    const a = 100 + k * 34, b = 900 - k * 34, t = k * 28;
    const p = `M${a} 690 V${300 + t * .4} C${120 + k * 34} ${90 + t} ${300 + k * 18} ${t} 500 ${t} C${700 - k * 18} ${t} ${880 - k * 34} ${90 + t} ${b} ${300 + t * .4} V690`;
    d += k === 1 ? `<path class="dr" d="${p}" fill="none" stroke="${K.lime}" stroke-width="2" ${NSE}/>` : `<path d="${p}" fill="none" stroke="${K.pl}" stroke-opacity="${(.14 - k * .012).toFixed(3)}" ${NSE}/>`;
  }
  let w = 'M0 620';
  for (let x = 0; x <= 1000; x += 50) w += ` Q${x + 25} ${600 + Math.sin(x / 70) * 22} ${x + 50} ${612 + Math.cos(x / 90) * 12}`;
  d += `<path d="${w}" fill="none" stroke="${K.pl}" stroke-opacity=".12" ${NSE}/>`;
  return d;
}

/* ---------- HERO chart ---------- */
export function heroChart(reduceMotion) {
  const ch = candles(ohlc([[0, 100], [.12, 124], [.2, 112], [.34, 150], [.44, 132], [.6, 172], [.7, 154], [.84, 196], [.9, 188], [1, 214]], 58, 7, 7), { x: 0, y: 30, w: 560, h: 500 }, { color: K.pl, grid: 5, gridColor: 'rgba(220,232,192,.06)' });
  const sw = [[.2, 'lo'], [.34, 'hi'], [.44, 'lo'], [.6, 'hi'], [.7, 'lo']].map(([t, k]) => ({ ...ch.at(t), k }));
  const hh = ch.at(.6), zn = ch.at(.7), bo = ch.at(.78), last = ch.at(1);
  let a = `<rect class="fd" x="${zn.x - 30}" y="${zn.lo - 8}" width="${560 - zn.x + 30}" height="36" fill="rgba(220,232,192,.08)" stroke="rgba(220,232,192,.35)" stroke-dasharray="3 4" ${NSE}/>`;
  a += `<text class="fd" x="${zn.x - 24}" y="${zn.lo + 46}" font-family="${F}" font-size="9" font-weight="600" letter-spacing="1.6" fill="${K.pl}" fill-opacity=".7">SUPPORT ZONE</text>`;
  a += `<line class="dr" x1="${hh.x - 60}" x2="600" y1="${hh.hi}" y2="${hh.hi}" stroke="${K.pl}" stroke-opacity=".6" stroke-dasharray="2 5" ${NSE}/>`;
  a += `<text class="fd" x="598" y="${hh.hi - 8}" text-anchor="end" font-family="${F}" font-size="9" letter-spacing="1.4" fill="${K.pl}" fill-opacity=".7">RESISTANCE</text>`;
  a += `<polyline class="dr" points="${sw.map(p => `${p.x},${p.k === 'hi' ? p.hi : p.lo}`).join(' ')}" fill="none" stroke="${K.pl}" stroke-width="1.2" ${NSE}/>`;
  sw.forEach(p => { a += `<g class="fd">${pill(p.x, p.k === 'hi' ? p.hi - 18 : p.lo + 20, p.k === 'hi' ? 'HH' : 'HL', 'rgba(220,232,192,.14)', K.pl)}</g><circle class="fd" cx="${p.x}" cy="${p.k === 'hi' ? p.hi : p.lo}" r="3" fill="${K.pl}"/>`; });
  a += `<circle class="fd" cx="${bo.x}" cy="${hh.hi}" r="14" fill="none" stroke="${K.lime}" stroke-width="1.4"/><g class="fd">${pill(bo.x, hh.hi - 30, 'BREAKOUT ↗', K.lime, K.c)}</g>`;
  a += `<line x1="${last.x}" x2="600" y1="${last.c}" y2="${last.c}" stroke="${K.lime}" stroke-opacity=".7" ${NSE}/><g class="fd">${pill(600, last.c, '24,812', K.lime, K.c, 'end')}</g>`;
  a += `<circle cx="${last.x}" cy="${last.c}" r="4" fill="${K.lime}">${reduceMotion ? '' : '<animate attributeName="r" values="4;10;4" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.25;1" dur="2.6s" repeatCount="indefinite"/>'}</circle>`;
  [0, 1, 2, 3, 4].forEach(i => { a += `<text x="-8" y="${60 + i * 110}" text-anchor="end" font-family="${F}" font-size="9" fill="${K.pl}" fill-opacity=".35">${(24900 - i * 120).toLocaleString('en-IN')}</text>`; });
  return ch.svg + a;
}

/* ---------- SOLUTION visual (light) ---------- */
// `base` is everything always visible; `layers[1..5]` are revealed one by one.
export function solutionChart() {
  let base = `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${K.c}" stroke-opacity=".35" stroke-width="2"/></pattern></defs>`;
  base += `<path d="M-40 470 C120 520 200 340 340 330 S560 240 740 60 L740 170 C600 330 460 400 340 420 S120 600 -40 590 Z" fill="${K.pl}"/>`;
  base += paths(7, k => `M-40 ${470 + k * 26} C120 ${520 + k * 26} 200 ${340 + k * 26} 340 ${330 + k * 26} S560 ${240 + k * 26} 740 ${60 + k * 26}`, `fill="none" stroke="${K.c}" stroke-opacity=".09" ${NSE}`);
  const ch = candles(ohlc([[0, 100], [.14, 122], [.24, 110], [.4, 146], [.52, 128], [.68, 168], [.78, 150], [1, 196]], 50, 21, 6), { x: 20, y: 40, w: 660, h: 470 }, { color: K.c, hollowFill: K.l });
  base += ch.svg;
  const sw = [[.14, 'hi'], [.24, 'lo'], [.4, 'hi'], [.52, 'lo'], [.68, 'hi'], [.78, 'lo']].map(([t, k]) => ({ ...ch.at(t), k }));
  const z = ch.at(.78), e = ch.at(.82);
  const L = [];
  L[1] = `<polyline class="dr" points="${sw.map(p => `${p.x},${p.k === 'hi' ? p.hi : p.lo}`).join(' ')}" fill="none" stroke="${K.c}" stroke-width="1.6" ${NSE}/>` + sw.map(p => pill(p.x, p.k === 'hi' ? p.hi - 18 : p.lo + 20, p.k === 'hi' ? 'HH' : 'HL', K.c, K.l)).join('');
  L[2] = sw.filter(p => p.k === 'lo').map(p => `<circle cx="${p.x}" cy="${p.lo}" r="13" fill="none" stroke="${K.c}" stroke-dasharray="2 3"/>`).join('');
  L[3] = `<rect x="${z.x - 34}" y="${z.lo - 8}" width="${680 - z.x + 34}" height="30" fill="rgba(21,24,20,.07)" stroke="${K.c}" stroke-dasharray="4 4" ${NSE}/><text x="${z.x - 28}" y="${z.lo + 40}" font-family="${F}" font-size="10" font-weight="600" letter-spacing="1.4" fill="${K.c}">SETUP · DEMAND ZONE</text>`;
  const en = z.lo + 4, sl = z.lo + 30, tp = en - (sl - en) * 3.2;
  L[4] = `<rect x="${e.x}" y="${en}" width="${680 - e.x}" height="${sl - en}" fill="url(#hatch)"/><rect x="${e.x}" y="${tp}" width="${680 - e.x}" height="${en - tp}" fill="rgba(184,216,61,.22)"/><text x="672" y="${sl + 16}" text-anchor="end" font-family="${F}" font-size="10" font-weight="600" fill="${K.c}">STOP −1R</text><text x="672" y="${tp + 16}" text-anchor="end" font-family="${F}" font-size="10" font-weight="600" fill="${K.c}">TARGET +3.2R</text>`;
  L[5] = `<line x1="${e.x}" x2="680" y1="${en}" y2="${en}" stroke="${K.c}" stroke-width="1.5" ${NSE}/><circle cx="${e.x}" cy="${en}" r="7" fill="${K.lime}" stroke="${K.c}" stroke-width="2"/>${pill(e.x - 12, en + 26, 'EXECUTE', K.lime, K.c, 'end')}`;
  return { base, layers: L };
}

/* ---------- METHOD minis (dark) ---------- */
export const methodMini = {
  1: `<polyline class="ln" points="0,104 34,64 60,84 100,36 128,58 170,14 200,34" fill="none" stroke="${K.pl}" stroke-width="1.6"/><circle class="sig" cx="100" cy="36" r="3.5" fill="${K.pl}"/><circle class="sig" cx="170" cy="14" r="3.5" fill="${K.pl}"/><circle cx="60" cy="84" r="3" fill="none" stroke="${K.pl}"/><circle cx="128" cy="58" r="3" fill="none" stroke="${K.pl}"/>`,
  2: [16, 40, 64, 88, 112, 136, 160, 184].map((x, i) => { const h = [30, 20, 44, 16, 52, 24, 60, 18][i], y = [70, 62, 78, 54, 40, 50, 22, 40][i], u = i % 3 !== 1; return `<line x1="${x}" x2="${x}" y1="${y - 12}" y2="${y + h + 12}" stroke="${K.pl}"/><rect x="${x - 6}" y="${y}" width="12" height="${h}" fill="${u ? K.pl : 'none'}" stroke="${K.pl}"/>`; }).join('') + `<circle class="sig" cx="184" cy="68" r="15" fill="none" stroke="${K.pl}" stroke-dasharray="3 3"/><path class="ln" d="M0 112 H200" stroke="${K.pl}" stroke-opacity=".5" stroke-dasharray="3 4"/>`,
  3: `<rect x="0" y="82" width="200" height="22" fill="rgba(220,232,192,.1)" stroke="${K.pl}" stroke-opacity=".5" stroke-dasharray="3 4"/><polyline class="ln" points="0,30 36,58 64,44 100,94 128,66 156,90 200,12" fill="none" stroke="${K.pl}" stroke-width="1.5"/><circle class="sig" cx="156" cy="90" r="5" fill="${K.pl}"/>`,
  4: `<rect x="50" y="10" width="150" height="66" fill="rgba(184,216,61,.14)" stroke="${K.pl}" stroke-opacity=".5"/><rect x="50" y="76" width="150" height="24" fill="none" stroke="${K.pl}" stroke-opacity=".5" stroke-dasharray="2 3"/><line class="ln" x1="0" x2="200" y1="76" y2="76" stroke="${K.pl}" stroke-width="1.5"/><circle class="sig" cx="50" cy="76" r="4" fill="${K.pl}"/><text x="60" y="30" fill="${K.pl}" font-size="10" font-family="${F}" font-weight="600">+3R</text><text x="60" y="93" fill="${K.pl}" font-size="10" font-family="${F}" font-weight="600">−1R</text>`,
  5: `<polyline class="ln" points="0,104 28,96 56,100 84,80 112,84 140,62 168,54 200,26" fill="none" stroke="${K.pl}" stroke-width="1.8"/><path d="M0 104 L28 96 L56 100 L84 80 L112 84 L140 62 L168 54 L200 26 V120 H0Z" fill="rgba(220,232,192,.07)"/>${[28, 84, 140, 200].map(x => `<circle class="sig" cx="${x}" cy="${{ 28: 96, 84: 80, 140: 62, 200: 26 }[x]}" r="3.5" fill="${K.pl}"/>`).join('')}`,
};

/* ---------- EDUCATION structure diagram (light) ---------- */
export function structChart() {
  const P = [[10, 300], [110, 170], [180, 230], [320, 110], [390, 170], [540, 50], [610, 110], [750, 20]];
  let a = `<path class="dr" d="M180 230 L390 170 L610 110" fill="none" stroke="${K.c}" stroke-opacity=".35" stroke-dasharray="5 6"/>`;
  a += `<polyline class="dr" points="${P.map(p => p.join(',')).join(' ')}" fill="none" stroke="${K.c}" stroke-width="2.2"/>`;
  P.slice(1).forEach((p, i) => {
    const hi = i % 2 === 0, last = i === P.length - 2;
    a += `<circle class="fd" cx="${p[0]}" cy="${p[1]}" r="${last ? 7 : 5}" fill="${last ? K.lime : hi ? K.c : K.l}" stroke="${K.c}" stroke-width="1.6"/>`;
    if (!last) a += `<g class="fd">${pill(p[0], hi ? p[1] - 22 : p[1] + 26, hi ? 'HIGHER HIGH' : 'HIGHER LOW', hi ? K.c : K.pl, hi ? K.l : K.c)}</g>`;
  });
  a += `<text x="10" y="326" font-family="${F}" font-size="11" letter-spacing="2" fill="${K.c}" fill-opacity=".45">UPTREND = SEQUENCE OF HH + HL</text>`;
  return a;
}

/* ---------- LIVE analysis chart (dark, layered) ---------- */
export function liveChart() {
  let base = `<defs><pattern id="hatchD" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${K.pl}" stroke-opacity=".3" stroke-width="2"/></pattern></defs>`;
  const ch = candles(ohlc([[0, 100], [.1, 120], [.18, 106], [.3, 146], [.4, 126], [.54, 172], [.63, 150], [.72, 166], [.78, 176], [.86, 196], [1, 232]], 92, 42, 7.5), { x: 10, y: 30, w: 1180, h: 490 }, { color: K.pl, grid: 6, gridColor: 'rgba(220,232,192,.05)' });
  base += ch.svg;
  const h1 = ch.at(.3), h2 = ch.at(.54), l0 = ch.at(.18), l1 = ch.at(.4), l2 = ch.at(.63), bo = ch.at(.78), en = ch.at(.83), s0 = ch.at(.1);
  const A = [];
  A[1] = `<polyline class="dr" points="${s0.x},${s0.hi} ${l0.x},${l0.lo} ${h1.x},${h1.hi} ${l1.x},${l1.lo} ${h2.x},${h2.hi} ${l2.x},${l2.lo}" fill="none" stroke="${K.pl}" stroke-width="1.4" ${NSE}/>` +
    [[h1, 'HIGHER HIGH', -1], [h2, 'HIGHER HIGH', -1], [l1, 'HIGHER LOW', 1], [l2, 'HIGHER LOW', 1]].map(([p, t, d]) => pill(p.x, d < 0 ? p.hi - 22 : p.lo + 24, t, 'rgba(220,232,192,.16)', K.pl)).join('');
  A[2] = `<line class="dr" x1="0" x2="1200" y1="${h1.hi}" y2="${h1.hi}" stroke="${K.pl}" stroke-opacity=".5" stroke-dasharray="6 6" ${NSE}/><text x="1190" y="${h1.hi - 8}" text-anchor="end" font-family="${F}" font-size="11" font-weight="600" letter-spacing="1.6" fill="${K.pl}" fill-opacity=".7">SUPPORT (FORMER RESISTANCE)</text>` +
    `<line class="dr" x1="${h2.x - 80}" x2="1200" y1="${h2.hi}" y2="${h2.hi}" stroke="${K.pl}" stroke-opacity=".7" stroke-dasharray="2 5" ${NSE}/><text x="1190" y="${h2.hi - 8}" text-anchor="end" font-family="${F}" font-size="11" font-weight="600" letter-spacing="1.6" fill="${K.pl}" fill-opacity=".8">RESISTANCE</text>`;
  A[3] = `<rect x="${l2.x - 60}" y="${l2.lo - 14}" width="${1200 - l2.x + 60}" height="42" fill="rgba(220,232,192,.09)" stroke="rgba(220,232,192,.4)" stroke-dasharray="4 5" ${NSE}/><text x="${l2.x - 52}" y="${l2.lo + 44}" font-family="${F}" font-size="11" font-weight="600" letter-spacing="2" fill="${K.pl}">DEMAND ZONE</text>` +
    `<rect x="${h2.x - 40}" y="${h2.hi - 6}" width="90" height="30" fill="none" stroke="rgba(220,232,192,.4)" stroke-dasharray="4 5" ${NSE}/><text x="${h2.x - 34}" y="${h2.hi + 40}" font-family="${F}" font-size="10" font-weight="600" letter-spacing="1.6" fill="${K.pl}" fill-opacity=".6">SUPPLY</text>`;
  A[4] = `<circle cx="${bo.x}" cy="${h2.hi}" r="18" fill="none" stroke="${K.lime}" stroke-width="1.6"/>${pill(bo.x, h2.hi - 34, 'BREAKOUT ↗', K.lime, K.c)}<path class="dr" d="M${bo.x - 60} ${h2.hi + 70} Q ${bo.x - 20} ${h2.hi + 10} ${bo.x - 4} ${h2.hi + 4}" fill="none" stroke="${K.lime}" stroke-width="1.4" ${NSE}/>`;
  const eY = en.c, slY = l2.lo + 34, tpY = Math.max(40, eY - (slY - eY) * 3);
  A[5] = `<rect x="${en.x}" y="${eY}" width="${1200 - en.x}" height="${slY - eY}" fill="url(#hatchD)"/><rect x="${en.x}" y="${tpY}" width="${1200 - en.x}" height="${eY - tpY}" fill="rgba(184,216,61,.12)" stroke="rgba(184,216,61,.45)" ${NSE}/>` +
    `<line x1="${en.x}" x2="1200" y1="${eY}" y2="${eY}" stroke="${K.l}" ${NSE}/><circle cx="${en.x}" cy="${eY}" r="7" fill="${K.lime}" stroke="${K.c}" stroke-width="3"/>${pill(en.x - 14, eY + 26, 'ENTRY · RETEST', K.l, K.c, 'end')}` +
    `<text x="1190" y="${slY + 18}" text-anchor="end" font-family="${F}" font-size="11" font-weight="600" letter-spacing="1.4" fill="${K.pl}">RISK · STOP −1R</text><text x="1190" y="${tpY + 20}" text-anchor="end" font-family="${F}" font-size="11" font-weight="600" letter-spacing="1.4" fill="${K.lime}">PLANNED TARGET · 3R</text>`;
  return { base, layers: A };
}

export const liveBg = () => candles(ohlc([[0, 100], [.5, 140], [1, 122]], 70, 9, 10), { x: 0, y: 300, w: 1440, h: 560 }, { color: K.pl, body: .4 }).svg;

/* ---------- faces (duotone placeholder portraits) ---------- */
export function face(n) {
  const bg = [K.pl, K.c, K.pl][n], fg = [K.c, K.pl, K.c][n];
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="${bg}"/><ellipse cx="30" cy="25" rx="10" ry="12" fill="${fg}" fill-opacity=".85"/><path d="M10 60 C12 45 20 40 30 40 C40 40 48 45 50 60Z" fill="${fg}" fill-opacity=".85"/><path d="M${n ? 20 : 21} 22 C21 13 39 13 40 22 C37 17 24 17 ${n ? 20 : 21} 22Z" fill="${fg}"/></svg>`;
}

/* ---------- platform UI charts ---------- */
export function uiChart() {
  const c = candles(ohlc([[0, 100], [.3, 120], [.45, 112], [.7, 140], [.8, 132], [1, 158]], 58, 5, 4), { x: 0, y: 6, w: 560, h: 156 }, { color: K.pl, grid: 3, gridColor: 'rgba(243,244,239,.05)' });
  return c.svg + `<rect x="${c.X(44)}" y="${c.Y(134)}" width="${560 - c.X(44)}" height="16" fill="rgba(184,216,61,.18)" stroke="${K.lime}" stroke-dasharray="3 3" ${NSE}/>`;
}

export const phoneChart = () => candles(ohlc([[0, 100], [.4, 118], [.55, 110], [1, 140]], 30, 11, 4), { x: 0, y: 4, w: 260, h: 100 }, { color: K.pl }).svg;
