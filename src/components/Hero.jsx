import { useEffect, useMemo, useRef, useState } from 'react';
import { formTopo, heroCapTopo, heroChart } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion, useStrokeLengths } from '../hooks/motion.js';
// Bitcoin hero SVG is paused for now; re-enable by restoring this import and the <BitcoinAsset /> line below.
// import { BitcoinAsset } from './FloatingAssets.jsx';

// Rotating hero headlines. Every entry is exactly 3 lines (keeps the block height constant, so
// nothing below it shifts); the last line carries the payoff and gets the lime highlight.
const HEADLINES = [
  ['Read The', 'Market.', 'Differently.'],
  ['99% lose because', 'they guess.', 'Learn the math.'],
  ['Stop guessing.', 'Start learning.', 'Decode the charts.'],
  ['Stop gambling.', 'Start trading.', 'Charts, not luck.'],
  ['Tips make', 'brokers rich.', 'Skills make you rich.'],
  ['Protect your capital.', 'Invest in your', 'brain first.'],
  ["You don't need luck.", 'You need a mechanical', 'trading plan.'],
];
const DWELL = 5200;
const EXIT = 450;

function HeroHeadline() {
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (reduced || paused) return undefined;
    let swap;
    const dwell = setTimeout(() => {
      setLeaving(true);
      swap = setTimeout(() => { setIdx((i) => (i + 1) % HEADLINES.length); setLeaving(false); }, EXIT);
    }, DWELL);
    return () => { clearTimeout(dwell); clearTimeout(swap); };
  }, [idx, paused, reduced]);

  const go = (i) => { setLeaving(false); setIdx(i); };
  const lines = HEADLINES[idx];

  return (
    <div className="hh-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <h1 id="hero-t" className="hh">
        <span className="hh-sr">Read The Market. Differently.</span>
        <span className={'hh-stage' + (leaving ? ' out' : '')} key={idx} aria-hidden="true">
          {lines.map((t, i) => (
            <span className="hh-ln" key={i}><span style={{ '--i': i }}>{i === 2 ? <span className="hl">{t}</span> : t}</span></span>
          ))}
        </span>
      </h1>
      <div className="hh-dots" role="group" aria-label="Choose headline">
        {HEADLINES.map((_, i) => (
          <button key={i} type="button" className={'hh-dot' + (i === idx ? ' on' : '')} style={{ '--dwell': DWELL + 'ms' }}
            aria-label={`Headline ${i + 1} of ${HEADLINES.length}`} aria-current={i === idx ? 'true' : undefined} onClick={() => go(i)}>
            <i></i>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Hero({ onPlayVideo }) {
  const chartRef = useRef(null);
  const [drawn, setDrawn] = useState(false);
  const chart = useMemo(() => heroChart(prefersReducedMotion()), []);
  useStrokeLengths(chartRef);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="hero" id="top" aria-labelledby="hero-t">
      <div className="hero-grid-bg" aria-hidden="true"></div>
      {/* <BitcoinAsset /> */}
      <div className="hero-copy">
        <span className="label rv">The Modern Trading Framework</span>
        <HeroHeadline />
        <p className="lead rv d2">A structured approach to market structure, price action and risk management designed to help traders replace guesswork with discipline.</p>
        <p className="hook-hero rv d2"><b>1–2 trades a day.</b> Still out-earning 90% of active traders. <a href="#why">Here is the secret →</a></p>
        <div className="hero-ctas rv d3">
          <a href="#offer" className="btn btn-dark">Start Your Journey <span className="ar">→</span></a>
          <button className="btn btn-line" type="button" onClick={onPlayVideo}><span className="ring"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg></span>Watch 2-Min Overview <span className="ar">→</span></button>
        </div>
        <div className="mods rv d4">
          <span className="mods-label meta">Inside the course · 6 modules</span>
          <ol className="mods-list" aria-label="The six course modules">
            <li><b>1</b><span>Market Foundation &amp; Price Action Mastery</span></li>
            <li><b>2</b><span>Smart Money Concepts (SMC)</span></li>
            <li><b>3</b><span>Inner Circle Trader (ICT) Concepts &amp; Liquidity in Depth</span></li>
            <li><b>4</b><span>Order Flow &amp; Volume Profile</span></li>
            <li><b>5</b><span>Trade Management, Psychology &amp; News Impact</span></li>
            <li><b>6</b><span>20 High Probability Winning Setups</span></li>
          </ol>
        </div>
      </div>

      <div className="hero-form" role="img" aria-label="Annotated candlestick chart showing an uptrend with higher highs, higher lows, a resistance breakout and a support zone, set on a charcoal architectural form">
        <svg className="form" viewBox="0 0 800 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M170 900 V330 C170 150 300 20 480 20 H800 V900 Z" fill="#151814"/>
          <g fill="none" stroke="#DCE8C0" strokeOpacity=".09" vectorEffect="non-scaling-stroke" dangerouslySetInnerHTML={html(formTopo())} />
          <path d="M120 900 V330 C120 120 270 -30 480 -30 H800" fill="none" stroke="#151814" strokeOpacity=".18" vectorEffect="non-scaling-stroke"/>
          <path d="M70 900 V330 C70 90 240 -80 480 -80 H800" fill="none" stroke="#151814" strokeOpacity=".08" vectorEffect="non-scaling-stroke"/>
        </svg>
        <div className="hero-chart" data-speed="-0.04">
          <svg ref={chartRef} className={drawn ? 'drawn' : undefined} viewBox="0 0 600 560" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={html(chart)} />
        </div>
        <div className="tag-float tf1"><span className="meta">GOLD (XAUUSD) · 4H</span><b>4,248.<span className="lime">50</span></b><span className="meta" style={{ color: '#B8D83D' }}>▲ Structure · Bullish</span></div>
        <div className="tag-float tf2"><span className="meta">Planned R:R</span><b>1 : <span className="lime">3.2</span></b></div>
      </div>

      <div className="hero-scroll meta" aria-hidden="true"><i></i>Scroll</div>
      <div className="hero-cap" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 V86 C34 86 72 70 100 0 V100 Z" fill="#DCE8C0"/>
          <g fill="none" stroke="#151814" strokeOpacity=".12" vectorEffect="non-scaling-stroke" dangerouslySetInnerHTML={html(heroCapTopo())} />
          <path d="M0 86 C34 86 72 70 100 0" fill="none" stroke="#151814" strokeOpacity=".35" vectorEffect="non-scaling-stroke"/>
        </svg>
      </div>
    </section>
  )
}
