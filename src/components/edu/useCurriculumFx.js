import { useEffect } from 'react';
import { prefersReducedMotion } from '../../hooks/motion.js';

// Motion for the curriculum cards. Restrained by design:
//  - scroll: each card gets .fx-in once it is mostly visible (drives the SVG assembly in edu-fx.css)
//  - Market Structure: the existing line is drawn at a steady pace and the HH/HL markers appear as it reaches them
//  - pointer: a very light perspective tilt, a soft light spot, and a little parallax on the structure markers
//  - particles: ONE small shared Three.js layer (about 40-60 soft dots) for three meanings only:
//      flow along the finished structure line, a faint glow on the +3R target, and rising dots over the candle on hover
// Off for reduced motion. Three.js is loaded on demand (it is the same chunk the hero uses).

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export default function useCurriculumFx(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return undefined;
    const grid = root.querySelector('.edu-grid');
    if (!grid) return undefined;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const small = window.matchMedia('(max-width: 820px)').matches;
    const cleanups = [];
    let dead = false;
    root.classList.add('fx');
    cleanups.push(() => root.classList.remove('fx'));

    const cards = [...grid.querySelectorAll('.mod')];

    // ---- 1. scroll reveal: one class per card, once
    const reveal = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('fx-in');
      e.target.dataset.fxAt = String(performance.now());
      reveal.unobserve(e.target);
    }), { threshold: 0.35 });
    cards.forEach((c) => reveal.observe(c));
    cleanups.push(() => reveal.disconnect());

    // ---- 2. Market Structure: pace the existing draw and time each marker to when the line reaches it
    const svg = grid.querySelector('#structChart');
    if (svg) {
      const poly = svg.querySelector('polyline');
      if (poly) {
        const pts = poly.getAttribute('points').trim().split(/\s+/).map((s) => s.split(',').map(Number));
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const DUR = 2.4;
        poly.style.transitionDuration = `${DUR}s`;
        poly.style.transitionTimingFunction = 'linear';
        const trend = svg.querySelector('path.dr');
        if (trend) { trend.style.transitionDuration = '1.2s'; trend.style.transitionDelay = `${DUR + 0.2}s`; trend.style.transitionTimingFunction = 'ease-out'; }
        let k = 0;
        let at = 0.3;
        [...svg.children].filter((el) => el.classList.contains('fd')).forEach((el) => {
          if (el.tagName.toLowerCase() === 'circle') { at = (cum[k + 1] / cum[cum.length - 1]) * DUR; k++; }
          el.style.transitionDelay = `${at.toFixed(2)}s`;
          el.style.transitionDuration = '0.7s';
        });
      }
    }

    // ---- 3. pointer: tilt, light spot, structure parallax (fine pointers only)
    const tilt = cards.map((el) => ({ el, tx: 0, ty: 0, x: 0, y: 0, on: false }));
    const par = { tx: 0, ty: 0, x: 0, y: 0, on: false };
    let raf = 0;
    const loop = () => {
      raf = 0;
      let busy = false;
      for (const s of tilt) {
        s.x = lerp(s.x, s.tx, 0.12); s.y = lerp(s.y, s.ty, 0.12);
        const ang = Math.hypot(s.x, s.y);
        if (ang < 0.01 && !s.on) { if (s.el.style.rotate) { s.el.style.rotate = ''; s.el.classList.remove('is-tilt'); } continue; }
        busy = true;
        s.el.style.rotate = `${s.x.toFixed(3)} ${s.y.toFixed(3)} 0 ${ang.toFixed(3)}deg`;
      }
      if (svg) {
        par.x = lerp(par.x, par.tx, 0.08); par.y = lerp(par.y, par.ty, 0.08);
        if (Math.abs(par.x) > 0.002 || Math.abs(par.y) > 0.002 || par.on) {
          busy = true;
          svg.style.setProperty('--ex', par.x.toFixed(3));
          svg.style.setProperty('--ey', par.y.toFixed(3));
        }
      }
      if (busy) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    cleanups.push(() => { if (raf) cancelAnimationFrame(raf); });

    if (fine) {
      tilt.forEach((s) => {
        const { el } = s;
        const move = (e) => {
          const r = el.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          const max = Math.min(2.6, 760 / r.width); // big cards tilt less than small ones
          s.tx = -ny * max; s.ty = nx * max;
          el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
          el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
          if (el.classList.contains('m-struct')) { par.tx = nx; par.ty = ny; }
          kick();
        };
        const enter = () => { s.on = true; el.classList.add('is-tilt', 'is-hot'); if (el.classList.contains('m-struct')) par.on = true; kick(); };
        const leave = () => { s.on = false; s.tx = 0; s.ty = 0; el.classList.remove('is-hot'); if (el.classList.contains('m-struct')) { par.on = false; par.tx = 0; par.ty = 0; } kick(); };
        el.addEventListener('pointerenter', enter);
        el.addEventListener('pointermove', move, { passive: true });
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => { el.removeEventListener('pointerenter', enter); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.style.rotate = ''; });
      });
    }

    // ---- 4. particles (three.js, loaded once the grid is near the viewport)
    let stopParticles = () => {};
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      startParticles().then((stop) => { if (dead) stop?.(); else if (stop) stopParticles = stop; });
    }, { rootMargin: '300px 0px' });
    near.observe(grid);
    cleanups.push(() => near.disconnect());

    async function startParticles() {
      try {
        const mod = await import('./eduParticles.js');
        return dead ? null : mod.startParticles({ grid, svg, small, fine });
      } catch { return null; }
    }

    return () => {
      dead = true;
      stopParticles();
      cleanups.forEach((fn) => fn());
    };
  }, [ref]);
}
