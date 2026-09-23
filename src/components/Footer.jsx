import { Link } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="f-grid">
          <div>
            <BrandMark />
            <p>Trading education built on structure, risk and discipline — for people who want to understand the market, not gamble on it.</p>
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
