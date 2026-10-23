import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { heroCapTopo } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion } from '../hooks/motion.js';
import '../styles/hero.css';

// three.js is heavy and only the hero needs it: load it on demand so the headline and CTAs paint first.
const StructureCore = lazy(() => import('./hero/StructureCore.jsx'));
const SWEEP_EVENT = 'tb:liquidity-sweep';

// Live quotes from Binance public futures (CORS-open, no key). Metals trade there as USDT perpetuals.
// The card flips through these markets; Gold leads.
const MARKETS = [
  { label: 'GOLD (XAUUSD)', sym: 'XAUUSDT', dp: 2, base: 4192 },
  { label: 'SILVER (XAGUSD)', sym: 'XAGUSDT', dp: 3, base: 57.79 },
  { label: 'ETHEREUM (ETHUSDT)', sym: 'ETHUSDT', dp: 2, base: 2429.44 },
  { label: 'SOLANA (SOLUSDT)', sym: 'SOLUSDT', dp: 2, base: 105.73 },
];
const TICKER_URL = 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbols=' +
  encodeURIComponent(JSON.stringify(MARKETS.map((m) => m.sym)));
const FLIP_EVERY = 4500;
const FLIP_HALF = 280;

function fmtPrice(n, dp) {
  const [int, dec] = n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }).split('.');
  return <>{int}.<span className="gp-dec">{dec}</span></>;
}

function MarketPill({ onGold }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('');
  const [paused, setPaused] = useState(false);
  const [quotes, setQuotes] = useState({});
  const [tick, setTick] = useState('');
  const prev = useRef({});
  const [reduced] = useState(() => prefersReducedMotion());

  // Poll all four quotes every 4s (only while the tab is visible).
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(TICKER_URL);
        if (!res.ok) return;
        const rows = await res.json();
        if (!alive) return;
        const next = {};
        rows.forEach((r) => { next[r.symbol] = { price: parseFloat(r.lastPrice), chg: parseFloat(r.priceChangePercent) }; });
        setQuotes((q) => ({ ...q, ...next }));
        if (next.XAUUSDT) onGold?.(next.XAUUSDT.price);
      } catch { /* keep the last known / fallback price */ }
    };
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Flip to the next market every few seconds (paused on hover/focus, off for reduced motion).
  useEffect(() => {
    if (reduced || paused) return undefined;
    let swap, done;
    const t = setTimeout(() => {
      setPhase('out');
      swap = setTimeout(() => {
        setIdx((i) => (i + 1) % MARKETS.length);
        setPhase('in');
        done = setTimeout(() => setPhase(''), FLIP_HALF);
      }, FLIP_HALF);
    }, FLIP_EVERY);
    return () => { clearTimeout(t); clearTimeout(swap); clearTimeout(done); };
  }, [idx, paused, reduced]);

  const m = MARKETS[idx];
  const q = quotes[m.sym];
  const price = q ? q.price : m.base;
  const chg = q ? q.chg : null;

  // flash green/red when the live price moves
  useEffect(() => {
    const last = prev.current[m.sym];
    if (q && last != null && q.price !== last) {
      setTick(q.price > last ? 'up' : 'dn');
      const t = setTimeout(() => setTick(''), 700);
      prev.current[m.sym] = q.price;
      return () => clearTimeout(t);
    }
    if (q) prev.current[m.sym] = q.price;
    return undefined;
  }, [q, m.sym]);

  const bull = chg == null || chg >= 0;
  return (
    <div className="gold-pill" role="group" aria-label="Live market rates" tabIndex={0}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className={'gp-face' + (phase ? ' ' + phase : '')} aria-live="off">
        <span className="gp-meta"><i className="gp-dot" aria-hidden="true"></i>{m.label} · LIVE</span>
        <b className={'gp-price' + (tick ? ' tick-' + tick : '')}>{fmtPrice(price, m.dp)}</b>
        <span className={'gp-chg ' + (bull ? 'up' : 'dn')}>
          {bull ? '▲' : '▼'} {chg == null ? 'Connecting…' : `${bull ? '+' : ''}${chg.toFixed(2)}% · 24h`}
        </span>
      </div>
      <div className="gp-dots" aria-hidden="true">
        {MARKETS.map((_, i) => <i key={i} className={i === idx ? 'on' : undefined}></i>)}
      </div>
    </div>
  );
}

