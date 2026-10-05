import Reveal from '../shared/Reveal.jsx'

// Label + h2 pair for sections whose heading floats directly on the snow
// (.shade adds the text-shadow that keeps it legible there).
export default function SectionHeading({ label, children }) {
  return (
    <>
      <Reveal as="p" className="label shade">
        {label}
      </Reveal>
      <Reveal as="h2" className="shade">
        {children}
      </Reveal>
    </>
  )
}
