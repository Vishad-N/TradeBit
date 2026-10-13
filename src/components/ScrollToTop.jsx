import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// New page -> top. A link with a hash (e.g. /1-percent-club#guarantee) -> that section once the page has rendered.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let raf;
    // The target may mount a frame or two after the route changes (lazy pages), so retry briefly.
    const seek = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'start' });
      else if (tries++ < 20) raf = requestAnimationFrame(seek);
      else window.scrollTo(0, 0);
    };
    raf = requestAnimationFrame(seek);
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  return null;
}
