import Reveal from '../shared/Reveal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

// Glass sheets stacked at different depths (s1–s4 set position, tilt and z-order in CSS).
export default function Materials() {
  return (
    <section>
      <div className="wrap">
        <SectionHeading label="08 / Inside the course">What&apos;s on the desk</SectionHeading>
        <div className="desk">
          <Reveal className="glass g1 sheet s1">
            <h4>Course dashboard</h4>
            <div className="bar o" />
            <div className="bar" />
            <div className="bar s" />
            [Placeholder]
          </Reveal>
          <Reveal className="glass sheet s2">
            <h4>Trading playbook</h4>
            <div className="bar" />
            <div className="bar o" />
            <div className="bar s" />
            [Placeholder]
          </Reveal>
          <Reveal className="glass g3 sheet s3">
            <h4>Live analysis</h4>
            <div className="mini-ch" aria-hidden="true">
              <svg viewBox="0 0 200 56" fill="none" stroke="#e7f0ea" strokeWidth="2">
                <path d="M0 46 L30 30 L55 38 L90 14 L120 24 L160 6 L200 16" />
              </svg>
            </div>
            [Placeholder]
          </Reveal>
          <Reveal className="glass g1 sheet s4">
            <h4>Lesson material</h4>
            <div className="bar" />
            <div className="bar s" />
            [Placeholder]
          </Reveal>
        </div>
      </div>
    </section>
  )
}
