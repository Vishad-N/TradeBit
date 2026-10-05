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
          {/* Swap this placeholder for an <img> with a descriptive alt once the photo is approved. */}
          <div className="portrait">
            <span>
              [Instructor image]
              <br />
              Replace with a photo
            </span>
          </div>
          <div className="mbody">
            <h3>[Instructor name]</h3>
            <p className="role">Trader / Educator / [Verified credential]</p>
            <p>
              [Short biography goes here. Add only verified background: how they started trading, what they teach and
              how they approach the markets.]
            </p>
            <div className="mstats">
              {STATS.map(([value, label]) => (
                <div key={label}>
                  <b>{value}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
