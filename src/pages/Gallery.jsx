import { useEffect, useMemo, useRef, useState } from 'react';
import LiquidGlassCarousel from '../components/LiquidGlassCarousel.tsx';
import { prefersReducedMotion } from '../hooks/motion.js';
import { API_URL } from '../services/api.js';
import '../styles/gallery.css';

// Built-in sample photos of Dubai (Unsplash, see public/gallery/CREDITS.txt). They fill the carousel until the
// admin has uploaded MIN images of their own (Admin -> Gallery), so the page always looks complete.
const SAMPLES = Array.from({ length: 15 }, (_, i) => ({
  src: `/gallery/dubai-${String(i + 1).padStart(2, '0')}.jpg`,
  alt: 'Dubai skyline and landmarks',
}));
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

export default function Gallery() {
  const { loading, images, min } = useGalleryImages();
  const [failed, setFailed] = useState(false);
  const carousel = useRef(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  // Your own images first; sample photos only top the list up to the minimum.
  const items = useMemo(() => (images.length >= min ? images : [...images, ...SAMPLES.slice(0, min - images.length)]), [images, min]);

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
      <p className="gal-lead">Drag to explore. Click a photo to open it, and click again (or press Esc) to close.</p>

      <div className="gal-stage">
        {loading ? (
          <div className="gal-loading" aria-hidden="true" />
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

      {!loading && !failed && (
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
