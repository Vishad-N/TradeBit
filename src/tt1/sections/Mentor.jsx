import Reveal from '../shared/Reveal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

const STATS = [
  ['X+', 'Years'],
  ['X+', 'Students'],
  ['X+', 'Sessions'],
]

export default function Mentor() {
  return (
    <section className="mentor" id="mentor">
      <div className="wrap">
        <SectionHeading label="05 / Your instructor">Meet your mentor</SectionHeading>
        <Reveal className="glass">
          <div className="portrait">
            <span>Portrait</span>
          </div>
          <div className="mbody">
            <h3>Lead Instructor</h3>
            <p className="role">Trader / Educator</p>
            <p>
              A seasoned market practitioner sharing a structured process for reading price action, managing risk, and maintaining trading discipline.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
