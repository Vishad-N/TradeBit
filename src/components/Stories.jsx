import { useCallback, useEffect, useRef, useState } from 'react';
import { face } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion } from '../hooks/motion.js';
import { API_URL } from '../services/api.js';
import { parseVideo } from '../lib/video.js';
import Disclaimer from './Disclaimer.jsx';

// Built-in sample content. It is shown until the admin adds written reviews / a video story
// (Admin -> Testimonials), so the section never goes blank.
const SAMPLE_REVIEWS = [
  { id: 's1', quote: 'For the first time, I understood why I was taking a trade — and that changed how I approach the entire market.', highlight: 'why', name: 'Rohan Kulkarni', role: 'Software Engineer · Pune · Student since 2024', rating: 5 },
  { id: 's2', quote: 'The risk module changed everything. I size positions with a formula now, not a feeling.', name: 'Ananya Shah', role: 'Chartered Accountant · Mumbai', rating: 5 },
  { id: 's3', quote: 'Journaling every trade showed me my real mistakes. The weekly clinics keep me consistent.', name: 'Meera Iyer', role: 'Doctor · Chennai', rating: 5 },
];
const SAMPLE_VIDEO = { id: 'v-sample', quote: 'I stopped overtrading.', name: 'Vikram Rao', role: 'Business Owner · Bengaluru', duration: '3:12', videoUrl: null };

const SLOTS = 3;         // written reviews on screen at once
const ROTATE_MS = 7000;  // time each set stays up
const OUT_MS = 460;      // exit cascade before the next set arrives
const pad = n => String(n).padStart(2, '0');

// Organic testimonial shape with topographic inner contours.
function Shape({ className, contours }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: contours }, (_, k) => <i key={k} style={{ inset: (k + 1) * 30 }} />)}
    </div>
  );
}

const Face = ({ n }) => <span className="face" dangerouslySetInnerHTML={html(face(n % 3))} />;

function Quote({ review }) {
  const { quote, highlight } = review;
  const at = highlight ? quote.indexOf(highlight) : -1;
  return (
    <blockquote className={quote.length > 150 ? 'is-long' : undefined}>
      “{at < 0 ? quote : <>{quote.slice(0, at)}<em>{highlight}</em>{quote.slice(at + highlight.length)}</>}”
    </blockquote>
  );
}

const CARD_CLASS = ['t-main', 't-s t-2', 't-s t-3'];

// Written reviews + the video story come from the API (managed in the admin area).
function useTestimonials() {
  const [state, setState] = useState({ reviews: SAMPLE_REVIEWS, video: SAMPLE_VIDEO });
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API_URL}/testimonials`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => setState({
        reviews: data.reviews?.length ? data.reviews : SAMPLE_REVIEWS,
        video: data.video || SAMPLE_VIDEO,
      }))
      .catch(() => { /* keep the sample content */ })
      .finally(() => clearTimeout(timer));
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, []);
  return state;
}

function StoryVideoModal({ story, onClose }) {
  const closeRef = useRef(null);
  const media = story ? parseVideo(story.videoUrl) : null;

  useEffect(() => {
    if (!story) return;
    const opener = document.activeElement;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [story, onClose]);

  return (
    <div className={story ? 'modal open' : 'modal'} role="dialog" aria-modal="true" aria-label={story ? `Video story from ${story.name}` : 'Video story'} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box is-media">
        <button ref={closeRef} type="button" className="modal-x" aria-label="Close video" onClick={onClose}>✕</button>
        {/* Rendered only while open, so closing the dialog also stops playback. */}
        {story && media?.type === 'embed' && <iframe src={media.src} title={`Video story from ${story.name}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
        {story && media?.type === 'file' && <video src={media.src} controls autoPlay playsInline />}
      </div>
    </div>
  );
}

