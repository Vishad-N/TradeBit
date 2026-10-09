import { useRef } from 'react';
import { prefersReducedMotion, useInViewOnce } from '../hooks/motion.js';

// Mirror of Counter: shows `from` until it scrolls into view, then counts down to `to` (ease-out quart, 2.4s).
export default function CountDown({ from, to = 0, className }) {
  const ref = useRef(null);
  const fmt = n => Math.round(n).toLocaleString('en-IN');

  useInViewOnce(ref, () => {
    const el = ref.current;
    if (prefersReducedMotion()) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 2400;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - p, 4));
      el.textContent = fmt(v);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: .6 });

  return <span ref={ref} className={className}>{fmt(from)}</span>;
}
