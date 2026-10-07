import { useEffect, useLayoutEffect, useRef } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Sets --len on every .dr / .ln path inside `ref` so stroke-draw animations know
// the real path length. Runs before paint so nothing flashes half-drawn.
export function useStrokeLengths(ref, deps = []) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll('.dr, .ln').forEach(p => {
      if (typeof p.getTotalLength !== 'function') return;
      p.style.setProperty('--len', Math.ceil(p.getTotalLength() + 2));
    });
  }, deps);
}

// Calls `onEnter` once, the first time `ref` scrolls into view.
export function useInViewOnce(ref, onEnter, options) {
  const cb = useRef(onEnter);
  cb.current = onEnter;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      cb.current();
    }), options);
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

// Page-wide reveal classes. These elements are static markup whose className
// React never changes after mount, so adding a class imperatively is safe.
export function usePageReveal() {
  useEffect(() => {
    const reveal = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      reveal.unobserve(e.target);
    }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.rv, .split, .err, .hl').forEach(el => reveal.observe(el));

    const draw = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('drawn');
      draw.unobserve(e.target);
    }), { threshold: .25 });
    document.querySelectorAll('.z-chart, #structChart, #archArt, .portrait-art svg, .sign svg, .edu-curve, .ways-curve')
      .forEach(el => draw.observe(el));

    return () => { reveal.disconnect(); draw.disconnect(); };
  }, []);
}
