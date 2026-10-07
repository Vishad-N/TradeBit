import Counter from './Counter.jsx';

// Two mentors. Satyendra Sir and "Ma'am" share one composition: mirrored arch portraits, the second one
// lighter and set lower so the pair reads as a staggered duo rather than two identical cards.
const MENTORS = [
  {
    key: 'satyendra',
    tone: 'dark',
    name: 'Satyendra Sir',
    // PHOTO: put the image in /public (e.g. public/mentors/satyendra.png) and set its path here.
    // Leave it empty to keep the illustrated placeholder.
    photo: '/public/mentors/satyendra.png',
    role: 'Mentor',
    story: [
      'Satyendra Sir started like most traders — chasing tips, switching indicators and wondering why nothing stayed consistent. The turning point wasn\'t a secret strategy. It was building a process and following it, trade after trade.',
      'Eight years and more than a thousand published breakdowns later, he teaches that same process: clear structure, defined risk and honest review. No hype and no shortcuts.',
    ],
  },
  {
    key: 'maam',
    tone: 'light',
    // TODO: replace with her name (and role / bio) once confirmed.
    name: 'Ma\'am',
    photo: '', // e.g. '/mentors/maam.png'
    role: 'Mentor',
    story: [
      'Alongside Satyendra Sir, Ma\'am teaches the same process-first approach: clear structure, defined risk and honest review of every trade.',
      'No hype and no shortcuts — just a repeatable way to read the market and stay consistent.',
    ],
  },
];

// Duotone arch portrait. Replace the <g className="person"> with the mentor's cut-out photograph.
// Gradient/clip ids are prefixed per mentor so two copies of this SVG on one page do not collide.
function Portrait({ uid, tone, name, photo }) {
  const dark = tone === 'dark';
  const c = dark
    ? { arch: '#151814', accent: '#DCE8C0', contour: '#DCE8C0', orbit: '#B8D83D', collar: '#DCE8C0', hair: '#151814', skinA: '#151814', skinB: '#2b3026', skinC: '#DCE8C0', skinCo: 0.85, body: ['#151814', '#232720', '#5d6452'], rim: '#DCE8C0' }
    : { arch: '#DCE8C0', accent: '#151814', contour: '#151814', orbit: '#151814', collar: '#F3F4EF', hair: '#151814', skinA: '#2b3026', skinB: '#3a4033', skinC: '#151814', skinCo: 1, body: ['#151814', '#1d211a', '#3a4033'], rim: '#151814' };
  const arch = 'M40 820 V330 C40 170 160 60 300 60 C440 60 560 170 560 330 V820 Z';
  return (
    <svg viewBox="0 0 600 820" preserveAspectRatio="xMidYMax meet" role="img" aria-label={`Duotone portrait of mentor ${name} framed by an arch and an orbit line`}>
      <defs>
        <linearGradient id={`skin-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c.skinA} /><stop offset=".62" stopColor={c.skinB} /><stop offset="1" stopColor={c.skinC} stopOpacity={c.skinCo} /></linearGradient>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c.body[0]} /><stop offset=".75" stopColor={c.body[1]} /><stop offset="1" stopColor={c.body[2]} /></linearGradient>
        <clipPath id={`clip-${uid}`}><path d={arch} /></clipPath>
      </defs>
      <path d="M380 820 C420 620 520 560 600 540 V820 Z" fill={c.accent} />
      <path d={arch} fill={c.arch} />
      <g clipPath={`url(#clip-${uid})`} fill="none" stroke={c.contour} strokeOpacity=".08">
        <path d="M80 820 V340 C80 200 180 100 300 100 C420 100 520 200 520 340 V820" />
        <path d="M120 820 V350 C120 230 200 140 300 140 C400 140 480 230 480 350 V820" />
        <path d="M160 820 V360 C160 260 220 180 300 180 C380 180 440 260 440 360 V820" />
      </g>
      <ellipse className="dr" cx="300" cy="360" rx="290" ry="120" fill="none" stroke={c.orbit} strokeWidth="1.6" transform={dark ? 'rotate(-16 300 360)' : 'rotate(16 300 360)'} />
      <circle cx={dark ? 560 : 40} cy="283" r="6" fill="#B8D83D" />
      {photo ? (
        // A real photo fills the arch (cropped to it, aligned to the bottom). A cut-out PNG/WEBP with a
        // transparent background looks best, because the arch colour shows around the person.
        <image href={photo} x="40" y="60" width="520" height="760" preserveAspectRatio="xMidYMax slice" clipPath={`url(#clip-${uid})`} />
      ) : (
      <g className="person" clipPath={`url(#clip-${uid})`}>
        {!dark &&<path d="M190 392 C180 262 236 228 300 228 C368 228 416 262 410 392 C408 480 428 550 450 640 L150 640 C172 550 192 480 190 392Z" fill={c.hair} />}
        <path d="M90 820 C110 640 190 575 300 566 C410 575 490 640 510 820Z" fill={`url(#body-${uid})`} />
        <path d="M258 566 L300 670 L342 566" fill={c.collar} fillOpacity=".9" />
        <path d="M288 590 L300 670 L312 590 L300 580Z" fill="#151814" />
        <rect x="262" y="478" width="76" height="104" rx="30" fill={`url(#skin-${uid})`} />
        <ellipse cx="300" cy="390" rx="96" ry="120" fill={`url(#skin-${uid})`} />
        <path d="M202 372 C198 282 250 250 304 250 C370 250 404 292 398 364 C390 322 358 304 312 304 C264 304 226 322 202 372Z" fill={c.hair} />
        <path d={dark ? 'M390 344 C402 384 402 432 378 480' : 'M210 344 C198 384 198 432 222 480'} stroke="#B8D83D" strokeWidth="2.5" fill="none" strokeOpacity=".8" />
      </g>
      )}
      <path d={arch.replace(' Z', '')} fill="none" stroke={c.rim} strokeOpacity=".2" />
    </svg>
  );
}

export default function Mentor() {
  return (
    <section className="mentor" id="mentor" aria-labelledby="mentor-t">
      <div className="mentor-head">
        <div>
          <span className="label rv">Meet Your Mentors</span>
          <h2 id="mentor-t" className="h-l split"><span className="ln"><span>Learn From</span></span><span className="ln"><span>People Who</span></span><span className="ln"><span><span className="hl">Understand</span> The Market.</span></span></h2>
        </div>
      </div>

      <div className="duo">
        {MENTORS.map((m, i) => (
          <article key={m.key} className={`mcard m${i + 1} ${m.tone}`}>
            <figure className="portrait">
              <div className="portrait-art" data-speed={i === 0 ? '0.04' : '0.02'}>
                <Portrait uid={m.key} tone={m.tone} name={m.name} photo={m.photo} />
              </div>
              <figcaption className="portrait-cap"><b>{m.name}</b><span className="meta">{m.role}</span></figcaption>
            </figure>
            <div className={`story rv d${i + 1}`}>
              {m.story.map(p => <p key={p}>{p}</p>)}
            </div>
          </article>
        ))}
      </div>

      <div className="mstats rv d2">
        <div><b><Counter as="em" to={8} suf="+" /></b><span>Years Experience</span></div>
        <div><Counter as="b" to={25} suf="K+" /><span>Students</span></div>
        <div><Counter as="b" to={1000} suf="+" /><span>Market Analyses</span></div>
      </div>
      <blockquote className="quote rv d3">“The market will never be predictable. Your process can be — that's the only edge I've ever trusted.”</blockquote>
    </section>
  )
}
