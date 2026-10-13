// Illustration for the Books page: a stack of books with an open book on top, and a rising candlestick chart
// growing out of its pages. Drawn in the site's four colours; pure SVG, so it stays sharp at any size.
const INK = '#151814';
const LIME = '#B8D83D';
const PALE = '#DCE8C0';
const PAPER = '#F3F4EF';

// [x, wickTop, bodyTop, bodyBottom, wickBottom, up]
const CANDLES = [
  [205, 166, 180, 202, 208, false],
  [240, 148, 160, 192, 204, true],
  [275, 118, 134, 172, 186, true],
  [310, 94, 106, 148, 162, true],
  [345, 54, 70, 120, 134, true],
];

const CHIPS = [
  { x: 14, y: 116, w: 74, label: 'SMC', d: 0 },
  { x: 410, y: 150, w: 68, label: 'ICT', d: 1.2 },
  { x: 6, y: 336, w: 128, label: 'PRICE ACTION', d: 2.1 },
];

export default function BooksArt() {
  return (
    <svg className="bk-svg" viewBox="0 0 520 560" role="img" aria-label="A stack of books with a rising candlestick chart growing out of an open book">
      {/* topographic rings, the site's quiet background motif */}
      <g fill="none" stroke={INK} strokeOpacity=".09">
        {[300, 258, 216, 174, 132].map(r => <ellipse key={r} cx="260" cy="300" rx={r} ry={r * 0.86} />)}
      </g>
      {/* an orbit line passing behind and in front of the stack */}
      <ellipse cx="260" cy="300" rx="236" ry="74" fill="none" stroke={INK} strokeOpacity=".28" strokeDasharray="3 7" transform="rotate(-14 260 300)" />
      <circle cx="466" cy="236" r="6" fill={LIME} />

      {/* ground shadow */}
      <ellipse cx="262" cy="486" rx="190" ry="14" fill={INK} opacity=".12" />

      {/* books, bottom to top */}
      <g strokeLinejoin="round">
        <rect x="86" y="424" width="352" height="54" rx="8" fill={INK} />
        <rect x="108" y="424" width="9" height="54" fill={LIME} />
        <rect x="128" y="424" width="4" height="54" fill={PALE} />
        <rect x="190" y="444" width="120" height="6" rx="3" fill={PALE} opacity=".55" />
        <rect x="190" y="458" width="76" height="5" rx="2.500" fill={PALE} opacity=".3" />

        <rect x="118" y="368" width="292" height="54" rx="8" fill={LIME} stroke={INK} strokeWidth="2.500" />
        <rect x="396" y="368" width="5" height="54" fill={INK} opacity=".18" />
        <rect x="142" y="368" width="8" height="54" fill={INK} />
        <rect x="170" y="388" width="104" height="6" rx="3" fill={INK} opacity=".7" />
        <rect x="170" y="402" width="64" height="5" rx="2.500" fill={INK} opacity=".35" />

        <rect x="150" y="312" width="272" height="54" rx="8" fill={PAPER} stroke={INK} strokeWidth="2.500" />
        <rect x="174" y="312" width="7" height="54" fill={INK} />
        <rect x="190" y="312" width="3" height="54" fill={LIME} />
        <rect x="222" y="332" width="116" height="6" rx="3" fill={INK} opacity=".7" />
        <rect x="222" y="346" width="72" height="5" rx="2.500" fill={INK} opacity=".35" />

        <rect x="112" y="258" width="274" height="52" rx="8" fill={PALE} stroke={INK} strokeWidth="2.500" />
        <rect x="360" y="258" width="5" height="52" fill={INK} opacity=".16" />
        <rect x="136" y="258" width="8" height="52" fill={INK} />
        <rect x="164" y="278" width="96" height="6" rx="3" fill={INK} opacity=".7" />
      </g>

      {/* open book on top */}
      <g stroke={INK} strokeWidth="2.500" strokeLinejoin="round" strokeLinecap="round">
        <path d="M256 256 C226 236 168 232 128 244 L128 258 L256 258 Z" fill={PAPER} />
        <path d="M264 256 C294 236 352 232 392 244 L392 258 L264 258 Z" fill={PAPER} />
        <path d="M256 224 C226 206 168 202 128 214 L128 244 C168 232 226 236 256 256 Z" fill={PAPER} />
        <path d="M264 224 C294 206 352 202 392 214 L392 244 C352 232 294 236 264 256 Z" fill={PAPER} />
        <path d="M256 224 V256 M264 224 V256" fill="none" />
      </g>
      <g stroke={INK} strokeOpacity=".28" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M144 226 C176 218 214 220 244 232" />
        <path d="M144 236 C176 228 214 230 244 242" />
        <path d="M276 232 C306 220 344 218 376 226" />
        <path d="M276 242 C306 230 344 228 376 236" />
      </g>

      {/* the chart growing out of the pages */}
      <g className="bk-candles" strokeLinecap="round">
        {CANDLES.map(([x, wt, bt, bb, wb, up], i) => (
          <g key={x} className="bk-candle" style={{ '--i': i }}>
            <line x1={x} x2={x} y1={wt} y2={wb} stroke={INK} strokeWidth="2.500" />
            <rect x={x - 10} y={bt} width="20" height={bb - bt} rx="3" fill={up ? LIME : INK} stroke={INK} strokeWidth="2.500" />
          </g>
        ))}
      </g>
      <polyline className="bk-trend" points="205,180 240,160 275,134 310,106 345,70 384,40" fill="none" stroke={INK} strokeWidth="2.500" strokeDasharray="5 7" strokeLinecap="round" />
      <circle cx="384" cy="40" r="15" fill="none" stroke={LIME} strokeWidth="2" opacity=".7" />
      <circle cx="384" cy="40" r="7" fill={LIME} stroke={INK} strokeWidth="2.500" />

      {/* topic tags */}
      {CHIPS.map(c => (
        <g key={c.label} className="bk-chip" style={{ '--d': `${c.d}s` }}>
          <rect x={c.x} y={c.y} width={c.w} height="32" rx="16" fill={PAPER} stroke={INK} strokeWidth="2" />
          <rect x={c.x + 12} y={c.y + 12} width="8" height="8" fill={LIME} />
          <text x={c.x + 28} y={c.y + 21} fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="11" fontWeight="600" letterSpacing="1.600" fill={INK}>{c.label}</text>
        </g>
      ))}
    </svg>
  );
}
