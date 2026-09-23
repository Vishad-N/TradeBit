import { Link, Outlet } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import Footer from './Footer.jsx';

export default function LegalLayout() {
  return (
    <>
      <header className="nav solid">
        <div className="nav-in">
          <BrandMark aria-label="TradeBit home" />
          <nav aria-label="Primary" style={{ marginLeft: 'auto' }}>
            <ul className="links">
              <li>
                <Link to="/">BACK TO HOME</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="legal-main" style={{ paddingTop: '120px', minHeight: '80vh', paddingBottom: '80px', maxWidth: '800px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
