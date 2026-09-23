import { useRef } from 'react';
import { CapRings } from './Rings.jsx';
import { methodMini } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { useStrokeLengths } from '../hooks/motion.js';

function ZoneChart({ z }) {
  const ref = useRef(null);
  useStrokeLengths(ref);
  const svg = `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${methodMini[z]}</svg>`;
  return <div ref={ref} className="z-chart" dangerouslySetInnerHTML={html(svg)} />;
}

export default function Method() {
  return (
    <section className="method dark" id="method" aria-labelledby="method-t">
      <CapRings className="cap-rings" count={5} step={26} radiusVar="--r-cap" />
      <div className="wrap">
        <div className="method-head">
          <div>
            <span className="label rv">The Method</span>
            <h2 id="method-t" className="h-l split"><span className="ln"><span>A Simple Framework.</span></span><span className="ln"><span>A Better Way To</span></span><span className="ln"><span className="lime">Read The Market.</span></span></h2>
          </div>
          <p className="lead rv d2">Five zones, always in the same order. Every lesson, live session and journal review follows this sequence — so your process stays the same even when the market doesn't.</p>
        </div>
        <div className="zones">
          <article className="zone rv" tabIndex="0"><span className="z-num">01</span><h3>Structure</h3><ZoneChart z={1} /><p className="z-ann meta">HH › HL › HH · Trend: Up</p><p className="z-txt">Identify trend direction through swing highs and lows before anything else. The map comes before the move.</p></article>
          <article className="zone rv d1" tabIndex="0"><span className="z-num">02</span><h3>Price Action</h3><ZoneChart z={2} /><p className="z-ann meta">Wick rejection · Level 24,610</p><p className="z-txt">Read candle behaviour at important levels — rejection, absorption and momentum shifts that reveal intent.</p></article>
          <article className="zone rv d2" tabIndex="0"><span className="z-num">03</span><h3>Setups</h3><ZoneChart z={3} /><p className="z-ann meta">Zone ✓ · Trend ✓ · Trigger ✓</p><p className="z-txt">Filter ideas through a written checklist. If the criteria aren't met, there is no trade — patience becomes a rule.</p></article>
          <article className="zone rv d3" tabIndex="0"><span className="z-num">04</span><h3>Risk</h3><ZoneChart z={4} /><p className="z-ann meta">Risk 1% · Target 3R</p><p className="z-txt">Set invalidation and position size before entry. You decide what you're willing to lose — the market doesn't.</p></article>
          <article className="zone rv d4" tabIndex="0"><span className="z-num">05</span><h3>Execution</h3><ZoneChart z={5} /><p className="z-ann meta">Plan · Execute · Journal</p><p className="z-txt">Enter, manage and journal according to plan. Review weekly. Discipline is built by repetition, not willpower.</p></article>
        </div>
        <div className="method-foot meta rv"><span>Structure</span><span>→</span><span>Price Action</span><span>→</span><span>Setups</span><span>→</span><span>Risk</span><span>→</span><span className="lime">Execution</span></div>
      </div>
    </section>
  )
}
