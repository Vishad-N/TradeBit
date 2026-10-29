import { motion, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';

const R = 44;
const C = 2 * Math.PI * R;
const ZERO = { on: () => () => {}, get: () => 0 };

/**
 * Animated SVG progress ring. Pass `value` (0-100) for a plain number, or `mv` (a motion value 0-1) to follow video
 * playback without re-rendering the parent four times a second.
 */
export default function ProgressRing({ value = 0, mv, size = 96, stroke = 7, label, sub, className = '' }) {
  const calm = useReducedMotion();
  const gid = useId();
  const [shown, setShown] = useState(mv ? Math.round(mv.get() * 100) : 0);
  const fallback = useMotionValue(0);
  useMotionValueEvent(mv ?? fallback, 'change', (v) => {
    const n = Math.round(v * 100);
    setShown((p) => (p === n ? p : n));
  });
  const pct = mv ? shown : Math.round(value);
  const grad = `url(#${gid})`;
  return (
    <div className={`cx-ring ${className}`} style={{ width: size, height: size }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--ac)" /><stop offset="1" stopColor="var(--gain)" /></linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        {mv
          ? <motion.circle cx="50" cy="50" r={R} fill="none" stroke={grad} strokeWidth={stroke} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ pathLength: mv }} />
          : <motion.circle cx="50" cy="50" r={R} fill="none" stroke={grad} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} transform="rotate(-90 50 50)"
              initial={{ strokeDashoffset: calm ? C * (1 - pct / 100) : C }} animate={{ strokeDashoffset: C * (1 - pct / 100) }} transition={{ duration: calm ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }} />}
      </svg>
      <span className="cx-ring-n"><b>{pct}</b><i>%</i>{sub && <small>{sub}</small>}</span>
    </div>
  );
}
