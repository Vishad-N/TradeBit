import Reveal from '../shared/Reveal.jsx'
import ReserveButton from '../components/ReserveButton.jsx'
import { EVENT } from '../content.js'

const DETAILS = [
  ['Date', EVENT.date],
  ['Time', EVENT.time],
  ['Where', 'Online'],
  ['Duration', '90 minutes'],
  ['Live Q&A', 'Included'],
  ['Chart', 'Market breakdown'],
]

export default function EventDetails() {
  return (
    <section className="event" id="event">
      <div className="wrap">
        <Reveal className="glass">
          <div className="dwrap">
            <div>
              <p className="label">Event details / Invitation</p>
              <h2>Live Trading Masterclass</h2>
            </div>
            <div>
              <dl className="dgrid">
                {DETAILS.map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <ReserveButton block>Reserve my seat</ReserveButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
