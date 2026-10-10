import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LEARN } from '../config/learn.js';
import { GoldAsset, SolanaAsset } from './FloatingAssets.jsx';
import '../styles/ways.css';

const Ar = () => <span className="ar">→</span>;

// ---- 01 · the real playlist embed (no autoplay), or a designed preview until the playlist id is set ----
function PlaylistPreview() {
  if (LEARN.youtubeEmbedUrl) {
    return (
      <div className="w-media w-yt">
        <iframe
          src={LEARN.youtubeEmbedUrl}
          title="Free trading resources: YouTube playlist"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="w-media w-ph" role="img" aria-label="Preview of the free YouTube playlist">
      <div className="ph-main"><i className="ph-play" /></div>
      <ol className="ph-queue" aria-hidden="true">
        {[1, 2, 3].map(n => <li key={n}><b>{n}</b><i /></li>)}
      </ol>
    </div>
  );
}

// ---- 02 · a real course screenshot when supplied; otherwise a line illustration. Always links to Classplus. ----
function CourseArt() {
  return (
    <svg viewBox="0 0 400 225" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect x="24" y="22" width="228" height="128" rx="14" stroke="#151814" strokeWidth="1.6" />
      <circle cx="138" cy="86" r="22" fill="#151814" />
      <path d="M131 75 L152 86 L131 97Z" fill="#B8D83D" />
      <path d="M24 176 H252" stroke="#151814" strokeOpacity=".15" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 176 H124" stroke="#151814" strokeWidth="4" strokeLinecap="round" />
      <g stroke="#151814" strokeOpacity=".55" strokeWidth="1.4">
        <rect x="274" y="22" width="102" height="48" rx="10" />
        <rect x="274" y="82" width="102" height="48" rx="10" />
        <rect x="274" y="142" width="102" height="48" rx="10" />
      </g>
      <g stroke="#151814" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round"><path d="M290 40 H350 M290 54 H326" /><path d="M290 100 H350 M290 114 H330" /><path d="M290 160 H350 M290 174 H322" /></g>
      <circle cx="361" cy="46" r="5" fill="#B8D83D" />
    </svg>
  );
}

function CoursePreview() {
  const media = (
    <div className="w-media w-course">
      {LEARN.classplusPreviewUrl
        ? <img src={LEARN.classplusPreviewUrl} alt="Preview of the complete course on Classplus" loading="lazy" decoding="async" />
        : <CourseArt />}
      <ul className="w-tags" aria-label="What the course includes"><li>Course</li><li>Lectures</li><li>Structured learning</li></ul>
    </div>
  );
  return LEARN.classplusUrl
    ? <a className="w-media-link" href={LEARN.classplusUrl} target="_blank" rel="noopener noreferrer" aria-label="Open the course on Classplus">{media}</a>
    : media;
}

// ---- 03 · the most exclusive path: two arches (mentor + you) joined by the site's orbit line ----
function MentorArt() {
  return (
    <div className="w-media w-mentor" aria-hidden="true">
      <svg viewBox="0 0 400 225" fill="none" preserveAspectRatio="xMidYMid slice">
        <path d="M70 225 V118 C70 70 108 36 156 36 C204 36 242 70 242 118 V225" stroke="#DCE8C0" strokeOpacity=".4" strokeWidth="1.5" />
        <path d="M104 225 V132 C104 96 132 70 168 70 C204 70 232 96 232 132 V225" stroke="#DCE8C0" strokeOpacity=".2" />
        <path d="M206 225 V150 C206 120 226 100 254 100 C282 100 302 120 302 150 V225Z" fill="#B8D83D" />
        <ellipse cx="200" cy="116" rx="176" ry="48" transform="rotate(-14 200 116)" stroke="#B8D83D" strokeWidth="1.4" />
        <circle cx="352" cy="86" r="5" fill="#B8D83D" />
      </svg>
    </div>
  );
}

export default function WaysToLearn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Mentorship: logged-out users go through the existing login/register, then land on the payment page.
  const apply = () => navigate(user ? '/mentorship' : '/login?next=/mentorship');

  const freeOn = Boolean(LEARN.youtubePlaylistUrl);
  const courseOn = Boolean(LEARN.classplusUrl);

  return (
    <section className="ways" id="ways" aria-labelledby="ways-t">
      <SolanaAsset />
      <GoldAsset />
      <svg className="ways-curve" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-20 360 C220 360 300 250 500 226 S800 92 1020 40" fill="none" stroke="#151814" strokeOpacity=".35" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="wrap">
        <div className="ways-head">
          <img className="ways-person" src="/mentors/ways.webp" alt="" width="640" height="1026" loading="lazy" decoding="async" />
          <span className="label rv">Ways To Learn</span>
          <h2 id="ways-t" className="h-l split"><span className="ln"><span>Choose The Path</span></span><span className="ln"><span>That Fits <span className="hl">You.</span></span></span></h2>
          <p className="ways-lead rv d1">Choose the learning path that fits you.</p>
          <ol className="ways-steps rv d2" aria-label="The learning path, from free to personal"><li>Free</li><li>Structured</li><li>Personal</li></ol>
        </div>

        <div className="ways-grid">
          {/* 01 — FREE */}
          <div className="wslot w1 rv">
          <article className="wcard">
            <header className="w-top"><span className="meta">01 / Free</span><span className="w-num" aria-hidden="true">01</span></header>
            <PlaylistPreview />
            <h3>Free Resources</h3>
            <p className="w-head">Learn before you commit.</p>
            <p className="w-desc">Explore the client's free educational content and trading resources through their YouTube playlist.</p>
            <ul className="w-facts"><li>Free to watch</li><li>YouTube playlist</li><li>Self-paced</li></ul>
            <a className={`btn btn-dark${freeOn ? '' : ' is-off'}`} href={freeOn ? LEARN.youtubePlaylistUrl : undefined} aria-disabled={!freeOn || undefined} target="_blank" rel="noopener noreferrer">
              Explore Free Resources <Ar />
            </a>
          </article>
          </div>

          {/* 02 — COURSE */}
          <div className="wslot w2 rv d1">
          <article className="wcard">
            <header className="w-top"><span className="meta">02 / Course</span><span className="w-num" aria-hidden="true">02</span></header>
            <CoursePreview />
            <h3>Complete Course</h3>
            <p className="w-head">Learn the full framework.</p>
            <p className="w-desc">Access the client's complete structured trading course through Classplus.</p>
            <ul className="w-facts"><li>Hosted on Classplus</li><li>Full framework</li><li>Structured lectures</li></ul>
            <a className={`btn btn-dark${courseOn ? '' : ' is-off'}`} href={courseOn ? LEARN.classplusUrl : undefined} aria-disabled={!courseOn || undefined} target="_blank" rel="noopener noreferrer">
              Explore The Course <Ar />
            </a>
          </article>
          </div>

          {/* 03 — PRIVATE */}
          <div className="wslot w3 rv d2">
          <article className="wcard">
            <header className="w-top"><span className="meta">03 / Private</span><span className="w-num" aria-hidden="true">03</span></header>
            <MentorArt />
            <h3>1:1 Mentorship</h3>
            <p className="w-head">Learn directly with the mentor.</p>
            <p className="w-desc">Get personalized trading guidance and private 1:1 mentorship managed through Telegram.</p>
            <ul className="w-facts"><li>Private 1:1 guidance</li><li>Managed on Telegram</li><li>Paid in USDT (TRC20)</li></ul>
            <button type="button" className="btn btn-lime" onClick={apply}>Apply For 1:1 Mentorship <Ar /></button>
          </article>
          </div>
        </div>
      </div>
    </section>
  );
}
