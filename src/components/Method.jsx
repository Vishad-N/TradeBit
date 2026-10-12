import { useRef } from 'react';
import { CapRings } from './Rings.jsx';
import { methodMini } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { useStrokeLengths } from '../hooks/motion.js';
import { EthereumAsset } from './FloatingAssets.jsx';

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
      <EthereumAsset />
      <div className="wrap">
        <div className="method-head">
          <div>
            <span className="label rv">The Method</span>
            <h2 id="method-t" className="h-l split"><span className="ln"><span>A Simple Framework.</span></span><span className="ln"><span>A Better Way To</span></span><span className="ln"><span className="lime">Read The Market.</span></span></h2>
          </div>
          <p className="lead rv d2">Five stages, always in the same order. Every lesson, live session and journal review follows this sequence — so your process stays the same even when the market doesn't.</p>
        </div>
        <div className="zones">
          <article className="zone rv" tabIndex="0"><span className="z-num">01</span><h3>Market Basics &amp; Price Action</h3><ZoneChart z={2} /><p className="z-ann meta">Wick rejection · Level 24,610</p><p className="z-txt">How markets move and why. Learn the basics, then read candle behaviour at key levels — rejection, absorption and momentum shifts that reveal intent.</p></article>
          <article className="zone rv d1" tabIndex="0"><span className="z-num">02</span><h3>Structure &amp; SMC</h3><ZoneChart z={1} /><p className="z-ann meta">HH › HL › BOS · Smart money</p><p className="z-txt">Map trend through swing highs and lows, then read Smart Money Concepts: breaks of structure, order blocks and where institutions are positioned.</p></article>
          <article className="zone rv d2" tabIndex="0"><span className="z-num">03</span><h3>Liquidity &amp; ICT</h3><ZoneChart z={3} /><p className="z-ann meta">Sweep ✓ · Zone ✓ · Trigger ✓</p><p className="z-txt">See where stops pool and how price hunts them. Use ICT concepts to wait for the sweep, the zone and the trigger — no setup, no trade.</p></article>
          <article className="zone rv d3" tabIndex="0"><span className="z-num">04</span><h3>Psychology &amp; Risk Management</h3><ZoneChart z={4} /><p className="z-ann meta">Risk 1% · Target 3R · High-probability</p><p className="z-txt">Control fear and FOMO, size every trade before entry, and build a high-probability strategy. You decide what you're willing to lose — the market doesn't.</p></article>
          <article className="zone rv d4" tabIndex="0"><span className="z-num">05</span><h3>Order Flow &amp; Volume Profile</h3><ZoneChart z={5} /><p className="z-ann meta">Volume profile · VSA · Order flow</p><p className="z-txt">Read who is really buying and selling. Combine order flow, volume profile and volume spread analysis to confirm entries and manage the trade.</p></article>
        </div>
        <div className="method-foot meta rv"><span>Price Action</span><span>→</span><span>Structure &amp; SMC</span><span>→</span><span>Liquidity &amp; ICT</span><span>→</span><span>Psychology &amp; Risk</span><span>→</span><span className="lime">Order Flow</span></div>
      </div>
    </section>
  )
}
