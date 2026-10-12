import { useEffect, useState } from 'react';
import { API_URL } from '../services/api.js';
import Disclaimer from './Disclaimer.jsx';

// A slow, looping strip of profit screenshots just above the footer.
// Images are managed in Admin -> Profit Screenshots. If none are uploaded (or the API is unreachable), image
// files dropped into src/assets/profits/ are used instead. With neither, the section is not rendered, so no
// placeholder "results" are ever shown.
const files = import.meta.glob('../assets/profits/*.{png,jpg,jpeg,webp,avif}', { eager: true, query: '?url', import: 'default' });
const FOLDER_IMAGES = Object.entries(files).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([, url]) => ({ src: url, alt: '' }));

function useShots() {
  const [shots, setShots] = useState(null); // null until the API has answered, so the strip never swaps content
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API_URL}/profit-shots`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(list => setShots(list.length ? list.map(s => ({ src: `${API_URL}${s.image}`, alt: s.caption || '' })) : FOLDER_IMAGES))
      .catch(() => setShots(FOLDER_IMAGES))
      .finally(() => clearTimeout(timer));
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, []);
  return shots;
}

const MIN_PER_SET = 8; // repeat short lists so one set always covers the viewport
const SECONDS_PER_IMAGE = 4;

export default function ProfitMarquee() {
  const images = useShots();
  if (!images || images.length === 0) return null;

  const set = Array.from({ length: Math.max(1, Math.ceil(MIN_PER_SET / images.length)) }, () => images).flat();
  const duration = `${set.length * SECONDS_PER_IMAGE}s`;

  return (
    <section className="pmq" aria-label="Student profit screenshots">
      <div className="pmq-head">
        <span className="label">Student Results</span>
      </div>
      <div className="pmq-view">
        <ul className="pmq-track" style={{ '--pmq-dur': duration }}>
          {[0, 1].map(copy => set.map((img, i) => (
            // The second copy exists only for the seamless loop, so it is hidden from assistive tech.
            <li key={`${copy}-${i}`} aria-hidden={copy === 1 || undefined}>
              <img src={img.src} alt={copy === 0 ? (img.alt || 'Profit screenshot') : ''} loading="lazy" decoding="async" draggable="false" />
            </li>
          )))}
        </ul>
      </div>
      <p className="pmq-note">Screenshots show individual results and are not indicative of future performance.</p>
      <Disclaimer className="pmq-note" />
    </section>
  );
}
