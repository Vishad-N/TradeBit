import { useRef } from 'react';
import { archArt } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { useStrokeLengths } from '../hooks/motion.js';

export default function FinalCta() {
  const artRef = useRef(null);
  useStrokeLengths(artRef);

  return (
    <section className="final" aria-labelledby="final-t">
      <div className="arch-art" aria-hidden="true"><svg ref={artRef} id="archArt" viewBox="0 0 1000 690" preserveAspectRatio="none" dangerouslySetInnerHTML={html(archArt())} /></div>
      <div className="arch-cap" aria-hidden="true"><svg viewBox="0 0 1000 300" preserveAspectRatio="none"><path d="M0 0 H1000 V300 H900 C880 90 700 0 500 0 C300 0 120 90 100 300 H0 Z" fill="#F3F4EF"/></svg></div>
      <div className="final-in">
        <span className="label rv" style={{ justifyContent: 'center' }}>The Beginning</span>
        <h2 id="final-t" className="h-xl split"><span className="ln"><span>Don't Just Watch</span></span><span className="ln"><span>The Market.</span></span><span className="ln"><span className="lime">Understand It.</span></span></h2>
        <p className="rv d2">Build knowledge. Build discipline. Build a process.</p>
        <svg className="guide" viewBox="0 0 24 90" aria-hidden="true"><line x1="12" y1="0" x2="12" y2="80"/><path d="M5 74 L12 84 L19 74"/></svg>
        <a href="#offer" className="btn btn-lime btn-xl rv d3">Start Learning <span className="ar">→</span></a>
      </div>
    </section>
  )
}
