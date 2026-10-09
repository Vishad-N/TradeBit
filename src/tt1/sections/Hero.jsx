import Reveal from '../shared/Reveal.jsx'
import ReserveButton from '../components/ReserveButton.jsx'
import { BitcoinAsset } from '../components/FloatingAssets.jsx'
import EntryChart from '../components/HeroArt.jsx'

export default function Hero({ ref }) {
  return (
    <section className="hero" ref={ref}>
      <BitcoinAsset />
      <div className="wrap">
        <Reveal className="glass g3">
          <div className="hgrid">
            <div>
              <p className="label hero-load-label">1% Club · Live Trading Masterclass</p>
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
