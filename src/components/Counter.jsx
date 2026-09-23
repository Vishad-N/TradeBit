import { useRef } from 'react';
import { prefersReducedMotion, useInViewOnce } from '../hooks/motion.js';

// Counts up from 0 to `to` (ease-out quart, 2s) the first time it is seen.
export default function Counter({ as: Tag = 'span', to, dec = 0, suf = '', className }) {
  const ref = useRef(null);

  useInViewOnce(ref, () => {
    const el = ref.current;
    if (prefersReducedMotion()) { el.textContent = to.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 2000;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - p, 4));
      el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN')) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: .6 });

  return <Tag ref={ref} className={className}>0</Tag>;
}