// Text animation helpers. The letters/words are decorative copies; the real text lives in an aria-label.
function Chars({ text, start = 0, step = 0.035, gold = false }) {
  const chars = [...text];
  return chars.map((c, i) => (
    <span key={i} className={'ch' + (gold ? ' g' : '')} aria-hidden="true"
      style={{ '--d': `${(start + i * step).toFixed(3)}s`, '--n': i, '--t': chars.length }}>{c === ' ' ? ' ' : c}</span>
  ));
}
function Words({ text, start = 0, step = 0.03 }) {
  return text.split(' ').map((w, i) => (
    <span key={i} className="wd" aria-hidden="true" style={{ '--d': `${(start + i * step).toFixed(3)}s` }}>{w}{' '}</span>
  ));
}

// A short run of decorative candlesticks (deterministic from `seed`, so SSR/hydration never disagrees).
function Candles({ seed = 1, n = 9 }) {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let price = 60;
  const bars = [];
  for (let i = 0; i < n; i++) {
    const o = price, c = price + (rnd() - 0.42) * 22;
    const hi = Math.max(o, c) + rnd() * 9, lo = Math.min(o, c) - rnd() * 9;
    bars.push({ i, o, c, hi, lo });
    price = c;
  }
  return (
    <svg viewBox={`0 0 ${n * 16} 120`} preserveAspectRatio="xMidYMid meet" fill="none">
      {bars.map(({ i, o, c, hi, lo }) => {
        const up = c >= o, col = up ? '#7FE7FF' : '#D4AF37', x = i * 16 + 8;
        const y = (v) => 110 - v;
        return (
          <g key={i} stroke={col} strokeOpacity=".7" strokeWidth="1.2">
            <line x1={x} x2={x} y1={y(hi)} y2={y(lo)} />
            <rect x={x - 4} y={y(Math.max(o, c))} width="8" height={Math.max(2, Math.abs(c - o))} fill={col} fillOpacity={up ? 0.1 : 0.35} />
          </g>
        );
      })}
    </svg>
  );
}

const WORDS = 'Market structure · Price action · Risk management · Liquidity · Order block · Break of structure · ';

