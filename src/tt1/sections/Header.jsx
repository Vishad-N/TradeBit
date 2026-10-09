import { useEffect, useState } from 'react'

const LINKS = [
  ['#learn', '1% Club'],
  ['#mentor', 'Mentor'],
  ['#curriculum', 'Course'],
  ['#agenda', 'Agenda'],
  ['#faq', 'FAQ'],
]

export function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Trade Bit home">
      trade<b>bit</b>
    </a>
  )
}

export default function Header() {
  // Header is fixed; it gains a frosted background once the page scrolls past the top.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={scrolled ? 'top scrolled' : 'top'}>
      <div className="wrap">
        <Brand />
        <nav aria-label="Primary">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a className="mini" href="#register">
          Reserve
        </a>
      </div>
    </header>
  )
}
