import Counter from './Counter.jsx';

export default function Mentor() {
  return (
    <section className="mentor" id="mentor" aria-labelledby="mentor-t">
      <figure className="portrait">
        <div className="portrait-art" data-speed="0.04">
          {/* Duotone portrait artwork — replace the <g id="person"> with the mentor's cut-out photograph */}
          <svg viewBox="0 0 600 820" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Duotone portrait of mentor Arjun Mehra framed by a charcoal arch, a pale lime shape and a lime orbit line">
            <defs>
              <linearGradient id="dt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#151814"/><stop offset=".62" stopColor="#2b3026"/><stop offset="1" stopColor="#DCE8C0" stopOpacity=".85"/></linearGradient>
              <linearGradient id="dt2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#151814"/><stop offset=".75" stopColor="#232720"/><stop offset="1" stopColor="#5d6452"/></linearGradient>
              <clipPath id="archClip"><path d="M40 820 V330 C40 170 160 60 300 60 C440 60 560 170 560 330 V820 Z"/></clipPath>
            </defs>
            <path d="M380 820 C420 620 520 560 600 540 V820 Z" fill="#DCE8C0"/>
            <path d="M40 820 V330 C40 170 160 60 300 60 C440 60 560 170 560 330 V820 Z" fill="#151814"/>
            <g clipPath="url(#archClip)" fill="none" stroke="#DCE8C0" strokeOpacity=".08">
              <path d="M80 820 V340 C80 200 180 100 300 100 C420 100 520 200 520 340 V820"/>
              <path d="M120 820 V350 C120 230 200 140 300 140 C400 140 480 230 480 350 V820"/>
              <path d="M160 820 V360 C160 260 220 180 300 180 C380 180 440 260 440 360 V820"/>
            </g>
            <ellipse className="dr" cx="300" cy="360" rx="290" ry="120" fill="none" stroke="#B8D83D" strokeWidth="1.6" transform="rotate(-16 300 360)"/>
            <circle cx="560" cy="283" r="6" fill="#B8D83D"/>
            <g id="person" clipPath="url(#archClip)">
              <path d="M90 820 C110 640 190 575 300 566 C410 575 490 640 510 820Z" fill="url(#dt2)"/>
              <path d="M258 566 L300 670 L342 566" fill="#DCE8C0" fillOpacity=".9"/>
              <path d="M288 590 L300 670 L312 590 L300 580Z" fill="#151814"/>
              <rect x="262" y="478" width="76" height="104" rx="30" fill="url(#dt)"/>
              <ellipse cx="300" cy="390" rx="96" ry="120" fill="url(#dt)"/>
              <path d="M202 372 C198 282 250 250 304 250 C370 250 404 292 398 364 C390 322 358 304 312 304 C264 304 226 322 202 372Z" fill="#151814"/>
              <path d="M390 344 C402 384 402 432 378 480" stroke="#B8D83D" strokeWidth="2.5" fill="none" strokeOpacity=".8"/>
            </g>
            <path d="M40 820 V330 C40 170 160 60 300 60 C440 60 560 170 560 330 V820" fill="none" stroke="#DCE8C0" strokeOpacity=".2"/>
          </svg>
        </div>
        <figcaption className="portrait-cap"><b>Arjun Mehra</b><span className="meta">Founder · Head Mentor</span></figcaption>
      </figure>
      <div className="mentor-copy">
        <span className="label rv">Meet Your Mentor</span>
        <h2 id="mentor-t" className="h-l split"><span className="ln"><span>Learn From</span></span><span className="ln"><span>Someone Who</span></span><span className="ln"><span><span className="hl">Understands</span> The Market.</span></span></h2>
        <div className="story rv d2">
          <p>Arjun started like most traders — chasing tips, switching indicators and wondering why nothing stayed consistent. The turning point wasn't a secret strategy. It was building a process and following it, trade after trade.</p>
          <p>Eight years and more than a thousand published breakdowns later, he teaches that same process: clear structure, defined risk and honest review. No hype and no shortcuts.</p>
        </div>
        <div className="mstats rv d3">
          <div><b><Counter as="em" to={8} suf="+" /></b><span>Years Experience</span></div>
          <div><Counter as="b" to={25} suf="K+" /><span>Students</span></div>
          <div><Counter as="b" to={1000} suf="+" /><span>Market Analyses</span></div>
        </div>
        <blockquote className="quote rv d3">“The market will never be predictable. Your process can be — that's the only edge I've ever trusted.”</blockquote>
        <div className="sign rv d4">
          <svg viewBox="0 0 170 60" fill="none" aria-label="Signature of Arjun Mehra"><path className="dr" d="M6 44 C18 20 30 8 36 14 C42 22 22 46 30 46 C40 46 48 22 56 24 C62 26 52 44 60 44 C70 44 74 26 82 28 C88 30 80 44 90 42 C104 38 110 16 118 18 C126 22 112 46 124 44 C138 40 146 30 164 26" stroke="#151814" strokeWidth="1.8" strokeLinecap="round"/><path className="dr" d="M20 52 H150" stroke="#B8D83D" strokeWidth="2"/></svg>
          <span className="meta">Arjun Mehra<br />Founder, TradeBit</span>
        </div>
      </div>
    </section>
  )
}