// Pointer-driven life for the hero: layered parallax (CSS vars --px/--py in -1..1), letters that lean away from the
// cursor, and a chart-style crosshair. With no mouse (touch) it sways gently on its own. Off for reduced motion.
function useHeroLife(ref, goldRef) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return undefined;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const copy = root.querySelector('.hero-copy');
    const chars = [...root.querySelectorAll('.sc-h1 .ch')].map((el) => ({ el, x: 0, y: 0, k: 0 }));
    const cross = root.querySelector('.hx-cross');
    const tag = root.querySelector('.hx-tag');
    const st = { tx: 0, ty: 0, x: 0, y: 0, mx: 0, my: 0, cx: 0, cy: 0, inside: false, vis: true, raf: 0, t0: performance.now() };

    // letter centres relative to .hero-copy (offset* ignores transforms, so parallax/animations don't skew them)
    const measure = () => chars.forEach((c) => { c.x = c.el.offsetLeft + c.el.offsetWidth / 2; c.y = c.el.offsetTop + c.el.offsetHeight / 2; });
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(copy);

    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      st.inside = e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right;
      st.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      st.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      st.mx = e.clientX; st.my = e.clientY;
      if (st.inside && !st.raf && st.vis) st.raf = requestAnimationFrame(frame);
    };
    const onLeave = () => { st.inside = false; };

    const frame = () => {
      st.raf = 0;
      if (!st.vis) return;
      const now = performance.now(), t = (now - st.t0) / 1000;
      // pointer drives the layers; without one they idle in a slow figure-of-eight
      const sx = st.inside ? st.tx : Math.sin(t * 0.35) * 0.45;
      const sy = st.inside ? st.ty : Math.cos(t * 0.27) * 0.35;
      st.x += (sx - st.x) * 0.06; st.y += (sy - st.y) * 0.06;
      root.style.setProperty('--px', st.x.toFixed(4));
      root.style.setProperty('--py', st.y.toFixed(4));

      // letters near the cursor lean away, grow a touch and warm towards gold (after the intro animation)
      if (now - st.t0 > 2300) {
        const cr = copy.getBoundingClientRect();
        const lx = st.mx - cr.left, ly = st.my - cr.top;
        for (const c of chars) {
          let target = 0, ux = 0, uy = 0;
          if (st.inside) {
            const dx = c.x - lx, dy = c.y - ly, d = Math.hypot(dx, dy) || 1;
            target = Math.max(0, 1 - d / 190);
            target = target * target * (3 - 2 * target);
            ux = dx / d; uy = dy / d;
          }
          c.k += (target - c.k) * 0.16;
          if (c.k < 0.003) { if (c.el.style.translate) { c.el.style.translate = ''; c.el.style.scale = ''; c.el.style.setProperty('--k', '0'); } continue; }
          c.el.style.translate = `${(ux * c.k * 12).toFixed(2)}px ${(uy * c.k * 9 - c.k * 5).toFixed(2)}px`;
          c.el.style.scale = (1 + c.k * 0.09).toFixed(3);
          c.el.style.setProperty('--k', c.k.toFixed(3));
        }
      }

      // crosshair: eases after the cursor, reads out a price scaled from the live gold quote
      if (cross && fine) {
        const r = root.getBoundingClientRect();
        st.cx += ((st.mx - r.left) - st.cx) * 0.2; st.cy += ((st.my - r.top) - st.cy) * 0.2;
        cross.style.setProperty('--cx', `${st.cx.toFixed(1)}px`);
        cross.style.setProperty('--cy', `${st.cy.toFixed(1)}px`);
        cross.classList.toggle('on', st.inside);
        if (st.inside && tag) {
          const base = goldRef.current || 4030;
          const px = base * (1 + (0.5 - st.cy / r.height) * 0.014);
          tag.textContent = 'XAUUSD ' + px.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
      st.raf = requestAnimationFrame(frame);   // the idle sway needs frames too, so keep going while the hero is visible
    };

    const io = new IntersectionObserver(([e]) => {
      st.vis = e.isIntersecting;
      if (st.vis && !st.raf && !document.hidden) st.raf = requestAnimationFrame(frame);
      else if (!st.vis && st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    });
    io.observe(root);
    const onVis = () => {
      if (document.hidden && st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
      else if (!document.hidden && st.vis && !st.raf) st.raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVis);
    if (fine) { window.addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave); }
    st.raf = requestAnimationFrame(frame);

    return () => {
      if (st.raf) cancelAnimationFrame(st.raf);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [ref, goldRef]);
}

const LEAD = 'A structured approach to market structure, price action and risk management designed to help traders replace guesswork with discipline.';

export default function Hero({ onPlayVideo }) {
  const [show3d, setShow3d] = useState(false);
  const heroRef = useRef(null);
  const goldRef = useRef(0);
  const onGold = useCallback((p) => { goldRef.current = p; }, []);
  useHeroLife(heroRef, goldRef);

  // Start the 3D scene once the page has painted (idle), so it never competes with the headline.
  useEffect(() => {
    const go = () => setShow3d(true);
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(go, { timeout: 600 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(go, 200);
    return () => clearTimeout(t);
  }, []);

  // Primary CTA: a short liquidity sweep runs through the scene, then the page glides to the offer.
  const startJourney = (e) => {
    const target = document.getElementById('offer');
    if (!target || prefersReducedMotion()) return;
    e.preventDefault();
    window.dispatchEvent(new Event(SWEEP_EVENT));
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 650);
  };

  return (
    <section className="hero hero-dark" id="top" ref={heroRef} aria-labelledby="hero-t">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-bg-grid hx" style={{ '--z': 0.25 }}></div>
        {/* far layers: drifting glows and a huge outlined word band, moving against the cursor */}
        <div className="hx hx-orb hx-orb-a" style={{ '--z': 0.45 }}></div>
        <div className="hx hx-orb hx-orb-b" style={{ '--z': 0.7 }}></div>
        <div className="hx hx-orb hx-orb-c" style={{ '--z': 0.55 }}></div>
        <div className="hx hx-band" style={{ '--z': 0.5 }}>
          <div className="hx-row"><span>{WORDS}</span><span>{WORDS}</span></div>
          <div className="hx-row rev"><span>{WORDS}</span><span>{WORDS}</span></div>
        </div>
        {show3d && <Suspense fallback={null}><StructureCore /></Suspense>}
        {/* near layers: candlestick runs and plus markers, moving further than the scene */}
        <div className="hx hx-candles hx-c1" style={{ '--z': 1.0 }}><Candles seed={3} n={9} /></div>
        <div className="hx hx-candles hx-c2" style={{ '--z': 1.5 }}><Candles seed={7} n={7} /></div>
        <div className="hx hx-candles hx-c3" style={{ '--z': 2.0 }}><Candles seed={11} n={6} /></div>
        {[['58%', '16%', 1.7], ['93%', '30%', 2.4], ['48%', '62%', 1.3], ['86%', '78%', 2.1], ['66%', '88%', 1.6], ['40%', '34%', 2.6]].map(([l, t, z], i) => (
          <i key={i} className="hx hx-plus" style={{ left: l, top: t, '--z': z, '--i': i }}></i>
        ))}
      </div>
      <div className="hero-veil" aria-hidden="true"></div>
      <div className="hx-cross" aria-hidden="true"><i className="hx-v"></i><i className="hx-h"></i><span className="hx-tag"></span></div>

      <div className="hero-copy">
        <span className="label sc-label-in">The Modern Trading Framework</span>
        <h1 id="hero-t" className="sc-h1" aria-label="Read the market. Differently.">
          <span className="sc-ln"><span><Chars text="Read the market." start={0.2} /></span></span>
          <span className="sc-ln"><span><Chars text="Differently." start={0.75} gold /></span></span>
        </h1>
        <p className="lead sc-lead" aria-label={LEAD}><Words text={LEAD} start={1.15} /></p>
        <p className="hook-hero sc-hook"><b>1–2 trades a day.</b> Still out-earning 90% of active traders. <a href="#why">Here is the secret →</a></p>
        <div className="hero-ctas sc-ctas">
          <a href="#offer" className="btn btn-gold" onClick={startJourney}>Start Your Journey <span className="ar">→</span></a>
          <button className="btn btn-line btn-ghost" type="button" onClick={onPlayVideo}><span className="ring"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg></span>Watch 2-Min Overview <span className="ar">→</span></button>
        </div>
      </div>
      <div className="hero-pill-slot"><MarketPill onGold={onGold} /></div>

      <div className="hero-cap" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 V86 C34 86 72 70 100 0 V100 Z" fill="#DCE8C0"/>
          <g fill="none" stroke="#151814" strokeOpacity=".12" vectorEffect="non-scaling-stroke" dangerouslySetInnerHTML={html(heroCapTopo())} />
          <path d="M0 86 C34 86 72 70 100 0" fill="none" stroke="#D4AF37" strokeOpacity=".7" vectorEffect="non-scaling-stroke"/>
        </svg>
      </div>
    </section>
  )
}
