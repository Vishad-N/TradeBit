import Reveal from '../shared/Reveal.jsx'
import { AltcoinsAsset } from '../components/FloatingAssets.jsx'

const SYMPTOMS = ['Too many indicators.', 'Too many opinions.', 'Too many entries.', 'Too little process.']

export default function Problem() {
  return (
    <section className="problem">
      <AltcoinsAsset />
      <div className="wrap">
        <Reveal className="glass g1">
          <p className="label">01 / The problem</p>
          <h2>
            The market isn&apos;t loud.<span>The noise is.</span>
          </h2>
          <ul className="pstate">
            {SYMPTOMS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
