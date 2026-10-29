import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useRichFx } from './useFx.js';

const Scene3D = lazy(() => import('./Scene3D.jsx'));
const SpheresScene = lazy(() => import('./SpheresScene.jsx'));

/**
 * Mounts the WebGL scene only on capable screens and only while it is on screen. The three.js chunk is not fetched
 * at all on phones / reduced-motion / data-saver, where the SVG backdrop is the whole effect.
 */
export default function LazyScene({ color, orb, count, kind, className = '' }) {
  const rich = useRichFx();
  const box = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!rich || !box.current) return undefined;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: '100px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [rich]);
  return (
    <div ref={box} className={`cx-scene ${className}`} aria-hidden="true">
      {rich && seen && <Suspense fallback={null}>{kind === 'spheres' ? <SpheresScene count={count} /> : <Scene3D color={color} orb={orb} count={count} />}</Suspense>}
    </div>
  );
}
