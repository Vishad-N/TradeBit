import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LiquidGlassCarousel from '../components/LiquidGlassCarousel.tsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { prefersReducedMotion } from '../hooks/motion.js';
import { API_URL } from '../services/api.js';
import '../styles/gallery.css';

// Built-in photos: the TradeBit India photos (gg-01..09) first, then Dubai stock (Unsplash, see
// public/gallery/CREDITS.txt). They fill the carousel until the admin has uploaded MIN images of their own
// (Admin -> Gallery), so the page always looks complete.
const PHOTOS = Array.from({ length: 9 }, (_, i) => ({
  src: `/gallery/gg-${String(i + 1).padStart(2, '0')}.webp`,
  alt: `TradeBit India in Dubai, photo ${i + 1}`,
}));
const STOCK = Array.from({ length: 15 }, (_, i) => ({
  src: `/gallery/dubai-${String(i + 1).padStart(2, '0')}.jpg`,
  alt: 'Dubai skyline and landmarks',
}));
const SAMPLES = [...PHOTOS, ...STOCK];
const DEFAULT_MIN = 6;

function useGalleryImages() {
  const [state, setState] = useState({ loading: true, images: [], min: DEFAULT_MIN });
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API_URL}/gallery`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => setState({
        loading: false,
        min: d.min || DEFAULT_MIN,
        images: d.images.map(i => ({ src: `${API_URL}${i.image}`, alt: i.caption || 'Gallery photo' })),
      }))
      .catch(() => setState({ loading: false, images: [], min: DEFAULT_MIN }))
      .finally(() => clearTimeout(timer));
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, []);
  return state;
}

// Full-screen viewer shared by the phone grid and the no-WebGL strip: swipe / arrows / Esc, page scroll locked.
function PhotoViewer({ items, index, onClose, onStep }) {
  const touch = useRef(null);
  const n = items.length;

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind the viewer must not scroll
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, onStep]);

  return (
    <div
      className="gp-view"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={e => e.target === e.currentTarget && onClose()}
      onTouchStart={e => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) onStep(dx < 0 ? 1 : -1);
      }}
    >
      <button type="button" className="gp-x" aria-label="Close viewer" onClick={onClose}>✕</button>
      <img key={items[index].src} src={items[index].src} alt={items[index].alt} />
      <div className="gp-nav">
        <button type="button" aria-label="Previous photo" onClick={() => onStep(-1)}>←</button>
        <span>{index + 1} / {n}</span>
        <button type="button" aria-label="Next photo" onClick={() => onStep(1)}>→</button>
      </div>
    </div>
  );
}

// Viewer state in one place: which photo is open, and how to step through them.
function useViewer(n) {
  const [open, setOpen] = useState(null);
  const step = useCallback(d => setOpen(i => (i === null ? i : (i + d + n) % n)), [n]);
  const close = useCallback(() => setOpen(null), []);
  return { open, setOpen, step, close };
}

// Phone layout: the WebGL glass carousel is a poor fit for a small touch screen, so phones get a native one.
// A featured photo, then a two-column grid whose second column is nudged down; tapping opens a swipeable viewer.
function PhoneGallery({ items }) {
  const v = useViewer(items.length);
  const [feature, ...rest] = items;
  return (
    <>
      <div className="gp">
        {feature && (
          <button type="button" className="gp-item gp-feature" onClick={() => v.setOpen(0)} aria-label="Open photo 1">
            <img src={feature.src} alt={feature.alt} />
            <span className="gp-tag">01</span>
          </button>
        )}
        <div className="gp-grid">
          {rest.map((it, i) => (
            <button key={it.src} type="button" className="gp-item" onClick={() => v.setOpen(i + 1)} aria-label={`Open photo ${i + 2}`}>
              <img src={it.src} alt={it.alt} loading="lazy" decoding="async" />
              <span className="gp-tag">{String(i + 2).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </div>
      {v.open !== null && <PhotoViewer items={items} index={v.open} onClose={v.close} onStep={v.step} />}
    </>
  );
}

// Desktop fallback when the browser has WebGL switched off: the same curved path (photos rise into view from the
// right and sink away on the left) built from plain CSS transforms, so it needs no GPU context. Drag or use the
// arrows; click a photo to open it.
function CurvedStrip({ items }) {
  const scroller = useRef(null);
  const cards = useRef([]);
  const v = useViewer(items.length);
  const drag = useRef(null);
  const moved = useRef(false);

  // Place every card on the curve from its distance to the middle of the strip.
  const place = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
    const half = el.clientWidth / 2;
    cards.current.forEach(c => {
      if (!c) return;
      const r = c.getBoundingClientRect();
      const d = Math.max(-1.4, Math.min(1.4, (r.left + r.width / 2 - mid) / half));
      const a = Math.abs(d);
      const y = -Math.sign(d) * Math.pow(a, 2.2) * 150; // right side up, left side down
      c.style.transform = `translateY(${y.toFixed(1)}px) rotate(${(d * 5).toFixed(2)}deg) scale(${(1 - a * 0.07).toFixed(3)})`;
    });
  }, []);

  useEffect(() => {
    place();
    let raf = 0;
    const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    const el = scroller.current;
    el.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    return () => { el.removeEventListener('scroll', tick); window.removeEventListener('resize', tick); cancelAnimationFrame(raf); };
  }, [place, items]);

  const by = dir => scroller.current?.scrollBy({ left: dir * 340, behavior: 'smooth' });

  return (
    <div className="gs">
      {/* A glass lens drawn without WebGL: an SVG turbulence filter bends whatever scrolls beneath it. */}
      <svg className="gs-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="gs-glass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.007" numOctaves="1" seed="11" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="10" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="44" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div className="gs-stage">
      <div
        className="gs-scroll"
        ref={scroller}
        onPointerDown={e => { if (e.pointerType === 'mouse') { drag.current = { x: e.clientX, left: scroller.current.scrollLeft }; moved.current = false; } }}
        onPointerMove={e => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 4) moved.current = true;
          scroller.current.scrollLeft = drag.current.left - dx;
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
      >
        <ul className="gs-track">
          {items.map((it, i) => (
            <li key={it.src} ref={el => { cards.current[i] = el; }}>
              <button type="button" onClick={() => { if (!moved.current) v.setOpen(i); }} aria-label={`Open photo ${i + 1}`}>
                <img src={it.src} alt={it.alt} draggable="false" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="gs-lens" aria-hidden="true" />
      </div>
      <div className="gal-ctrl">
        <button type="button" className="gal-btn" onClick={() => by(-1)} aria-label="Scroll left">←</button>
        <span className="gal-count meta">{items.length} photos</span>
        <button type="button" className="gal-btn" onClick={() => by(1)} aria-label="Scroll right">→</button>
      </div>
      {v.open !== null && <PhotoViewer items={items} index={v.open} onClose={v.close} onStep={v.step} />}
    </div>
  );
}

export default function Gallery() {
  const { loading, images, min } = useGalleryImages();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumping this remounts the carousel (a fresh WebGL context)
  const carousel = useRef(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  // Your own images first; sample photos only top the list up to the minimum.
  const items = useMemo(() => {
    if (images.length >= min) return images;
    // Nothing uploaded yet: the nine TradeBit photos. A few uploads: top up to the minimum from the same list.
    return images.length === 0 ? PHOTOS : [...images, ...SAMPLES.slice(0, min - images.length)];
  }, [images, min]);

  // Phones get smaller cards so a few are always in view.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 700);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  return (
    <section className="gal" aria-labelledby="gal-t">
      <header className="gal-top">
        {/* Line art that ties the headline to the photo and carries the eye down into the gallery. */}
        <svg className="gal-link" viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="#151814" strokeOpacity=".1">
            <circle cx="930" cy="330" r="250" vectorEffect="non-scaling-stroke" />
            <circle cx="930" cy="330" r="330" vectorEffect="non-scaling-stroke" />
            <circle cx="930" cy="330" r="410" vectorEffect="non-scaling-stroke" />
          </g>
          <path className="gl-line" d="M70 612 H560 C690 612 700 470 760 470" fill="none" stroke="#B8D83D" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle className="gl-node" cx="760" cy="470" r="6" fill="#151814" stroke="#B8D83D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path className="gl-drop" d="M930 700 V760" fill="none" stroke="#151814" strokeOpacity=".5" strokeDasharray="3 7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="gal-hero">
          <span className="label">The 1% Club Lifestyle</span>
          <h1 id="gal-t" className="h-l gal-title">
            <span className="gal-t1">Dubai wasn't built on average mindsets.</span>
            <span className="gal-t2">The 1% Club isn't either.</span>
            <span className="gal-t3"><span className="hl">Elevate your vision.</span></span>
          </h1>
        </div>

        <figure className="gal-burj">
          <img src="/gallery/burj-khalifa.webp" alt="The Burj Khalifa rising into the night sky, Dubai" width="800" height="1200" decoding="async" />
        </figure>
      </header>
      <p className="gal-hint meta">{narrow ? 'Tap a photo to open it · swipe to browse' : 'Drag to explore · click a photo to open it · Esc to close'}</p>

      <div className={`gal-stage${narrow ? ' is-phone' : ''}${failed && !narrow ? ' is-fallback' : ''}`}>
        {loading ? (
          <div className="gal-loading" aria-hidden="true" />
        ) : narrow ? (
          <PhoneGallery items={items} />
        ) : failed ? (
          <>
            <CurvedStrip items={items} />
            <p className="gal-gpu-note" role="status">
              <strong>The glass effect needs hardware acceleration, and this browser has it turned off.</strong>{' '}
              Turn on &ldquo;Use graphics acceleration when available&rdquo; in your browser&rsquo;s System settings, restart the
              browser, then reload this page. You can check with <a href="https://get.webgl.org" target="_blank" rel="noopener noreferrer">get.webgl.org</a>.
            </p>
            <button type="button" className="gal-retry" onClick={() => { setFailed(false); setAttempt(a => a + 1); }}>
              Try the glass effect again
            </button>
          </>
        ) : (
          <LiquidGlassCarousel
            ref={carousel}
            items={items}
            background="#F3F4EF"
            sizeMode="same"
            cardWidth={narrow ? 210 : 320}
            cardHeight={narrow ? 320 : 440}
            gap={narrow ? 10 : 14}
            lens={{ shape: 'circle', width: narrow ? 0.7 : 0.5, height: 1, rotation: 65, dispersion: 11, ringColor: '#B8D83D' }}
            motion={{ sensitivity: 5, glide: 5, snap: true }}
            entry={{ enabled: !reduce, enterFrom: 'alternate' }}
            interaction={{ wheel: false, drag: true, clickToFocus: true }}
            curve={narrow ? 0.22 : 0.3}
            key={attempt}
            onError={() => {
              // One automatic retry (a context freed a moment ago may be available now) before falling back to the grid.
              if (attempt < 1) setTimeout(() => setAttempt(a => a + 1), 500);
              else setFailed(true);
            }}
          />
        )}
      </div>

      {!loading && !failed && !narrow && (
        <div className="gal-ctrl">
          <button type="button" className="gal-btn" onClick={() => carousel.current?.step(-1)} aria-label="Previous photo">←</button>
          <span className="gal-count meta">{items.length} photos</span>
          <button type="button" className="gal-btn" onClick={() => carousel.current?.step(1)} aria-label="Next photo">→</button>
        </div>
      )}

      {/* The story behind the photos, then the one action */}
      <section className="gal-story" aria-labelledby="gal-story-t">
        <div className="gal-story-head">
          <span className="label">From dream to reality</span>
          <h2 id="gal-story-t" className="h-m">This is the 1% Club lifestyle.</h2>
        </div>
        <div className="gal-story-body">
          <p>
            What you see here isn't just a collection of dream lifestyle pictures. It is the ultimate proof of what <b>high-probability
            trading</b> can build. From the skylines of Dubai to global horizons, these moments represent <b>freedom, consistency, and a
            vision achieved.</b>
          </p>
          <p className="gal-pull">I didn't start at the top, but master-level discipline got me here.</p>
          <p>
            At Trade Bit India, we don't just teach you how to analyze charts. We train you to completely rewrite your future. Take a look
            at what is possible when you stop gambling and start trading like a pro.
          </p>
        </div>
      </section>

      <section className="gal-cta" aria-labelledby="gal-cta-t">
        <div className="gal-cta-rings" aria-hidden="true"><i /><i /><i /></div>
        <h2 id="gal-cta-t" className="gal-cta-title">Your seat in the <span className="lime">1% Club</span> is waiting.</h2>
        <Link to="/1-percent-club" className="btn btn-lime">Claim Your Seat <span className="ar">→</span></Link>
      </section>

      <Disclaimer className="gal-disclaimer" />

      {/* The canvas is not readable by assistive tech, so the photos are also listed here. */}
      <ul className="sr-only">
        {items.map(i => <li key={i.src}>{i.alt}</li>)}
      </ul>
    </section>
  );
}
