import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'top', num: '01' },
  { id: 'problem', num: '02' },
  { id: 'learn', num: '03' },
  { id: 'mentor', num: '04' },
  { id: 'agenda', num: '05' },
  { id: 'register', num: '06' },
]

export default function StickyMarginIndex() {
  const [active, setActive] = useState('01')

  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      let current = '01'
      const vh = window.innerHeight
      for (const sec of SECTIONS) {
        const el = document.getElementById(sec.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= vh * 0.3) {
            current = sec.num
          }
        }
      }
      setActive(current)
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
    <div className="margin-index">
      {SECTIONS.map((sec) => (
        <span key={sec.num} className={active === sec.num ? 'active' : ''}>
          {sec.num}
        </span>
      ))}
    </div>
  )
}
