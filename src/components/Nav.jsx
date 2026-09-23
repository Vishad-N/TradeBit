import BrandMark from './BrandMark.jsx';

export const NAV_LINKS = [
  ['#why', 'Why Us'],
  ['#method', 'Method'],
  ['#learn', 'Learn'],
  ['#mentor', 'Mentor'],
  ['#platform', 'Platform'],
  ['#faq', 'FAQ'],
];

export default function Nav({ solid, activeHref, menuOpen, onToggleMenu, onCloseMenu }) {
  return (
    <>
      <header className={solid ? 'nav solid' : 'nav'}>
        <div className="nav-in">
          <BrandMark aria-label="TradeBit home" />
          <nav aria-label="Primary">
            <ul className="links">
              {NAV_LINKS.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className={href === activeHref ? 'act' : undefined} aria-current={href === activeHref ? 'true' : undefined}>{label.toUpperCase()}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href="#offer" className="btn btn-lime nav-cta">Start Learning <span className="ar">→</span></a>
            <button className="burger" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mmenu" onClick={onToggleMenu}><i></i><i></i></button>
          </div>
        </div>
      </header>
      <div className="m-menu" id="mmenu" aria-hidden={!menuOpen}>
        <ol>
          {NAV_LINKS.map(([href, label]) => <li key={href}><a href={href} onClick={onCloseMenu}>{label}</a></li>)}
        </ol>
        <a href="#offer" className="btn btn-lime" style={{ justifyContent: 'center' }} onClick={onCloseMenu}>Start Your Journey <span className="ar">→</span></a>
      </div>
    </>
  );
}
