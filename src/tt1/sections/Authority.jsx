import Reveal from '../shared/Reveal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

// Placeholders: publish verified figures only.
const FIGURES = [
  ['X+', 'Years'],
  ['X+', 'Students'],
  ['X+', 'Sessions'],
  ['X.X/5', 'Rating'],
]

export default function Authority() {
  return (
    <section>
      <div className="wrap">
        <SectionHeading label="06 / Track record">Credibility, in numbers.</SectionHeading>
        <div className="big">
          {FIGURES.map(([value, label], i) => (
            <Reveal key={label} delay={i ? `${(i * 0.06).toFixed(2)}s` : undefined}>
              <b>{value}</b>
              <span>{label}</span>
            </Reveal>
          ))}
        </div>
        <p className="note shade">[Replace placeholders with verified figures only.]</p>
      </div>
    </section>
  )
}
