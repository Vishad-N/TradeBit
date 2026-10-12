import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LiquidGlassCarousel from '../components/LiquidGlassCarousel.tsx';
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

// Phone layout: the WebGL glass carousel is a poor fit for a small touch screen, so phones get a native one.
// A featured photo, then a two-column grid whose second column is nudged down; tapping opens a swipeable viewer.
function PhoneGallery({ items }) {
  const [open, setOpen] = useState(null); // index of the photo in the viewer, or null
  const touch = useRef(null);
  const n = items.length;

  const step = useCallback(d => setOpen(i => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    if (open === null) return;
    const onKey = e => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind the viewer must not scroll
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, step]);

  const [feature, ...rest] = items;
  return (
    <>
      <div className="gp">
        {feature && (
          <button type="button" className="gp-item gp-feature" onClick={() => setOpen(0)} aria-label="Open photo 1">
            <img src={feature.src} alt={feature.alt} />
            <span className="gp-tag">01</span>
          </button>
        )}
        <div className="gp-grid">
          {rest.map((it, i) => (
            <button key={it.src} type="button" className="gp-item" onClick={() => setOpen(i + 1)} aria-label={`Open photo ${i + 2}`}>
              <img src={it.src} alt={it.alt} loading="lazy" decoding="async" />
              <span className="gp-tag">{String(i + 2).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <div
          className="gp-view"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={e => e.target === e.currentTarget && setOpen(null)}
          onTouchStart={e => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            touch.current = null;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          }}
        >
          <button type="button" className="gp-x" aria-label="Close viewer" onClick={() => setOpen(null)}>✕</button>
          <img key={items[open].src} src={items[open].src} alt={items[open].alt} />
          <div className="gp-nav">
            <button type="button" aria-label="Previous photo" onClick={() => step(-1)}>←</button>
            <span>{open + 1} / {n}</span>
            <button type="button" aria-label="Next photo" onClick={() => step(1)}>→</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Gallery() {
  const { loading, images, min } = useGalleryImages();
  const [failed, setFailed] = useState(false);
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
      <span className="label">Gallery</span>
      <h1 id="gal-t" className="h-l gal-title">Moments &amp; Places</h1>
      <p className="gal-lead">{narrow ? 'Tap a photo to open it, then swipe to browse.' : 'Drag to explore. Click a photo to open it, and click again (or press Esc) to close.'}</p>

      <div className={`gal-stage${narrow ? ' is-phone' : ''}`}>
        {loading ? (
          <div className="gal-loading" aria-hidden="true" />
        ) : narrow ? (
          <PhoneGallery items={items} />
        ) : failed ? (
          <ul className="gal-grid">
            {items.map(i => <li key={i.src}><img src={i.src} alt={i.alt} loading="lazy" /></li>)}
          </ul>
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
            onError={() => setFailed(true)}
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

      {/* The canvas is not readable by assistive tech, so the photos are also listed here. */}
      <ul className="sr-only">
        {items.map(i => <li key={i.src}>{i.alt}</li>)}
      </ul>
    </section>
  );
}
