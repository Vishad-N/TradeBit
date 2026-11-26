import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SETTLE_MS = 8000; // longer than the landing page waits for any API request before giving up
const USER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

// New page -> top. A link with a hash (e.g. /1-percent-club#guarantee) -> that section once the page has rendered.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    const samePage = lastPath.current === pathname;
    lastPath.current = pathname;
    if (!hash) { window.scrollTo(0, 0); return undefined; }

    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let raf;
    let observer;
    let timer;
    const stopFollowing = () => {
      observer?.disconnect();
      clearTimeout(timer);
      USER_INPUT.forEach((type) => window.removeEventListener(type, stopFollowing));
    };

    // Sections above the target can still change height after the jump (data arriving from the API), which would
    // leave the visitor somewhere else. Stay on the target while the page settles, until the visitor takes over.
    const follow = (el) => {
      const position = () => Math.round(el.getBoundingClientRect().top + window.scrollY);
      let last = position();
      observer = new ResizeObserver(() => {
        const next = position();
        if (next === last) return;
        last = next;
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      observer.observe(document.body);
      timer = setTimeout(stopFollowing, SETTLE_MS);
      USER_INPUT.forEach((type) => window.addEventListener(type, stopFollowing, { passive: true }));
    };

    // The target may mount a frame or two after the route changes (lazy pages), so retry briefly.
    const seek = () => {
      const el = document.getElementById(id);
      if (el) {
        // A link within the page glides (CSS scroll-behavior); arriving on a page jumps straight to the section.
        el.scrollIntoView({ block: 'start', behavior: samePage ? 'auto' : 'instant' });
        follow(el);
      } else if (tries++ < 20) raf = requestAnimationFrame(seek);
      else window.scrollTo(0, 0);
    };
    raf = requestAnimationFrame(seek);
    return () => {
      cancelAnimationFrame(raf);
      stopFollowing();
    };
  }, [pathname, hash]);

  return null;
}
