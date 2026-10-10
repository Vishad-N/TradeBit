import { Link } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { INSTAGRAM_URL, LEARN, TELEGRAM_URL, TRADINGVIEW_URL } from '../config/learn.js';

const ICONS = {
  telegram: <path d="M21.9 4.3 18.7 19.5c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5L18 7.4c.4-.3-.1-.5-.6-.2L6.3 14.2l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.4 3.9c.9-.3 1.7.2 1.5 1.1z" fill="currentColor" />,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></>,
  tradingview: <path d="M3 17l6-6 4 4 8-8M16 7h5v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
};

// Social / community buttons under the footer blurb. Same idea as a button with variants:
// `primary` is the filled call-to-action, the rest are outline buttons with a label.
const SOCIALS = [
  { key: 'telegram', label: 'Join Telegram', href: TELEGRAM_URL, variant: 'primary' },
  { key: 'youtube', label: 'YouTube', href: LEARN.youtubePlaylistUrl },
  { key: 'instagram', label: 'Instagram', href: INSTAGRAM_URL },
  { key: 'tradingview', label: 'TradingView', href: TRADINGVIEW_URL },
].filter(s => s.href);

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="f-grid">
          <div>
            <BrandMark />
            <p>Trading education built on structure, risk and discipline — for people who want to understand the market, not gamble on it.</p>
            <div className="f-social" role="group" aria-label="TradeBit on other platforms">
              {SOCIALS.map(({ key, label, href, variant }) => (
                <a key={key} className={`fbtn${variant === 'primary' ? ' fbtn-primary' : ''}`} href={href} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[key]}</svg>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div><h3>Follow</h3><ul><li><a href="#">Instagram</a></li><li><a href="#">YouTube</a></li><li><a href="#">TradingView</a></li></ul></div>
          <div><h3>Legal</h3><ul><li><Link to="/privacy">Privacy</Link></li><li><Link to="/terms">Terms</Link></li><li><Link to="/risk-disclosure">Risk Disclosure</Link></li></ul></div>
        </div>
        <div className="risk">
          <p><strong style={{ color: 'rgba(243,244,239,.62)' }}>Risk disclosure:</strong> Trading in financial markets involves substantial risk and may not be suitable for every investor. You could lose some or all of your capital. TradeBit provides educational content only and is not a registered investment adviser. Nothing presented constitutes financial advice. Illustrative examples do not guarantee future results.</p>
          <p>© 2026 TradeBit</p>
        </div>
      </div>
    </footer>
  )
}
