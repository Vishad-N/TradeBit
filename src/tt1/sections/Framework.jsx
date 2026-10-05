import Reveal from '../shared/Reveal.jsx'

const STEPS = [
  ['Context', 'What is the market doing?'],
  ['Structure', 'Where are the key levels?'],
  ['Setup', 'What qualifies as a trade?'],
  ['Risk', 'What is the plan if wrong?'],
  ['Execution', 'Act on the plan, nothing more.'],
]

export default function Framework() {
  return (
    <section className="framework">
      <div className="wrap">
        <Reveal className="glass">
          <p className="label">03 / Signature method</p>
          <h2>The framework</h2>
          <p className="lead">One repeatable sequence, from the big picture to the click of the button.</p>
          <ol className="steps">
            {STEPS.map(([name, question]) => (
              <li key={name}>
                <b>{name}</b>
                <span>{question}</span>
              </li>
            ))}
          </ol>
          <div className="spark" aria-hidden="true">
            <svg viewBox="0 0 400 56" preserveAspectRatio="none" fill="none" stroke="#496772" strokeWidth="2.5">
              <path d="M0 44 L40 36 L70 40 L120 20 L160 28 L220 10 L270 22 L330 8 L400 14" />
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
