import { memo, useId } from 'react';

// Six premium animated SVG heroes, one per market. Motion is CSS (see .ha-* in courses-fx.css) so it costs almost nothing
// and is switched off by prefers-reduced-motion. Colours are fixed per illustration; the page accent follows the same key.

const Glow = ({ id, color }) => (
  <>
    <defs><radialGradient id={id}><stop offset="0" stopColor={color} stopOpacity=".5" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient></defs>
    <circle className="ha-pulse" cx="200" cy="205" r="190" fill={`url(#${id})`} />
  </>
);

const Sparkle = ({ x, y, d = 0, s = 1, c = '#fff' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path className="ha-twinkle" style={{ animationDelay: `${d}s` }} fill={c} d="M0-10C1.5-3 3-1.5 10 0 3 1.5 1.5 3 0 10-1.5 3-3 1.5-10 0-3-1.5-1.5-3 0-10Z" />
  </g>
);

function Gold({ u }) {
  const ingot = (x, y, w, h, k) => (
    <g key={k}>
      <path d={`M${x - w / 2 + 16} ${y}L${x + w / 2 - 16} ${y}L${x + w / 2 - 34} ${y - 20}L${x - w / 2 + 34} ${y - 20}Z`} fill={`url(#${u}t)`} />
      <path d={`M${x - w / 2 + 16} ${y}L${x + w / 2 - 16} ${y}L${x + w / 2} ${y + h}L${x - w / 2} ${y + h}Z`} fill={`url(#${u}f)`} />
      <path d={`M${x - w / 2 + 24} ${y + 10}L${x + w / 2 - 24} ${y + 10}`} stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
  return (
    <>
      <Glow id={`${u}g`} color="#e8b923" />
      <defs>
        <linearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".5" stopColor="#e8b923" /><stop offset="1" stopColor="#a47a0b" /></linearGradient>
        <linearGradient id={`${u}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e8b923" /></linearGradient>
      </defs>
      <g className="ha-float">
        {ingot(130, 300, 150, 56, 'a')}{ingot(270, 300, 150, 56, 'b')}{ingot(200, 226, 150, 56, 'c')}
      </g>
      <Sparkle x={72} y={150} d={0} s={1.3} c="#ffe08a" /><Sparkle x={330} y={120} d={0.8} s={1} c="#fff" /><Sparkle x={290} y={210} d={1.5} s={0.8} c="#ffe08a" /><Sparkle x={110} y={230} d={2.1} s={0.7} />
      <circle className="ha-rise" cx="200" cy="160" r="36" fill="none" stroke="#ffe08a" strokeWidth="3" strokeDasharray="4 8" />
      <text x="200" y="172" textAnchor="middle" className="ha-text" fontSize="34" fill="#ffe08a">Au</text>
    </>
  );
}

function Silver({ u }) {
  return (
    <>
      <Glow id={`${u}g`} color="#c4ccd8" />
      <defs>
        <linearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#b6bfcc" /><stop offset="1" stopColor="#6c7686" /></linearGradient>
        <linearGradient id={`${u}f`} x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2f5f9" /><stop offset="1" stopColor="#8e98a8" /></linearGradient>
      </defs>
      <ellipse className="ha-spin-slow" cx="200" cy="205" rx="176" ry="58" fill="none" stroke="#c4ccd8" strokeOpacity=".5" strokeDasharray="2 10" strokeWidth="3" strokeLinecap="round" />
      <g className="ha-flip ha-float">
        <circle cx="200" cy="205" r="118" fill={`url(#${u}r)`} />
        <circle cx="200" cy="205" r="100" fill={`url(#${u}f)`} stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
        <circle cx="200" cy="205" r="86" fill="none" stroke="#5c6575" strokeOpacity=".5" strokeWidth="2" strokeDasharray="3 7" />
        <text x="200" y="228" textAnchor="middle" className="ha-text" fontSize="76" fill="#3a4352">Ag</text>
        <text x="200" y="262" textAnchor="middle" className="ha-text" fontSize="14" fill="#3a4352" letterSpacing="6">SILVER</text>
      </g>
      <Sparkle x={86} y={120} d={0.3} s={1.2} /><Sparkle x={322} y={140} d={1.1} s={1} /><Sparkle x={300} y={300} d={1.8} s={0.8} /><Sparkle x={96} y={300} d={0.7} s={0.7} />
    </>
  );
}

function Btc({ u }) {
  const nodes = [[200, 30], [370, 205], [200, 380], [30, 205]];
  return (
    <>
      <Glow id={`${u}g`} color="#f7931a" />
      <defs><linearGradient id={`${u}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffc15a" /><stop offset="1" stopColor="#e07a00" /></linearGradient></defs>
      <g className="ha-spin"><circle cx="200" cy="205" r="172" fill="none" stroke="#f7931a" strokeOpacity=".4" strokeWidth="2" strokeDasharray="1 12" strokeLinecap="round" />{nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y + 0} r="6" fill="#ffc15a" />)}</g>
      <g className="ha-spin-rev"><circle cx="200" cy="205" r="140" fill="none" stroke="#f7931a" strokeOpacity=".3" strokeWidth="1.5" /><circle cx="340" cy="205" r="5" fill="#fff" /></g>
      {[[200, 56, 200, 100], [200, 354, 200, 310], [48, 205, 92, 205], [352, 205, 308, 205]].map(([a, b, c, d], i) => <line key={i} className="ha-dash" x1={a} y1={b} x2={c} y2={d} stroke="#ffc15a" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" />)}
      <g className="ha-float">
        <circle cx="200" cy="205" r="104" fill={`url(#${u}c)`} />
        <circle cx="200" cy="205" r="90" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
        <text x="200" y="244" textAnchor="middle" className="ha-text" fontSize="128" fill="#fff">B</text>
        <path d="M184 140v-18M214 140v-18M184 288v-18M214 288v-18" stroke="#fff" strokeWidth="9" strokeLinecap="round" transform="translate(0 -6)" />
      </g>
      <Sparkle x={70} y={90} d={0.2} s={1} c="#ffc15a" /><Sparkle x={332} y={86} d={1.2} s={1.2} /><Sparkle x={330} y={330} d={0.6} s={0.9} c="#ffc15a" />
    </>
  );
}

function Eth({ u }) {
  return (
    <>
      <Glow id={`${u}g`} color="#38d6e8" />
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8f3ff" /><stop offset="1" stopColor="#2aa6e0" /></linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38d6e8" /><stop offset="1" stopColor="#3a63e6" /></linearGradient>
        <linearGradient id={`${u}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b8cff" /><stop offset="1" stopColor="#7c4fe0" /></linearGradient>
      </defs>
      <ellipse className="ha-spin-slow" cx="200" cy="215" rx="170" ry="40" fill="none" stroke="#38d6e8" strokeOpacity=".45" strokeWidth="2" />
      <ellipse className="ha-spin-rev" cx="200" cy="215" rx="130" ry="26" fill="none" stroke="#6b8cff" strokeOpacity=".5" strokeWidth="2" strokeDasharray="4 8" />
      <g className="ha-float">
        <path d="M200 40L318 214L200 168Z" fill={`url(#${u}a)`} />
        <path d="M200 40L82 214L200 168Z" fill={`url(#${u}b)`} />
        <path d="M200 168L318 214L200 258Z" fill={`url(#${u}b)`} opacity=".9" />
        <path d="M200 168L82 214L200 258Z" fill={`url(#${u}d)`} opacity=".95" />
        <path d="M200 276L318 232L200 370Z" fill={`url(#${u}a)`} opacity=".9" />
        <path d="M200 276L82 232L200 370Z" fill={`url(#${u}d)`} />
      </g>
      {[[92, 330, 0], [312, 90, 1.2], [330, 300, 2.2], [70, 110, 0.6]].map(([x, y, d], i) => <g key={i} transform={`translate(${x} ${y})`}><path className="ha-rise" style={{ animationDelay: `${d}s` }} d="M0-9L7 0 0 9-7 0Z" fill="#a8f3ff" /></g>)}
      <Sparkle x={308} y={160} d={0.4} s={0.9} />
    </>
  );
}

function Sol({ u }) {
  const bar = (y, flip, cls) => (
    <path className={cls} d={flip ? 'M96 ' + y + 'H300L268 ' + (y + 52) + 'H64Z' : 'M64 ' + y + 'H268L300 ' + (y + 52) + 'H96Z'} fill={`url(#${u}b)`} />
  );
  return (
    <>
      <Glow id={`${u}g`} color="#a66bff" />
      <defs><linearGradient id={`${u}b`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#14f195" /><stop offset=".5" stopColor="#6f7bff" /><stop offset="1" stopColor="#a66bff" /></linearGradient></defs>
      <g stroke="#a66bff" strokeOpacity=".22" strokeWidth="1">{[...Array(8)].map((_, i) => <line key={i} x1="20" x2="380" y1={70 + i * 40} y2={70 + i * 40} />)}</g>
      <g transform="translate(18 0)">
        {bar(100, false, 'ha-slide-a')}
        {bar(176, true, 'ha-slide-b')}
        {bar(252, false, 'ha-slide-a')}
      </g>
      {[[54, 80], [346, 330], [330, 96], [70, 322]].map(([x, y], i) => <circle key={i} className="ha-twinkle" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy={y} r="4" fill={i % 2 ? '#14f195' : '#a66bff'} />)}
    </>
  );
}

function Forex({ u }) {
  const sym = [['€', '#6fa0ff', 0], ['$', '#2ee59d', -4], ['£', '#c58bff', -8], ['¥', '#ff7a90', -12]];
  return (
    <>
      <Glow id={`${u}g`} color="#4f9dff" />
      <defs><radialGradient id={`${u}s`} cx=".35" cy=".3"><stop offset="0" stopColor="#4f9dff" stopOpacity=".55" /><stop offset="1" stopColor="#0f1d4a" stopOpacity=".85" /></radialGradient></defs>
      <circle cx="200" cy="205" r="112" fill={`url(#${u}s)`} stroke="#4f9dff" strokeOpacity=".6" strokeWidth="2" />
      <g fill="none" stroke="#7fb6ff" strokeOpacity=".5" strokeWidth="1.4">
        <ellipse className="ha-meridian" cx="200" cy="205" rx="112" ry="112" /><ellipse className="ha-meridian b" cx="200" cy="205" rx="112" ry="112" />
        <ellipse cx="200" cy="205" rx="112" ry="38" /><line x1="88" y1="205" x2="312" y2="205" /><path d="M104 148Q200 172 296 148M104 262Q200 238 296 262" />
      </g>
      <path className="ha-dash" d="M120 170Q200 40 284 150" fill="none" stroke="#2ee59d" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" />
      <path className="ha-dash" d="M130 260Q210 370 300 250" fill="none" stroke="#ff7a90" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" />
      <ellipse cx="200" cy="205" rx="168" ry="168" fill="none" stroke="#4f9dff" strokeOpacity=".3" strokeDasharray="2 10" strokeWidth="2" strokeLinecap="round" />
      {sym.map(([t, c, b]) => (
        <g key={t}>
          <circle r="25" fill="#0f1730" stroke={c} strokeWidth="2.5" />
          <text className="ha-text" y="9" textAnchor="middle" fontSize="26" fill={c}>{t}</text>
          <animateMotion dur="16s" begin={`${b}s`} repeatCount="indefinite" path="M200 37A168 168 0 0 1 200 373A168 168 0 0 1 200 37Z" />
        </g>
      ))}
    </>
  );
}

const ART = { gold: Gold, silver: Silver, btc: Btc, eth: Eth, sol: Sol, forex: Forex };
export const HERO_KEYS = Object.keys(ART);

/** One of six animated market illustrations. `kind` is a key of HERO_KEYS. Decorative: hidden from assistive tech. */
function HeroArt({ kind = 'gold', className = '' }) {
  const u = useId().replace(/:/g, '');
  const Art = ART[kind] || Gold;
  return (
    <svg className={`ha ${className}`} viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <Art u={u} />
    </svg>
  );
}
export default memo(HeroArt);
