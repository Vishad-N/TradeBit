import Faq from './Faq.jsx';
import { CapRings } from './Rings.jsx';

export default function Offer() {
  return (
    <section className="offer dark" id="offer" aria-labelledby="offer-t">
      <CapRings className="rings" count={5} step={30} radiusVar="--r-offer" />
      <div className="orbit" aria-hidden="true">
        <svg viewBox="0 0 1000 1000">
          <g className="spin" fill="none" stroke="#B8D83D">
            <ellipse cx="500" cy="500" rx="480" ry="210" strokeOpacity=".55" strokeWidth="1.4" transform="rotate(-12 500 500)"/>
            <circle cx="30" cy="590" r="6" fill="#B8D83D" stroke="none" transform="rotate(-12 500 500)"/>
          </g>
          <g className="spin2" fill="none" stroke="#B8D83D" strokeOpacity=".22">
            <ellipse cx="500" cy="500" rx="430" ry="290" transform="rotate(18 500 500)"/>
            <ellipse cx="500" cy="500" rx="360" ry="360" strokeDasharray="2 10"/>
          </g>
        </svg>
      </div>
      <div className="wrap">
        <div className="offer-head">
          <span className="label rv" style={{ justifyContent: 'center' }}>Your Invitation</span>
          <h2 id="offer-t" className="h-l split"><span className="ln"><span>Start Your</span></span><span className="ln"><span className="lime">Trading Journey.</span></span></h2>
        </div>
        <div className="deal rv">
          <div className="price">
            <span className="meta">Complete programme · one-time payment</span>
            <div className="was"><span className="sr" style={{ position: 'absolute', left: '-9999px' }}>Original price</span>₹24,999</div>
            <div className="now"><sup>₹</sup>9,999</div>
            <span className="off">60% OFF · LIMITED ENROLMENT</span>
            <p>One payment, no subscription. Every future curriculum update is included for life.</p>
          </div>
          <div className="vr" aria-hidden="true"></div>
          <ul className="incl">
            <li><b>✓</b>Complete Trading Course<span>100+ hrs</span></li>
            <li><b>✓</b>Live Market Analysis<span>Weekly</span></li>
            <li><b>✓</b>Trading Journal</li>
            <li><b>✓</b>Trading Calculators</li>
            <li><b>✓</b>Community Access</li>
            <li><b>✓</b>Lifetime Access</li>
          </ul>
        </div>
        <div className="go rv">
          <a href="#checkout" className="btn btn-lime btn-xl">Get Started Now <span className="ar">→</span></a>
          <div className="assure">
            <span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>Secure Payment</span>
            <span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/></svg>Instant Access</span>
            <span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8a5 5 0 105-5H5M5 1v4h4"/></svg>7-Day Money-Back Guarantee</span>
          </div>
        </div>

        <Faq />
      </div>
    </section>
  )
}
