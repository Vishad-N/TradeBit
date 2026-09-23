import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './motion.js';

// Everything that depends on scroll position: solid nav, active nav link,
// parallax on [data-speed] elements, and the mobile sticky CTA.
export function useScrollState(linkHrefs, menuOpen) {
  const [state, setState] = useState({ solid: false, activeHref: null, showCta: false });
  const menuOpenRef = useRef(menuOpen);
  const update = useRef(() => {});

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const hero = document.querySelector('.hero');
    const offer = document.getElementById('offer');
    const fin = document.querySelector('.final');
    const para = [...document.querySelectorAll('[data-speed]')];

    const onScroll = () => {
      const vh = window.innerHeight;
      let activeHref = null;
      linkHrefs.forEach(href => {
        const r = document.querySelector(href)?.getBoundingClientRect();
        if (r && r.top < vh * .45 && r.bottom > vh * .45) activeHref = href;
      });

      if (!reduce && window.innerWidth > 1024) {
        para.forEach(el => {
          const r = el.getBoundingClientRect();
          const v = Math.max(-36, Math.min(36, (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed)));
          el.style.transform = `translate3d(0,${v}px,0)`;
        });
      } else {
        para.forEach(el => { el.style.transform = ''; });
      }

      const o = offer.getBoundingClientRect(), f = fin.getBoundingClientRect();
      const showCta = hero.getBoundingClientRect().bottom < vh * .35
        && !(o.top < vh && o.bottom > 0) && !(f.top < vh * .8) && !menuOpenRef.current;

      setState(prev => (prev.solid === window.scrollY > 40 && prev.activeHref === activeHref && prev.showCta === showCta)
        ? prev
        : { solid: window.scrollY > 40, activeHref, showCta });
    };
    update.current = onScroll;

    let ticking = false;
    const onScrollThrottled = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; onScroll(); });
    };
    window.addEventListener('scroll', onScrollThrottled, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScrollThrottled);
      window.removeEventListener('resize', onScroll);
    };
  }, [linkHrefs]);

  // The sticky CTA hides while the mobile menu is open.
  useEffect(() => {
    menuOpenRef.current = menuOpen;
    update.current();
  }, [menuOpen]);

  return state;
}
