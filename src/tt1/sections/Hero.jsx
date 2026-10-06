import { useEffect, useRef } from 'react'
import Reveal from '../shared/Reveal.jsx'
import { useInView } from '../shared/useInView.js'
import { cx, prefersReducedMotion } from '../shared/utils.js'
import EventMeta from '../components/EventMeta.jsx'
import ReserveButton from '../components/ReserveButton.jsx'
import { EVENT } from '../content.js'
import { BitcoinAsset } from '../components/FloatingAssets.jsx'

const PRICE = 'M10 230 L50 200 L80 215 L120 160 L150 175 L190 120 L220 140 L260 90 L290 105 L330 60 L360 75 L410 40'

// Price line draws itself in, then the area, trend line and entry/stop annotations fade up.
// The whole chart drifts up slightly as the page starts scrolling.
function EntryChart() {
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
        viewBox="0 0 420 300"
        role="img"
        aria-label="Illustration of a price chart with a marked entry and a defined stop level"
      >
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6f9e96" stopOpacity=".75" />
            <stop offset="1" stopColor="#6f9e96" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="grid">
          <path d="M0 50H420M0 110H420M0 170H420M0 230H420M70 0V280M140 0V280M210 0V280M280 0V280M350 0V280" />
        </g>
        <path className={cx('ln draw', drawn && 'in')} pathLength="1" d={PRICE} style={{ strokeWidth: 1 }} />
      </svg>
    </div>
  )
}

export default function Hero({ ref }) {
  return (
    <section className="hero" ref={ref}>
      <BitcoinAsset />
      <div className="wrap">
        <Reveal className="glass g3">
          <div className="hgrid">
            <div>
              <p className="label hero-load-label">Live Trading Masterclass / 01</p>
              <h1 className="hero-load-h1">
                Master the <em>market.</em>
                <br />
                Without the noise.
              </h1>
              <p className="lead">
                A live educational session on market structure, trade selection, risk management and trading
                discipline, taught as one clear process instead of a pile of indicators.
              </p>
              <div className="cta-row hero-load-btn">
                <ReserveButton>Reserve my free seat</ReserveButton>
              </div>
            </div>
            <EntryChart />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
