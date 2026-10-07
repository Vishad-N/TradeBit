import { Link, useLocation } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';

export const NAV_LINKS = [
  ['#why', 'Why Us'],
  ['#method', 'Method'],
  ['#learn', 'Learn'],
  ['#mentor', 'Mentor'],
  ['#platform', 'Platform'],
  ['#faq', 'FAQ'],
];

// Route links live outside NAV_LINKS: that list drives the landing page's scroll-spy, which only understands #ids.
export const ROUTE_LINKS = [['/read/books', 'Books']];

export default function Nav({ solid, activeHref, menuOpen, onToggleMenu, onCloseMenu }) {
  const { pathname } = useLocation();
  // Off the landing page, section links go back to the landing page's anchors.
  const anchor = href => (pathname === '/' ? href : `/${href}`);

  return (
    <>
      <header className={solid ? 'nav solid' : 'nav'}>
        <div className="nav-in">
          <BrandMark aria-label="TradeBit home" />
          <nav aria-label="Primary">
            <ul className="links">
              {NAV_LINKS.map(([href, label]) => (
                <li key={href}>
                  <a href={anchor(href)} className={href === activeHref ? 'act' : undefined} aria-current={href === activeHref ? 'true' : undefined}>{label.toUpperCase()}</a>
                </li>
              ))}
              {ROUTE_LINKS.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className={pathname.startsWith(to) ? 'act' : undefined} aria-current={pathname.startsWith(to) ? 'page' : undefined}>{label.toUpperCase()}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href={anchor('#offer')} className="btn btn-lime nav-cta">Start Learning <span className="ar">→</span></a>
            <button className="burger" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mmenu" onClick={onToggleMenu}><i></i><i></i></button>
          </div>
        </div>
      </header>
      <div className="m-menu" id="mmenu" aria-hidden={!menuOpen}>
        <ol>
          {NAV_LINKS.map(([href, label]) => <li key={href}><a href={anchor(href)} onClick={onCloseMenu}>{label}</a></li>)}
          {ROUTE_LINKS.map(([to, label]) => <li key={to}><Link to={to} onClick={onCloseMenu}>{label}</Link></li>)}
        </ol>
        <a href={anchor('#offer')} className="btn btn-lime" style={{ justifyContent: 'center' }} onClick={onCloseMenu}>Start Your Journey <span className="ar">→</span></a>
      </div>
    </>
  );
}
