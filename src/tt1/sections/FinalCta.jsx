import { useRef } from 'react'
import Reveal from '../shared/Reveal.jsx'
import { useInView } from '../shared/useInView.js'
import { cx } from '../shared/utils.js'
import EventMeta from '../components/EventMeta.jsx'
import ReserveButton from '../components/ReserveButton.jsx'
import { EVENT } from '../content.js'

// No panel here: the closing line sits straight on the snow.
export default function FinalCta() {
  const buttonRef = useRef(null)
  const buttonIn = useInView(buttonRef)
  return (
    <section className="final">
      <div className="wrap">
        <Reveal as="h2" className="shade">
          Stop chasing
          <br />
          the market.<span>Start reading it.</span>
        </Reveal>
        <ReserveButton ref={buttonRef} className={cx('rv', buttonIn && 'in')}>
          Reserve my seat
        </ReserveButton>
        <EventMeta items={['Live', 'Online', EVENT.date, EVENT.time]} className="shade" />
      </div>
    </section>
  )
}
