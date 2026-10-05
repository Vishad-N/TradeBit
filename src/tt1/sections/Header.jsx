const LINKS = [
  ['#learn', "What you'll learn"],
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
  return (
    <header className="top">
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
