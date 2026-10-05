import { useEffect, useState } from 'react'
import { cx } from '../shared/utils.js'
import ReserveButton from './ReserveButton.jsx'

// Mobile-only bottom bar (hidden ≥768px in CSS). Appears once the hero has scrolled
// away and hides again while the registration panel is on screen.
export default function StickyCta({ heroRef, registerRef }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      const vh = window.innerHeight
      const heroBottom = heroRef.current.getBoundingClientRect().bottom
      const reg = registerRef.current.getBoundingClientRect()
      setShow(heroBottom < vh * 0.2 && !(reg.top < vh * 0.9 && reg.bottom > 0))
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
  }, [heroRef, registerRef])

  return (
    <div className={cx('sticky', show && 'show')} id="sticky" inert={!show}>
      <div>
        Live
        <br />
        masterclass
      </div>
      <ReserveButton>Reserve my free seat</ReserveButton>
    </div>
  )
}
