import { useRef } from 'react';
import { eduArt, structChart } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { useStrokeLengths } from '../hooks/motion.js';

export default function Education() {
  const structRef = useRef(null);
  useStrokeLengths(structRef);

  return (
    <section className="edu" id="learn" aria-labelledby="edu-t">
      <div className="edu-art" aria-hidden="true"><svg viewBox="0 0 100 190" preserveAspectRatio="none" dangerouslySetInnerHTML={html(eduArt())} /></div>
      <div className="edu-cap" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 0 H64 C36 4 12 32 0 100 Z" fill="#151814"/></svg></div>
      <svg className="edu-curve" viewBox="0 0 1440 1400" preserveAspectRatio="none" aria-hidden="true"><path className="dr" id="eduCurve" d="M-40 1180 C260 1120 360 760 640 700 S1060 820 1200 520 1380 180 1500 120" fill="none" stroke="#B8D83D" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/></svg>
      <div className="wrap">
        <div className="edu-head">
          <div>
            <span className="label rv">The Curriculum</span>
            <h2 id="edu-t" className="h-l split"><span className="ln"><span>Everything You Need</span></span><span className="ln"><span>To Become A</span></span><span className="ln"><span><span className="hl">Better</span> Trader.</span></span></h2>
          </div>
        </div>
    
        <div className="edu-grid">
          <article className="mod m-feature rv">
            <div className="meta"><span>Module 01 · Foundation</span><span>18 Lessons</span></div>
            <h3>Market<br />Structure</h3>
            <svg ref={structRef} id="structChart" viewBox="0 0 760 330" aria-label="Diagram of an uptrend: a zigzag line marking higher highs and higher lows, with a trendline connecting the lows" dangerouslySetInnerHTML={html(structChart())} />
            <p>Read trend, range and transition phases on any chart and any timeframe — the single skill every other module depends on.</p>
          </article>
          <article className="mod m-pa rv d1">
            <div className="meta"><span>Module 02</span><span>14 Lessons</span></div>
            <h3>Price<br />Action</h3>
            <div className="pa">
              <svg viewBox="0 0 96 170" fill="none" aria-label="Anatomy of a candle: high, close, open and low">
                <line x1="26" x2="26" y1="6" y2="164" stroke="#151814" strokeWidth="1.5"/>
                <rect x="12" y="46" width="28" height="78" fill="#151814"/>
                <g stroke="#151814" strokeOpacity=".4"><line x1="46" x2="56" y1="6" y2="6"/><line x1="46" x2="56" y1="46" y2="46"/><line x1="46" x2="56" y1="124" y2="124"/><line x1="46" x2="56" y1="164" y2="164"/></g>
                <g fill="#151814" fillOpacity=".6" fontSize="9" fontFamily="Space Grotesk, sans-serif" letterSpacing="1"><text x="60" y="9">HIGH</text><text x="60" y="49">CLOSE</text><text x="60" y="127">OPEN</text><text x="60" y="167">LOW</text></g>
              </svg>
              <p>Candle anatomy, rejection, engulfing behaviour and momentum — read intent, not noise.</p>
            </div>
          </article>
          <article className="mod m-setup rv d2">
            <div className="meta"><span>Module 03</span><span>16 Lessons</span></div>
            <h3>Trade Setups</h3>
            <ul className="checklist">
              <li>Higher-timeframe trend aligned <b>✓</b></li>
              <li>Price at a marked zone <b>✓</b></li>
              <li>Confirmation candle closed <b>✓</b></li>
              <li>Minimum 2R available <b>✓</b></li>
            </ul>
          </article>
          <article className="mod m-risk rv">
            <div className="meta"><span>Module 04</span><span>12 Lessons</span></div>
            <h3>Risk<br />Management</h3>
            <div className="rr" aria-label="Reward-to-risk diagram: target of 3R above entry, stop of 1R below"><div className="tp"><span>TARGET</span><span>+3R</span></div><div className="en"></div><div className="sl"><span>STOP</span><span>−1R</span></div></div>
            <p>Position sizing, stop placement and R-multiples.</p>
          </article>
          <article className="mod m-live rv d1">
            <div className="meta"><span className="live-dot">Live</span><span>Weekly</span></div>
            <h3>Live Analysis</h3>
            <div className="sched">
              <div><b>Weekly outlook</b><span>Mon · 8:30 PM</span></div>
              <div><b>Mid-week review</b><span>Wed · 8:30 PM</span></div>
              <div><b>Journal clinic</b><span>Sat · 11:00 AM</span></div>
            </div>
          </article>
          <article className="mod m-psy rv d2">
            <div className="meta"><span>Module 06</span><span>10 Lessons</span></div>
            <p className="q">Patience <span>over</span> prediction.</p>
            <h3>Trading Psychology</h3>
            <p>Handle losses, avoid revenge trading and build routines that keep emotion out of execution.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
