import Reveal from '../shared/Reveal.jsx'

// Label + h2 pair for sections whose heading floats directly on the snow
// (.shade adds the text-shadow that keeps it legible there).
export default function SectionHeading({ label, children }) {
  const numberMatch = label.match(/^(\d{2})/);
  const number = numberMatch ? numberMatch[1] : null;
  const restLabel = numberMatch ? label.substring(2).replace(/^\s*\/\s*/, '') : label;

  return (
    <div className="section-heading-wrap">
      {number && <div className="section-watermark" aria-hidden="true">{number}</div>}
      <Reveal as="p" className="label shade">
        {restLabel}
      </Reveal>
      <Reveal as="h2" className="shade">
        {children}
      </Reveal>
    </div>
  )
}
