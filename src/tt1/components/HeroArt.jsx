import { useEffect, useRef } from 'react'
import { useInView } from '../shared/useInView.js'
import { cx, prefersReducedMotion } from '../shared/utils.js'

// Rising price path through ten swing points; a small candle sits on every point.
const PTS = [[34, 318], [84, 292], [120, 304], [170, 250], [206, 262], [258, 200], [294, 214], [348, 144], [382, 156], [434, 84]]
const PRICE = 'M' + PTS.map(p => p.join(' ')).join(' L')
const AREA = PRICE + ' L434 340 L34 340 Z'
// 10 x 10 grid of dots: one hundred traders, one gold dot.
const DOTS = Array.from({ length: 100 }, (_, i) => [i % 10, Math.floor(i / 10)])

// "1% Club" artwork: orbit arcs, a rising price line with candles, an entry/target marker and a 100-dot grid with
// a single gold dot. The price line draws itself in, then everything else fades up. The whole chart drifts up
// slightly as the page starts scrolling.
export default function EntryChart() {
  const chartRef = useRef(null)
  const svgRef = useRef(null)
  const drawn = useInView(svgRef)

  useEffect(() => {
    if (prefersReducedMotion) return
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 1.2)
        chartRef.current.style.transform = `translateY(${(window.scrollY * -0.04).toFixed(1)}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fade = cx('fadein', drawn && 'in')
  return (
    <div className="chart" ref={chartRef}>
      <svg
        ref={svgRef}
        viewBox="0 0 470 380"
        role="img"
        aria-label="Illustration of a rising price line with a marked entry and target, beside a grid of one hundred dots where a single gold dot stands for the top one percent"
      >
        <defs>
          <linearGradient id="cg-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f8a70" stopOpacity=".38" />
            <stop offset="1" stopColor="#1f8a70" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cg-line" gradientUnits="userSpaceOnUse" x1="34" y1="0" x2="434" y2="0">
            <stop offset="0" stopColor="#10201c" />
            <stop offset=".6" stopColor="#1f8a70" />
            <stop offset="1" stopColor="#b8913f" />
          </linearGradient>
          <radialGradient id="cg-gold" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#f0d58f" />
            <stop offset=".45" stopColor="#d7b56d" stopOpacity=".55" />
            <stop offset="1" stopColor="#d7b56d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cg-badge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9cd8b" />
            <stop offset="1" stopColor="#b8913f" />
          </linearGradient>
          <filter id="cg-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#10201c" floodOpacity=".16" />
          </filter>
        </defs>

        {/* orbit arcs */}
        <g fill="none" stroke="#10201c" strokeOpacity=".1">
          <circle cx="440" cy="60" r="150" />
          <circle cx="440" cy="60" r="112" strokeDasharray="2 6" />
          <circle cx="440" cy="60" r="74" />
        </g>
        <g className="grid">
          <path d="M20 90H450M20 160H450M20 230H450M20 300H450M100 40V340M200 40V340M300 40V340M400 40V340" />
        </g>

        {/* the 1% dot grid */}
        <g className={fade} transform="translate(34 28)">
          {DOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x * 10} cy={y * 10} r="1.8" fill="#10201c" fillOpacity=".28" />
          ))}
          <circle cx="90" cy="0" r="22" fill="url(#cg-gold)" />
          <circle cx="90" cy="0" r="4.4" fill="#b8913f" />
          <circle cx="90" cy="0" r="9" fill="none" stroke="#b8913f" strokeOpacity=".7" />
        </g>

        {/* area + line */}
        <path className={fade} d={AREA} fill="url(#cg-area)" />
        <path className={cx('ln draw', drawn && 'in')} pathLength="1" d={PRICE} style={{ strokeWidth: 3, stroke: 'url(#cg-line)' }} />

        {/* candles on each swing point */}
        <g className={fade} strokeLinecap="round">
          {PTS.map(([x, y], i) => {
            const up = i % 3 !== 2
            const body = 14 + (i % 4) * 4
            const col = up ? '#1f8a70' : '#10201c'
            return (
              <g key={i} stroke={col} strokeOpacity=".75">
                <path d={`M${x} ${y - body - 8}V${y + body + 8}`} strokeWidth="1.2" />
                <rect x={x - 4.5} y={y - body / 2} width="9" height={body} rx="1.5" fill={col} fillOpacity=".85" stroke="none" />
              </g>
            )
          })}
        </g>

        {/* entry, stop, target */}
        <g className={fade}>
          <path d="M120 304H434" stroke="#10201c" strokeOpacity=".35" strokeDasharray="3 5" />
          <path d="M120 340H434" stroke="#9b3d3d" strokeOpacity=".5" strokeDasharray="3 5" />
          <circle cx="120" cy="304" r="7" fill="#e7f0ea" stroke="#10201c" strokeWidth="2" />
          <g transform="translate(66 322)" filter="url(#cg-soft)">
            <rect width="54" height="22" rx="11" fill="#10201c" />
            <text x="27" y="15" textAnchor="middle" fontSize="10" letterSpacing="1" style={{ fill: '#e7f0ea' }}>ENTRY</text>
          </g>
          <g transform="translate(340 28)" filter="url(#cg-soft)">
            <rect width="74" height="24" rx="12" fill="#10201c" />
            <text x="37" y="16" textAnchor="middle" fontSize="10" letterSpacing="1" style={{ fill: '#e7f0ea' }}>TARGET 3R</text>
          </g>
          <circle cx="434" cy="84" r="16" fill="url(#cg-gold)" />
          <circle cx="434" cy="84" r="6.5" fill="#b8913f" stroke="#e7f0ea" strokeWidth="2.5" />
        </g>

        {/* top 1% badge */}
        <g className={fade} transform="translate(206 110)" filter="url(#cg-soft)">
          <rect width="152" height="56" rx="16" fill="#e7f0ea" stroke="#10201c" strokeOpacity=".14" />
          <circle cx="30" cy="28" r="17" fill="url(#cg-badge)" />
          <path d="M30 19.5L32.6 25H38.5L33.8 28.6L35.6 34.5L30 31L24.4 34.5L26.2 28.6L21.5 25H27.4Z" fill="#fffaf0" />
          <text x="56" y="25" fontSize="15" fontWeight="700" letterSpacing=".5" style={{ fill: '#10201c', fontFamily: 'var(--f-head)' }}>Top 1%</text>
          <text x="56" y="40" fontSize="8.5" letterSpacing="1.2" style={{ fill: '#3d5249' }}>DISCIPLINED</text>
        </g>
      </svg>
    </div>
  )
}
