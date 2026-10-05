import Reveal from '../shared/Reveal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

const WITHOUT = ['Random entries', 'Emotional exits', 'Indicator overload', 'Undefined risk']
const WITH = ['Defined context', 'Planned setup', 'Controlled risk', 'Structured execution']

// "With" overlaps "without" so the better state reads as laid on top of the old one.
export default function Compare() {
  return (
    <section>
      <div className="wrap">
        <SectionHeading label="04 / The difference">Process changes everything.</SectionHeading>
        <div className="cmp">
          <Reveal className="glass g1 without">
            <h3>Without a process</h3>
            <ul>
              {WITHOUT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="glass with" delay=".12s">
            <h3>With a framework</h3>
            <ul>
              {WITH.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
