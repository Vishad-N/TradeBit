import Reveal from '../shared/Reveal.jsx'
import ReserveButton from '../components/ReserveButton.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { SolanaAsset } from '../components/FloatingAssets.jsx'

// Small line diagrams, one per topic. Decorative: the card text carries the meaning.
const StructureDiagram = () => (
  <svg viewBox="0 0 240 96" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M4 80 L40 50 L62 64 L110 28 L132 42 L186 8 L236 30" />
    <g fill="#0c1a15" stroke="#e7f0ea">
      <circle cx="40" cy="50" r="5" />
      <circle cx="110" cy="28" r="5" />
      <circle cx="186" cy="8" r="5" />
    </g>
    <path d="M62 64H132M132 42H236" strokeDasharray="3 4" strokeWidth="1" />
  </svg>
)
const SelectionDiagram = () => (
  <svg viewBox="0 0 120 110" fill="currentColor">
    <rect x="0" y="4" width="116" height="16" rx="3" opacity=".3" />
    <rect x="0" y="32" width="76" height="16" rx="3" opacity=".3" />
    <rect x="0" y="60" width="106" height="16" rx="3" fill="#6f9e96" />
    <rect x="0" y="88" width="46" height="14" rx="3" opacity=".3" />
  </svg>
)
const RiskDiagram = () => (
  <svg viewBox="0 0 240 96" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M0 18H240" stroke="#6f9e96" strokeWidth="3" />
    <path d="M0 52H240" strokeDasharray="4 4" strokeWidth="1" />
    <path d="M0 84H240" stroke="#9bb0a6" strokeWidth="3" />
    <path d="M30 80 L80 52 L120 62 L190 20" strokeWidth="2.5" />
    <text x="4" y="12" fontSize="9" fill="currentColor" stroke="none" fontFamily="IBM Plex Mono">
      TARGET
    </text>
    <text x="4" y="78" fontSize="9" fill="currentColor" stroke="none" fontFamily="IBM Plex Mono">
      STOP
    </text>
  </svg>
)
const PsychologyDiagram = () => (
  <svg viewBox="0 0 240 96" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M0 48 C20 4 40 92 60 48 S100 10 120 48 S160 80 180 48 S220 40 240 48" />
    <path d="M0 48H240" stroke="#9bb0a6" strokeDasharray="2 5" strokeWidth="1.5" />
  </svg>
)

// Deliberately unequal cards (k1–k4 set size, offset and accent in CSS).
const TOPICS = [
  {
    cls: 'k1',
    title: 'Market structure',
    body: 'Read trend, range and turning points so you know where price is before deciding what to do.',
    Diagram: StructureDiagram,
  },
  {
    cls: 'g1 k2',
    delay: '.08s',
    title: 'Trade selection',
    body: 'Filter many possible trades down to the few worth taking.',
    Diagram: SelectionDiagram,
  },
  {
    cls: 'k3',
    title: 'Risk management',
    body: 'Define what you can lose before you enter, and size every position around it.',
    Diagram: RiskDiagram,
  },
  {
    cls: 'g1 k4',
    delay: '.08s',
    title: 'Trading psychology',
    body: 'Stay with your plan when the market tests your patience.',
    Diagram: PsychologyDiagram,
  },
]

export default function Learn() {
  return (
    <section id="learn">
      <SolanaAsset />
      <div className="wrap">
        <SectionHeading label="02 / 1% Club">Inside the 1% Club masterclass</SectionHeading>
        <div className="lgrid">
          {TOPICS.map(({ cls, delay, title, body, Diagram }, i) => (
            <Reveal key={title} as="article" className={`glass lcard ${cls}`} delay={delay}>
              <span className="num">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <div className="dia" aria-hidden="true">
                <Diagram />
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mid-cta">
          <ReserveButton>Reserve my free seat</ReserveButton>
          <small className="shade">Free · Live · Online</small>
        </Reveal>
      </div>
    </section>
  )
}
