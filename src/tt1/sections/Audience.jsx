import Reveal from '../shared/Reveal.jsx'

const FITS = [
  "You're new to trading and need direction.",
  'You understand the basics but lack a process.',
  'You struggle with consistency.',
  'You want a structured approach to market analysis.',
]

export default function Audience() {
  return (
    <section>
      <div className="wrap">
        <Reveal className="glass g1">
          <p className="label">10 / Who it&apos;s for</p>
          <h2>This masterclass is for you if…</h2>
          <ul className="rows">
            {FITS.map((fit, i) => (
              <li key={fit}>
                <span className="n">0{i + 1}</span>
                <p>{fit}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
