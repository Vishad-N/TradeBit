import { useEffect } from 'react';
import Counter from '../components/Counter.jsx';
import { usePageReveal, prefersReducedMotion } from '../hooks/motion.js';
import { OPEN_CLUB_EVENT } from '../components/Nav.jsx';
import '../styles/club.css';

// Every "Register / Join" button reuses the existing 1% Club popup (ClubModal, mounted in the Nav).
const openClub = () => window.dispatchEvent(new Event(OPEN_CLUB_EVENT));

function JoinButton({ children = 'Join the 1% Club', className = 'btn btn-lime', ...rest }) {
  return <button type="button" className={className} onClick={openClub} {...rest}>{children} <span className="ar">→</span></button>;
}

/* ------------------------------------------------------------------ floating trading SVGs */
const Candles = () => (
  <svg viewBox="0 0 160 120" fill="none" aria-hidden="true">
    {[[14, 70, 30, 1], [40, 56, 38, 0], [66, 62, 26, 1], [92, 40, 44, 1], [118, 24, 52, 1], [144, 12, 40, 1]].map(([x, y, h, up], i) => (
      <g key={i} stroke={up ? '#B8D83D' : '#F3F4EF'} strokeOpacity={up ? 1 : .5}>
        <path d={`M${x} ${y - 10}V${y + h + 10}`} strokeWidth="1.5" />
        <rect x={x - 6} y={y} width="12" height={h} rx="2" fill={up ? '#B8D83D' : 'none'} fillOpacity={up ? .85 : 0} strokeWidth="1.5" />
      </g>
    ))}
  </svg>
);

const Structure = () => (
  <svg viewBox="0 0 200 110" fill="none" aria-hidden="true">
    <path d="M6 100 L40 62 L62 78 L104 34 L126 52 L190 8" stroke="#B8D83D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M62 78 L126 52" stroke="#F3F4EF" strokeOpacity=".4" strokeDasharray="3 5" />
    {[[40, 62, 'HH'], [104, 34, 'HH'], [62, 78, 'HL'], [126, 52, 'HL']].map(([x, y, t]) => (
      <g key={x + t}><circle cx={x} cy={y} r="4.5" fill="#151814" stroke="#B8D83D" strokeWidth="1.6" /><text x={x + 8} y={y - 8} fontSize="9" fill="#F3F4EF" fillOpacity=".75" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">{t}</text></g>
    ))}
  </svg>
);

const RiskReward = () => (
  <svg viewBox="0 0 150 120" fill="none" aria-hidden="true">
    <rect x="6" y="8" width="138" height="62" rx="8" fill="#B8D83D" fillOpacity=".16" stroke="#B8D83D" />
    <rect x="6" y="74" width="138" height="24" rx="8" fill="none" stroke="#F3F4EF" strokeOpacity=".45" strokeDasharray="4 4" />
    <path d="M6 70H144" stroke="#F3F4EF" strokeWidth="2" />
    <text x="16" y="34" fontSize="11" fill="#B8D83D" fontFamily="Space Grotesk, sans-serif" letterSpacing="2">TARGET +3R</text>
    <text x="16" y="92" fontSize="10" fill="#F3F4EF" fillOpacity=".7" fontFamily="Space Grotesk, sans-serif" letterSpacing="2">STOP −1R</text>
  </svg>
);

