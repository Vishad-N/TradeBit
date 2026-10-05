import { useEffect, useMemo, useRef, useState } from 'react';
import { formTopo, heroCapTopo, heroChart } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion, useStrokeLengths } from '../hooks/motion.js';
import { BitcoinAsset } from './FloatingAssets.jsx';

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
      <BitcoinAsset />
      <div className="hero-copy">
        <span className="label rv">The Modern Trading Framework</span>
        <h1 id="hero-t" className="h-xl split">
          <span className="ln"><span>Read The</span></span>
          <span className="ln"><span>Market.</span></span>
          <span className="ln"><span><span className="hl">Differently.</span></span></span>
        </h1>
        <p className="lead rv d2">A structured approach to market structure, price action and risk management designed to help traders replace guesswork with discipline.</p>
        <div className="hero-ctas rv d3">
          <a href="#offer" className="btn btn-dark">Start Your Journey <span className="ar">→</span></a>
          <button className="btn btn-line" type="button" onClick={onPlayVideo}><span className="ring"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg></span>Watch 2-Min Overview <span className="ar">→</span></button>
        </div>
        <ul className="checks rv d4">
          <li><b>✓</b>Beginner Friendly</li>
          <li><b>✓</b>Live Market Analysis</li>
          <li><b>✓</b>Structured Learning</li>
          <li><b>✓</b>Community Access</li>
        </ul>
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
        <div className="tag-float tf1"><span className="meta">NIFTY 50 · 4H</span><b>24,812.<span className="lime">40</span></b><span className="meta" style={{ color: '#B8D83D' }}>▲ Structure · Bullish</span></div>
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
