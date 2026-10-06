import { useRef } from 'react'
import Reveal from '../shared/Reveal.jsx'
import { useInView } from '../shared/useInView.js'
import { cx } from '../shared/utils.js'
import BitcoinCoin from '../components/BitcoinCoin.jsx'
import EventMeta from '../components/EventMeta.jsx'
import ReserveButton from '../components/ReserveButton.jsx'
import { EVENT } from '../content.js'

// No panel here: the closing line sits straight on the background.
export default function FinalCta() {
  const buttonRef = useRef(null)
  const buttonIn = useInView(buttonRef)
  return (
    <section className="final">
      <div className="wrap">
        <BitcoinCoin />
        <Reveal as="h2" className="shade">
          Stop chasing
          <br />
          the market.<span>Start reading it.</span>
        </Reveal>
        <ReserveButton ref={buttonRef} className={cx('rv', buttonIn && 'in')}>
          Reserve my free seat
        </ReserveButton>
      </div>
    </section>
  )
}
