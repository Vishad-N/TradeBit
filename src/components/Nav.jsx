import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import ClubModal from './ClubModal.jsx';
import { TELEGRAM_URL } from '../config/learn.js';

// Any page can open the 1% Club popup by dispatching this window event (see the /1-percent-club page).
export const OPEN_CLUB_EVENT = 'tb:open-club';

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

// Alternates between two words every 5s with a 3D flip. Both words share one grid cell so the link never jumps.
function FlipLabel({ words, upper = false, interval = 5000 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className="flip-label" aria-hidden="true">
      {words.map((w, k) => (
        <span key={w} className={`fl-word fl-${w.toLowerCase()}${k === i ? ' on' : ''}`}>{upper ? w.toUpperCase() : w}</span>
      ))}
    </span>
  );
}

export default function Nav({ solid, activeHref, menuOpen, onToggleMenu, onCloseMenu }) {
  const { pathname } = useLocation();
  const [clubOpen, setClubOpen] = useState(false);
  useEffect(() => {
    const open = () => setClubOpen(true);
    window.addEventListener(OPEN_CLUB_EVENT, open);
    return () => window.removeEventListener(OPEN_CLUB_EVENT, open);
  }, []);
  // Off the landing page, section links go back to the landing page's anchors.
  const anchor = href => (pathname === '/' ? href : `/${href}`);

  return (
    <>
      <header className={solid ? 'nav solid' : 'nav'}>
        <div className="nav-in">
          <BrandMark aria-label="TradeBit home" />
          <nav aria-label="Primary">
            <ul className="links">
              <li><Link to="/1-percent-club" className="club-link" aria-current={pathname === '/1-percent-club' ? 'page' : undefined}><span aria-hidden="true">★</span> 1% CLUB</Link></li>
              {NAV_LINKS.map(([href, label]) => (
                <li key={href}>
                  <a href={anchor(href)} className={href === activeHref ? 'act' : undefined} aria-current={href === activeHref ? 'true' : undefined}>{label.toUpperCase()}</a>
                </li>
              ))}
              {ROUTE_LINKS.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} aria-label={label} className={pathname.startsWith(to) ? 'act' : undefined} aria-current={pathname.startsWith(to) ? 'page' : undefined}><FlipLabel words={['Free', label]} upper /></Link>
                </li>
              ))}
            </ul>
          </nav>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href={TELEGRAM_URL} className="tg-btn" target="_blank" rel="noopener noreferrer" aria-label="Join our Telegram channel" title="Join our Telegram channel">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.3 18.7 19.5c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5L18 7.4c.4-.3-.1-.5-.6-.2L6.3 14.2l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.4 3.9c.9-.3 1.7.2 1.5 1.1z" fill="currentColor"/></svg>
            </a>
            <a href={anchor('#offer')} className="btn btn-lime nav-cta">Start Learning <span className="ar">→</span></a>
            <button className="burger" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mmenu" onClick={onToggleMenu}><i></i><i></i></button>
          </div>
        </div>
      </header>
      <div className="m-menu" id="mmenu" aria-hidden={!menuOpen}>
        <ol>
          <li><Link to="/1-percent-club" className="club-link" onClick={onCloseMenu}>1% Club</Link></li>
          {NAV_LINKS.map(([href, label]) => <li key={href}><a href={anchor(href)} onClick={onCloseMenu}>{label}</a></li>)}
          {ROUTE_LINKS.map(([to, label]) => <li key={to}><Link to={to} aria-label={label} onClick={onCloseMenu}><FlipLabel words={['Free', label]} /></Link></li>)}
        </ol>
        <a href={anchor('#offer')} className="btn btn-lime" style={{ justifyContent: 'center' }} onClick={onCloseMenu}>Start Your Journey <span className="ar">→</span></a>
      </div>
      <ClubModal open={clubOpen} onClose={() => setClubOpen(false)} />
    </>
  );
}
