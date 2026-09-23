import { probArt, probLines } from '../lib/charts.js';
import { html } from '../lib/html.js';

export default function Problem() {
  return (
    <section className="problem" id="why" aria-labelledby="prob-t">
      <div className="prob-art" aria-hidden="true"><svg viewBox="0 0 100 240" preserveAspectRatio="none" dangerouslySetInnerHTML={html(probArt())} /></div>
      <div className="prob-cap" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M36 0 C66 0 90 20 100 100 V0 Z" fill="#DCE8C0"/></svg></div>
      <svg className="prob-lines" viewBox="0 0 1440 1200" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={html(probLines())} />
      <div className="wrap">
        <div className="prob-head">
          <span className="label rv">The Real Problem</span>
          <h2 id="prob-t" className="h-l split"><span className="ln"><span>Most Traders</span></span><span className="ln"><span>Don't Need</span></span><span className="ln"><span>More Signals.</span></span></h2>
          <p className="sub rv d2">They need a <b>process.</b></p>
        </div>
        <ol className="errors">
          <li className="err"><span className="code meta">ERR · 01</span><span className="word">Random Entries</span><span className="frag"><svg viewBox="0 0 300 46" aria-hidden="true"><polyline points="0,30 30,12 52,36" fill="none" stroke="#DCE8C0" strokeOpacity=".6"/><polyline points="70,8 96,40 120,20" fill="none" stroke="#DCE8C0" strokeOpacity=".6"/><polyline points="150,34 176,6 200,28" fill="none" stroke="#DCE8C0" strokeOpacity=".6"/><line x1="0" x2="300" y1="22" y2="22" stroke="#DCE8C0" strokeOpacity=".25" strokeDasharray="3 5"/><text x="228" y="26" fill="#DCE8C0" fillOpacity=".6" fontSize="12" fontFamily="Space Grotesk, sans-serif">×  ×  ×</text></svg><span className="meta">Entry · no confirmation</span></span></li>
          <li className="err"><span className="code meta">ERR · 02</span><span className="word">Emotional Decisions</span><span className="frag"><svg viewBox="0 0 300 46" aria-hidden="true"><path d="M0 24 L14 6 L26 42 L40 4 L54 40 L68 10 L82 36 L96 16 L110 30" fill="none" stroke="#DCE8C0" strokeOpacity=".6"/><line x1="130" x2="300" y1="24" y2="24" stroke="#DCE8C0" strokeOpacity=".25" strokeDasharray="3 5"/></svg><span className="meta">Fear → FOMO → revenge</span></span></li>
          <li className="err"><span className="code meta">ERR · 03</span><span className="word">Overtrading</span><span className="frag"><svg viewBox="0 0 300 46" aria-hidden="true"><g stroke="#DCE8C0" strokeOpacity=".6">
            <line x1="10" x2="10" y1="6" y2="40"/><line x1="24" x2="24" y1="10" y2="36"/><line x1="38" x2="38" y1="4" y2="42"/><line x1="52" x2="52" y1="12" y2="34"/><line x1="66" x2="66" y1="6" y2="40"/><line x1="80" x2="80" y1="14" y2="38"/><line x1="94" x2="94" y1="4" y2="30"/><line x1="108" x2="108" y1="10" y2="42"/><line x1="122" x2="122" y1="8" y2="36"/><line x1="136" x2="136" y1="12" y2="40"/></g><text x="160" y="28" fill="#DCE8C0" fillOpacity=".6" fontSize="12" fontFamily="Space Grotesk, sans-serif">14 TRADES / DAY</text></svg><span className="meta">Activity ≠ progress</span></span></li>
          <li className="err"><span className="code meta">ERR · 04</span><span className="word">No Structure</span><span className="frag"><svg viewBox="0 0 300 46" aria-hidden="true"><circle cx="20" cy="30" r="2.5" fill="#DCE8C0" fillOpacity=".6"/><circle cx="60" cy="10" r="2.5" fill="#DCE8C0" fillOpacity=".6"/><circle cx="96" cy="36" r="2.5" fill="#DCE8C0" fillOpacity=".6"/><circle cx="140" cy="16" r="2.5" fill="#DCE8C0" fillOpacity=".6"/><circle cx="180" cy="28" r="2.5" fill="#DCE8C0" fillOpacity=".6"/><text x="210" y="27" fill="#DCE8C0" fillOpacity=".6" fontSize="12" fontFamily="Space Grotesk, sans-serif">HH? HL? —</text></svg><span className="meta">Trend · undefined</span></span></li>
          <li className="err"><span className="code meta">ERR · 05</span><span className="word">Poor Risk Control</span><span className="frag"><svg viewBox="0 0 300 46" aria-hidden="true"><line x1="0" x2="300" y1="12" y2="12" stroke="#DCE8C0" strokeOpacity=".5" strokeDasharray="6 4"/><line x1="0" x2="300" y1="34" y2="34" stroke="#DCE8C0" strokeOpacity=".5" strokeDasharray="6 4"/><line x1="120" x2="160" y1="6" y2="40" stroke="#DCE8C0" strokeOpacity=".8"/><line x1="160" x2="120" y1="6" y2="40" stroke="#DCE8C0" strokeOpacity=".8"/><text x="176" y="27" fill="#DCE8C0" fillOpacity=".6" fontSize="12" fontFamily="Space Grotesk, sans-serif">STOP · NONE</text></svg><span className="meta">Size · by feeling</span></span></li>
        </ol>
      </div>
    </section>
  )
}
