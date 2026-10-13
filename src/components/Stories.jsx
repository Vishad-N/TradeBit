import { useCallback, useEffect, useRef, useState } from 'react';
import { face } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion } from '../hooks/motion.js';
import { API_URL } from '../services/api.js';
import Disclaimer from './Disclaimer.jsx';

// Built-in reviews. Reviews added in Admin -> Testimonials come first; these only top the list up, so the
// section never goes blank.
const SAMPLE_REVIEWS = [
  {
    id: 'r-akash',
    quote: 'Satyendra Kushwaha Sir is an exceptional mentor who has transformed my trading knowledge, discipline, patience, and mindset. His honest, practical guidance makes complex concepts easy to understand and helps me grow both as a trader and as a person. I’m truly grateful to have him as my mentor and highly recommend him to anyone serious about learning trading the right way. 🙏🏼❤️',
    name: 'Akash Wagadre',
    role: 'Mumbai, India',
    rating: 5,
    photo: '/reviews/akash-wagadre.webp',
  },
  {
    id: 'r-ganesan',
    quote: 'My 2–3 years of trading struggle and fear completely changed after following Satyendra Kushwaha Sir. His mindset, sniper entries, trade trailing, stop-loss placement, and risk-reward management have transformed my trading journey. His biggest quality is that he shares his valuable knowledge completely free, teaching genuinely from the heart. Today, I have gained confidence, improved my understanding, and started seeing consistent, profitable results. Thank you so much, Sir, for your priceless guidance. Hats off to you! May God bless you always. 🙏🏼❤️',
    name: 'Ganesan Gounder',
    role: 'Pune, India',
    rating: 5,
    photo: '/reviews/ganesan-gounder.webp',
  },
  {
    id: 'r-prince',
    quote: 'I wanted to properly thank you for everything you’ve taught me. The accuracy of your levels still amazes me. Price reacts exactly where you mark it, and it has changed the way I read charts. The biggest thing I’ve learned from you is discipline: respecting the stop loss, taking only good risk-to-reward trades, and trailing to full target instead of closing early out of fear. You made me actually follow these, not just know them. Your calm mindset inspires me. And you teach all of this for free, without hiding anything, which is very rare in this market. Thank you, Sir. I’m truly grateful to have you as my mentor 🙏❤️',
    name: 'Prince Pal',
    role: 'Gurugram, India',
    rating: 5,
    photo: '/reviews/prince-pal.webp',
  },
  { id: 's1', quote: 'For the first time, I understood why I was taking a trade — and that changed how I approach the entire market.', highlight: 'why', name: 'Rohan Kulkarni', role: 'Software Engineer · Pune · Student since 2024', rating: 5 },
  { id: 's2', quote: 'The risk module changed everything. I size positions with a formula now, not a feeling.', name: 'Ananya Shah', role: 'Chartered Accountant · Mumbai', rating: 5 },
  { id: 's3', quote: 'Journaling every trade showed me my real mistakes. The weekly clinics keep me consistent.', name: 'Meera Iyer', role: 'Doctor · Chennai', rating: 5 },
];
const MIN_REVIEWS = 3;
const withTopUp = list => {
  if (list.length >= MIN_REVIEWS) return list;
  const have = new Set(list.map(r => r.name));
  return [...list, ...SAMPLE_REVIEWS.filter(r => !have.has(r.name))].slice(0, Math.max(MIN_REVIEWS, list.length));
};

const SLOTS = 3;         // review cards on screen at once
const ROTATE_MS = 7000;  // time each set stays up
const OUT_MS = 460;      // exit cascade before the next set arrives
const CLAMP_AT = 230;    // reviews longer than this are clamped to a few lines, with "Read more"
const pad = n => String(n).padStart(2, '0');
const TONES = ['dark', 'pale', 'light']; // card colour by slot: one charcoal, one pale lime, one off-white

// A real photo when the review has one, otherwise the neutral generated avatar.
const Face = ({ n, photo }) => (photo
  ? <span className="face has-photo"><img src={photo} alt="" loading="lazy" decoding="async" /></span>
  : <span className="face" dangerouslySetInnerHTML={html(face(n % 3))} />);

