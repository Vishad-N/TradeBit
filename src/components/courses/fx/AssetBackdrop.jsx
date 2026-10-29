import { memo, useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Small seeded PRNG so a given asset always draws the same chart (no flicker between renders).
function rng(seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function series(seed, n) {
  const r = rng(seed);
  let p = 140;
  return Array.from({ length: n }, () => {
    const o = p;
    p = Math.max(40, Math.min(250, p + (r() - 0.46) * 34));
    const c = p;
    return { o, c, h: Math.max(o, c) + r() * 14, l: Math.min(o, c) - r() * 14 };
  });
}

/**
 * Decorative SVG market backdrop: faint grid, drifting candlesticks and a glowing price line that draws itself.
 * Pure SVG + CSS, so it is cheap enough for phones.
 */
function AssetBackdrop({ seed = 'gen', line = true, className = '' }) {
  const calm = useReducedMotion();
  const id = useId();
  const candles = useMemo(() => series(seed, 36), [seed]);
  const path = useMemo(() => candles.map((k, i) => `${i ? 'L' : 'M'}${i * 40 + 20} ${300 - k.c}`).join(' '), [candles]);
  return (
    <svg className={`cx-bd ${className}`} viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`g${id}`} width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="1" /></pattern>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ac)" stopOpacity=".22" /><stop offset="1" stopColor="var(--ac)" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="1440" height="300" fill={`url(#g${id})`} />
      <g className="cx-bd-candles">
        {candles.map((k, i) => {
          const x = i * 40 + 20;
          return (
            <g key={i} className={k.c >= k.o ? 'up' : 'dn'}>
              <line x1={x} x2={x} y1={300 - k.h} y2={300 - k.l} />
              <rect x={x - 6} width="12" y={300 - Math.max(k.o, k.c)} height={Math.max(3, Math.abs(k.c - k.o))} rx="1.5" />
            </g>
          );
        })}
      </g>
      {line && (
        <>
          <path d={`${path} L1420 300 L20 300 Z`} fill={`url(#f${id})`} />
          <motion.path d={path} fill="none" stroke="var(--ac)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"
            initial={{ pathLength: calm ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: calm ? 0 : 2.6, ease: 'easeInOut' }} />
        </>
      )}
    </svg>
  );
}
export default memo(AssetBackdrop);
