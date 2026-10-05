import { useEffect, useRef, useState } from 'react'
import Reveal from '../shared/Reveal.jsx'
import { clamp } from '../shared/utils.js'
import ReserveButton from '../components/ReserveButton.jsx'

const SLOTS = [
  ['07:00', 'Welcome'],
  ['07:15', 'Market structure'],
  ['07:40', 'The framework'],
  ['08:10', 'Live chart breakdown'],
  ['08:25', 'Q&A'],
]

// The timeline fills as it passes 65% of the viewport; each slot lights up once reached.
function Timeline() {
  const ref = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      const r = ref.current.getBoundingClientRect()
      setProgress(clamp((window.innerHeight * 0.65 - r.top) / r.height))
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="tl" ref={ref} style={{ '--p': progress.toFixed(3) }}>
      <span className="fill" aria-hidden="true" />
      <ol>
        {SLOTS.map(([time, title], i) => (
          <li key={time} className={progress > 0 && progress >= i / (SLOTS.length - 1) - 0.001 ? 'on' : undefined}>
            <time>{time}</time>
            <strong>{title}</strong>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function Agenda() {
  return (
    <section id="agenda">
      <div className="wrap">
        <Reveal className="glass">
          <p className="label">11 / Run of show</p>
          <h2>Webinar agenda</h2>
          <p className="lead">Times are illustrative; final schedule to be confirmed.</p>
          <Timeline />
          <ReserveButton block>Reserve my free seat</ReserveButton>
        </Reveal>
      </div>
    </section>
  )
}