export default function Stories({ onPlayVideo }) {
  const { reviews, video } = useTestimonials();
  const n = reviews.length;
  const rotating = n > SLOTS;

  const [start, setStart] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [everMoved, setEverMoved] = useState(false);
  const [hold, setHold] = useState(false);     // pointer / keyboard focus is inside the stage
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(null); // video story open in the modal
  const rootRef = useRef(null);
  const busy = useRef(false);
  const timers = useRef([]);
  const reduce = useRef(prefersReducedMotion());

  // A new review list may be shorter than the current offset.
  useEffect(() => { setStart(s => (n ? s % n : 0)); }, [n]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: .25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Outgoing cards lift and fade in a short cascade, then the next set arrives and rises in with the same stagger.
  const go = useCallback((delta) => {
    if (busy.current || !rotating) return;
    busy.current = true;
    const swap = () => {
      setStart(s => (s + delta + n) % n);
      setEverMoved(true);
      setLeaving(false);
      timers.current.push(setTimeout(() => { busy.current = false; }, 900));
    };
    if (reduce.current) return swap();
    setLeaving(true);
    timers.current.push(setTimeout(swap, OUT_MS));
  }, [rotating, n]);

  const auto = rotating && inView && !hold && !reduce.current;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => go(1), ROTATE_MS);
    return () => clearTimeout(t);
  }, [auto, start, go]);

  const shown = Math.min(SLOTS, n);
  const visible = Array.from({ length: shown }, (_, i) => reviews[(start + i) % n]);
  const last = ((start + shown - 1) % n) + 1;

  const openVideo = () => {
    if (!video.videoUrl) return onPlayVideo?.(); // sample card: the site's overview dialog
    if (parseVideo(video.videoUrl)) setPlaying(video);
    else window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="stories" id="stories" aria-labelledby="st-t" ref={rootRef}>
      <div className="wrap">
        <div className="stories-head">
          <div>
            <span className="label rv">Student Stories</span>
            <h2 id="st-t" className="h-l split"><span className="ln"><span>Clarity, In Their</span></span><span className="ln"><span>Own Words.</span></span></h2>
          </div>
          <div className="score rv d2"><b>4.8</b><div><div className="stars" aria-label="4.8 out of 5 stars">★★★★★</div><span>from 3,200+ verified reviews</span></div></div>
        </div>

        <div
          className="st-stage"
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHold(false); }}
        >
          <div className={`comp${everMoved ? ' is-rotating' : ''}`}>
            <Shape className="shape s-a" contours={6} />
            <Shape className="shape s-b" contours={5} />
            <div className="shape s-c" aria-hidden="true"></div>
            <span className="note n1" aria-hidden="true">Process &gt; prediction</span>

            {visible.map((r, i) => (
              <figure key={i} className={`tst ${CARD_CLASS[i]} rv${i ? ' d1' : ''}${leaving ? ' is-out' : ''}`} style={{ '--slot': i }}>
                {/* display:contents wrapper: remounting it replays the entrance without touching the card shell. */}
                <div className="tst-body" key={`${start}-${i}`}>
                  <div className="stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  <Quote review={r} />
                  <figcaption className="who"><Face n={(start + i) % n} /><div><b>{r.name}</b><span>{r.role}</span></div></figcaption>
                </div>
              </figure>
            ))}

            <button className="tst t-vid rv d2" type="button" onClick={openVideo} aria-label={`Play video story from ${video.name}`}>
              <svg className="bg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#DCE8C0" strokeOpacity=".1"><ellipse cx="200" cy="330" rx="240" ry="190"/><ellipse cx="200" cy="330" rx="200" ry="150"/><ellipse cx="200" cy="330" rx="160" ry="110"/></g><ellipse cx="200" cy="180" rx="44" ry="52" fill="#DCE8C0" fillOpacity=".08"/><path d="M110 320 C120 250 160 236 200 234 C240 236 280 250 290 320Z" fill="#DCE8C0" fillOpacity=".08"/></svg>
              <span className="meta">Video story{video.duration ? ` · ${video.duration}` : ''}</span>
              <span className="play"><svg width="18" height="18" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg></span>
              <span><b>“{video.quote}”</b><small>{[video.name, video.role].filter(Boolean).join(' · ')}</small></span>
            </button>
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
      <StoryVideoModal story={playing} onClose={() => setPlaying(null)} />
    </section>
  );
}
