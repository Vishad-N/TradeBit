import { useEffect, useState } from 'react';

// Reads a px-valued CSS custom property from :root; media queries change these,
// so the value is re-read on resize.
function useRootPx(name, fallback = 100) {
  const read = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;
  const [px, setPx] = useState(read);
  useEffect(() => {
    const onResize = () => setPx(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [name]);
  return px;
}

// Capsule / stage rings: nested borders that share the section's own top radius.
export function CapRings({ className, count, step, radiusVar }) {
  const rad = useRootPx(radiusVar);
  const rings = [];
  for (let k = 1; k <= count; k++) {
    const i = k * step, r = Math.max(0, rad - i * .7);
    rings.push(<i key={k} style={{ left: i, right: i, top: i, bottom: -20, borderRadius: `${r}px ${r}px 0 0` }} />);
  }
  return <div className={className} aria-hidden="true">{rings}</div>;
}

// Rings following the live section's lens-shaped outline.
export function LensRings() {
  const rings = [];
  for (let k = 1; k <= 6; k++) {
    const i = k * 26;
    rings.push(<i key={k} style={{ inset: i, borderRadius: `50% / calc(var(--r-lens) - ${i * .6}px)` }} />);
  }
  return <div className="lens-rings" aria-hidden="true">{rings}</div>;
}