const Orbit = ({ lime = true }) => (
  <svg viewBox="0 0 400 400" fill="none" aria-hidden="true">
    <g stroke={lime ? '#B8D83D' : '#151814'}>
      <circle cx="200" cy="200" r="196" strokeOpacity=".12" />
      <circle cx="200" cy="200" r="150" strokeOpacity=".2" strokeDasharray="2 10" />
      <ellipse cx="200" cy="200" rx="190" ry="76" strokeOpacity=".55" transform="rotate(-20 200 200)" />
      <circle cx="372" cy="150" r="6" fill={lime ? '#B8D83D' : '#151814'} stroke="none" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ content */
const PILLARS = [
  ['High-probability, low-risk setups', 'The few trades worth taking, defined before you click. Precision over activity.', <path key="a" d="M4 17l5-5 4 3 7-8M16 7h4v4" />],
  ['Daily coaching + live sessions', 'Real-time guidance on real markets, not recorded theory you watch alone.', <><circle key="a" cx="12" cy="12" r="8" /><path key="b" d="M12 7v5l3 2" /></>],
  ['Risk management & psychology', 'The two things most courses ignore, and the two that decide whether you survive.', <path key="a" d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z" />],
  ['A proven institutional process', 'Context, structure, setup, risk, execution. One repeatable sequence.', <path key="a" d="M4 6h16M4 12h10M4 18h6" />],
  ['A community of elite traders', 'A high-performance room where standards are high and questions get answers.', <><circle key="a" cx="9" cy="9" r="3" /><circle key="b" cx="17" cy="10" r="2.500" /><path key="c" d="M3 19c.6-3.200 3-5 6-5s5.400 1.800 6 5M15 15c2.500 0 4.300 1.500 5 4" /></>],
  ['A path to funded accounts', 'Support continues until you are consistently profitable, not until the course ends.', <path key="a" d="M5 19V9m7 10V5m7 14v-7" />],
];

const DIFFERENT = [
  'Direct mentorship from seven-figure professionals',
  'Proven systems and a clear roadmap, not a pile of indicators',
  'Strategies that have helped thousands scale to 5, 6 and even 7-figure portfolios',
  'Risk management and psychology at the centre, not an afterthought',
  'Support continues until consistent profitability is achieved',
  'A high-performance community that raises your standard',
];

const Tick = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.500l3.200 3L13 4.500" /></svg>;

export default function Club() {
  usePageReveal();

  // Gentle parallax on [data-par] layers (skipped for reduced motion and small screens).
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const layers = [...document.querySelectorAll('[data-par]')];
    let raf = 0;
    const run = () => {
      raf = 0;
      if (window.innerWidth < 900) { layers.forEach(l => { l.style.transform = ''; }); return; }
      const vh = window.innerHeight;
      layers.forEach(l => {
        const r = l.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const v = (r.top + r.height / 2 - vh / 2) * parseFloat(l.dataset.par);
        l.style.transform = `translate3d(0,${Math.max(-90, Math.min(90, v)).toFixed(1)}px,0)`;
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="club-page">
      {/* ---------------- HERO (dark, diagonal cut) ---------------- */}
      <section className="cl-hero" aria-labelledby="cl-h1">
        <div className="cl-float cl-f1" data-par="-0.08"><div className="cl-bob"><Candles /></div></div>
        <div className="cl-float cl-f2" data-par="0.06"><div className="cl-bob d2"><Structure /></div></div>
        <div className="cl-float cl-f3" data-par="-0.05"><div className="cl-bob d3"><RiskReward /></div></div>
        <div className="cl-orbit" data-par="0.04"><Orbit /></div>
        <div className="cl-wrap cl-hero-grid">
          <div className="cl-hero-copy">
            <span className="cl-badge rv"><i aria-hidden="true">★</i> The 1% Club</span>
            <h1 id="cl-h1" className="split">
              <span className="ln"><span>Unlock the</span></span>
              <span className="ln"><span>Highest <em>Win-Rate</em></span></span>
              <span className="ln"><span>Setups.</span></span>
            </h1>
            <p className="cl-sub rv d1">High probability. Low risk. Maximum precision. No fluff, just setups that work.</p>
            <p className="cl-line rv d2">Stop trading like the 99%. Learn the institutional way.</p>
            <div className="cl-cta rv d3">
              <JoinButton className="btn btn-lime btn-xl cl-glow">Register Now</JoinButton>
              <a className="cl-ghost" href="#what">What is the 1% Club?</a>
            </div>
          </div>
          <div className="cl-hero-art rv d2">
            <div className="cl-portrait">
              <img src="/mentors/ways.webp" alt="Satyendra Kushwaha, founder of TradeBit India" width="640" height="1026" decoding="async" />
              <div className="cl-chip"><b>Satyendra Kushwaha</b><span>Founder · TradeBit India</span></div>
            </div>
          </div>
        </div>
        <div className="cl-ticker" aria-hidden="true">
          <div>{Array.from({ length: 2 }, (_, k) => <span key={k}>HIGH PROBABILITY · LOW RISK · MAXIMUM PRECISION · NO FLUFF · INSTITUTIONAL PROCESS · </span>)}</div>
        </div>
      </section>

      {/* ---------------- WHAT IS IT (light) ---------------- */}
      <section className="cl-what" id="what" aria-labelledby="cl-what-t">
        <div className="cl-wrap cl-two">
          <div>
            <span className="label rv">What is the 1% Club?</span>
            <h2 id="cl-what-t" className="cl-h2 split"><span className="ln"><span>From inconsistent</span></span><span className="ln"><span>to <span className="hl">profitable.</span></span></span></h2>
          </div>
          <div className="cl-prose rv d1">
            <p>The 1% Club is a comprehensive mentorship and trading education program that transforms traders from inconsistent to proficient and profitable.</p>
            <p>Members get access to proven strategies, daily coaching, live sessions and a community of elite traders, all built around one clear process.</p>
            <p className="cl-by">Established by <b>Satyendra Kushwaha</b>, TradeBit India.</p>
          </div>
        </div>
      </section>

      {/* ---------------- 60 DAYS (dark, rounded slab) ---------------- */}
      <section className="cl-days" aria-labelledby="cl-days-t">
        <div className="cl-slab">
          <div className="cl-orbit cl-orbit-sm" data-par="0.05"><Orbit /></div>
          <div className="cl-days-grid">
            <div className="cl-big rv">
              <b><Counter as="span" to={60} /></b>
              <span>days</span>
            </div>
            <div>
              <span className="label rv">How long to see results?</span>
              <h2 id="cl-days-t" className="cl-h2 cl-h2-l split"><span className="ln"><span>Real change</span></span><span className="ln"><span>inside <span className="lime">two months.</span></span></span></h2>
              <p className="cl-lead rv d1">Many members see incredible improvements, and secure funded accounts, within their first 60 days.</p>
              <p className="cl-lead rv d2">The result follows the commitment: show up, apply the process consistently, and let the edge compound.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- WHO + DIFFERENT (light, overlapping cards) ---------------- */}
      <section className="cl-who" aria-labelledby="cl-who-t">
        <div className="cl-wrap cl-who-grid">
          <article className="cl-card cl-card-who rv">
            <span className="label">Who is it for?</span>
            <h2 id="cl-who-t">Not only for experienced traders.</h2>
            <p>The 1% Club welcomes total beginners and seasoned professionals alike, from your very first trade to aiming for six and seven figures.</p>
            <p>The systems, the coaching and the community will elevate anyone willing to do the work.</p>
            <div className="cl-levels" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <div className="cl-levels-k" aria-hidden="true"><span>Beginner</span><span>Seasoned pro</span></div>
          </article>
          <article className="cl-card cl-card-diff rv d1">
            <span className="label">What makes it different?</span>
            <h2>Built to get you consistent, not just informed.</h2>
            <ul className="cl-list">
              {DIFFERENT.map(t => <li key={t}><b><Tick /></b>{t}</li>)}
            </ul>
          </article>
        </div>
      </section>

      {/* ---------------- PILLARS ---------------- */}
      <section className="cl-pillars" aria-labelledby="cl-pil-t">
        <div className="cl-wrap">
          <div className="cl-head">
            <span className="label rv">Inside the 1% Club</span>
            <h2 id="cl-pil-t" className="cl-h2 split"><span className="ln"><span>Six pillars.</span></span><span className="ln"><span>One <span className="hl">standard.</span></span></span></h2>
          </div>
          <div className="cl-grid">
            {PILLARS.map(([title, text, icon], i) => (
              <article key={title} className={`cl-pill rv d${i % 3}`}>
                <span className="cl-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg></span>
                <span className="cl-n" aria-hidden="true">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- RESULTS (dark) ---------------- */}
      <section className="cl-results" aria-labelledby="cl-res-t">
        <div className="cl-wrap">
          <div className="cl-head">
            <span className="label rv">Results</span>
            <h2 id="cl-res-t" className="cl-h2 cl-h2-l split"><span className="ln"><span>What the 1%</span></span><span className="ln"><span>looks like <span className="lime">in numbers.</span></span></span></h2>
          </div>
          <div className="cl-stats">
            <div className="rv"><b><Counter as="span" to={60} /></b><span>days to real improvement<br />and funded accounts</span></div>
            <div className="rv d1"><b><Counter as="span" to={7} suf="+" /></b><span>years of live-market<br />experience behind it</span></div>
            <div className="rv d2"><b>5–7</b><span>figure portfolios<br />scaled by members</span></div>
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="cl-final" aria-labelledby="cl-fin-t">
        <div className="cl-orbit cl-orbit-lg" data-par="0.04"><Orbit /></div>
        <div className="cl-wrap cl-final-in">
          <span className="cl-badge rv"><i aria-hidden="true">★</i> The 1% Club</span>
          <h2 id="cl-fin-t" className="cl-h2 cl-h2-xl split"><span className="ln"><span>Consistency is the</span></span><span className="ln"><span>secret of the <span className="lime">top 1%.</span></span></span></h2>
          <p className="cl-lead rv d1">They did not find a magic indicator. They found a process, and they never stopped applying it. Your seat is one click away.</p>
          <div className="rv d2"><JoinButton className="btn btn-lime btn-xl cl-glow">Register Now</JoinButton></div>
        </div>
      </section>
    </div>
  );
}