// Written reviews come from the API (managed in the admin area); the built-in ones top the list up.
function useReviews() {
  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API_URL}/testimonials`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => setReviews(withTopUp((data.reviews || []).map(r => ({ ...r, photo: r.photo ? `${API_URL}${r.photo}` : null })))))
      .catch(() => { /* keep the built-in reviews */ })
      .finally(() => clearTimeout(timer));
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, []);
  return reviews;
}

function ReviewCard({ review, tone, slot, index, leaving, expanded, onToggle }) {
  const long = review.quote.length > CLAMP_AT;
  const rating = review.rating || 5;
  return (
    <article className={`st-card st-${tone}${leaving ? ' is-out' : ''}`} style={{ '--slot': slot }}>
      {/* Remounting this wrapper replays the entrance; the card shell itself never moves. */}
      <div className="st-in" key={`${review.id || review.name}-${index}`}>
        <div className="st-top">
          <span className="st-mark" aria-hidden="true">“</span>
          <div className="stars" aria-label={`${rating} out of 5 stars`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</div>
        </div>
        <blockquote className={long && !expanded ? 'is-clamped' : undefined}>{review.quote}</blockquote>
        {long && (
          <button type="button" className="st-more" aria-expanded={expanded} onClick={onToggle}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <div className="st-who">
          <Face n={index} photo={review.photo} />
          <div><b>{review.name}</b>{review.role && <span>{review.role}</span>}</div>
        </div>
      </div>
    </article>
  );
}

export default function Stories() {
  const reviews = useReviews();
  const n = reviews.length;
  const rotating = n > SLOTS;

  const [start, setStart] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [hold, setHold] = useState(false);       // pointer / keyboard focus is inside the stage
  const [inView, setInView] = useState(false);
  const [open, setOpen] = useState(null);         // the expanded review's key
  const rootRef = useRef(null);
  const busy = useRef(false);
  const timers = useRef([]);
  const reduce = useRef(prefersReducedMotion());

  useEffect(() => { setStart(s => (n ? s % n : 0)); }, [n]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: .25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Outgoing cards lift and fade in a short cascade, then the next set rises in with the same stagger.
  const go = useCallback((delta) => {
    if (busy.current || !rotating) return;
    busy.current = true;
    const swap = () => {
      setStart(s => (s + delta + n) % n);
      setOpen(null);
      setLeaving(false);
      timers.current.push(setTimeout(() => { busy.current = false; }, 900));
    };
    if (reduce.current) return swap();
    setLeaving(true);
    timers.current.push(setTimeout(swap, OUT_MS));
  }, [rotating, n]);

  // A card the visitor opened stays put until they close it or move on.
  const auto = rotating && inView && !hold && open === null && !reduce.current;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => go(1), ROTATE_MS);
    return () => clearTimeout(t);
  }, [auto, start, go]);

  const shown = Math.min(SLOTS, n);
  const visible = Array.from({ length: shown }, (_, i) => ({ review: reviews[(start + i) % n], index: (start + i) % n }));
  const last = ((start + shown - 1) % n) + 1;

  return (
    <section className="stories" id="stories" aria-labelledby="st-t" ref={rootRef}>
      <div className="wrap">
        <div className="stories-head">
          <div>
            <span className="label rv">Student Stories</span>
            <h2 id="st-t" className="h-l split"><span className="ln"><span>Clarity, In Their</span></span><span className="ln"><span>Own Words.</span></span></h2>
          </div>
          <div className="score rv d2"><b>4.9</b><div><div className="stars" aria-label="4.9 out of 5 stars">★★★★★</div><span>from 3,200+ verified reviews</span></div></div>
        </div>

        <div
          className="st-stage"
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHold(false); }}
        >
          <div className="st-grid rv">
            {visible.map(({ review, index }, slot) => {
              const key = review.id || review.name;
              return (
                <ReviewCard
                  key={slot}
                  review={review}
                  tone={TONES[slot % TONES.length]}
                  slot={slot}
                  index={index}
                  leaving={leaving}
                  expanded={open === key}
                  onToggle={() => setOpen(o => (o === key ? null : key))}
                />
              );
            })}
          </div>

          {rotating && (
            <div className="st-ctrl rv d2" role="group" aria-label="Browse student reviews">
              <button type="button" className="st-btn" aria-label="Previous reviews" onClick={() => go(-1)}>←</button>
              <span className="st-count">{pad(start + 1)}–{pad(last)} <em>/ {pad(n)}</em></span>
              <span className="st-prog" aria-hidden="true">
                <i key={`${start}-${auto}`} className={auto ? 'run' : undefined} style={{ animationDuration: `${ROTATE_MS}ms` }} />
              </span>
              <button type="button" className="st-btn" aria-label="Next reviews" onClick={() => go(1)}>→</button>
            </div>
          )}
        </div>

        <p className="stories-foot">Testimonials describe individual learning experiences and are not indicative of future performance or trading results.</p>
        <Disclaimer className="stories-foot" />
      </div>
    </section>
  );
}
