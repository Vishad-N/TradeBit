import { Link } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { DISCORD_URL, FACEBOOK_URL, INSTAGRAM_URL, LEARN, TELEGRAM_URL, TRADINGVIEW_URL, TWITTER_URL } from '../config/learn.js';

const ICONS = {
  telegram: <path d="M21.9 4.3 18.7 19.5c-.2 1.1-.9 1.4-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5L18 7.4c.4-.3-.1-.5-.6-.2L6.3 14.2l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.4 3.9c.9-.3 1.7.2 1.5 1.1z" fill="currentColor" />,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></>,
  twitter: <path d="M4 4l6.8 9.2L4.2 20h2l5.5-5.9L16 20h4l-7.2-9.7L19.4 4h-2l-5 5.4L8.6 4z" fill="currentColor" />,
  facebook: <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.6C16.7 2.5 15.8 2.4 14.8 2.4 12.5 2.4 11 3.8 11 6.3v2.2H8.5V12H11v9.5h3V12h2.4l.4-3.5z" fill="currentColor" />,
  discord: <path d="M19 5.4A15 15 0 0 0 15.3 4.2l-.5 1a13.7 13.7 0 0 0-3.6 0l-.5-1A15 15 0 0 0 7 5.4C4.7 8.8 4.1 12.1 4.4 15.4a15 15 0 0 0 4.5 2.3l1-1.6c-.5-.2-1-.4-1.4-.7l.3-.3a10.7 10.7 0 0 0 9.4 0l.3.3c-.4.3-.9.5-1.4.7l1 1.6a15 15 0 0 0 4.5-2.3c.4-3.800-.6-7.100-2.600-10zM9.700 13.400c-.7 0-1.200-.6-1.200-1.400s.5-1.400 1.200-1.400 1.200.6 1.200 1.400-.5 1.400-1.200 1.400zm4.600 0c-.7 0-1.200-.6-1.200-1.400s.5-1.400 1.200-1.400 1.200.6 1.200 1.400-.5 1.400-1.200 1.400z" fill="currentColor" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></>,
  tradingview: <path d="M3 17l6-6 4 4 8-8M16 7h5v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
};

// Social / community buttons under the footer blurb. Same idea as a button with variants:
// `primary` is the filled call-to-action, the rest are outline buttons with a label.
const SOCIALS = [
  { key: 'telegram', label: 'Join Telegram', href: TELEGRAM_URL, variant: 'primary' },
  { key: 'youtube', label: 'YouTube', href: LEARN.youtubePlaylistUrl },
  { key: 'twitter', label: 'Twitter', href: TWITTER_URL },
  { key: 'facebook', label: 'Facebook', href: FACEBOOK_URL },
  { key: 'discord', label: 'Discord', href: DISCORD_URL },
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
          <div><h3>Company</h3><ul><li><Link to="/about">About Us</Link></li><li><Link to="/contact">Contact Us</Link></li><li><Link to="/gallery">Gallery</Link></li><li><Link to="/market-news">Market News</Link></li></ul></div>
          <div><h3>Legal</h3><ul><li><Link to="/privacy">Privacy</Link></li><li><Link to="/terms">Terms</Link></li><li><Link to="/refund">Refund &amp; Cancellation</Link></li><li><Link to="/risk-disclosure">Risk Disclosure</Link></li></ul></div>
        </div>
        <div className="risk">
          <p><strong style={{ color: 'rgba(243,244,239,.62)' }}>Risk disclosure:</strong> Trading in financial markets involves substantial risk and may not be suitable for every investor. You could lose some or all of your capital. TradeBit provides educational content only and is not a registered investment adviser. Nothing presented constitutes financial advice. Illustrative examples do not guarantee future results.</p>
          <p>© 2026 TradeBit</p>
        </div>
      </div>
    </footer>
  )
}
