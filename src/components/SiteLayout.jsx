import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Nav from './Nav.jsx';
import Footer from './Footer.jsx';
import '../styles/reading.css';

// Shell for the app pages (login, books, admin): the same Nav and Footer as the landing page.
export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.classList.toggle('m-open', menuOpen);
    return () => document.body.classList.remove('m-open');
  }, [menuOpen]);
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Nav solid menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(o => !o)} onCloseMenu={() => setMenuOpen(false)} />
      <main id="main" className="rd-main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
