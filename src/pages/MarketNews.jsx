import { LEARN, TELEGRAM_URL } from '../config/learn.js';
import Disclaimer from '../components/Disclaimer.jsx';
import '../styles/news.css';

// Add items here ({ title, date, summary, url }) to list them under "Latest updates".
// With none, the page leads visitors to the Telegram channel, where updates are posted.
const NEWS = [];

// The three kinds of catalyst named in the page copy, in the order they appear there.
const CATALYSTS = [
  { n: '01', title: 'Central bank policies', text: 'Rate decisions and guidance that reprice every market at once.' },
  { n: '02', title: 'Corporate earnings', text: 'Results and outlooks that move single stocks and whole sectors.' },
  { n: '03', title: 'Geopolitical shifts', text: 'Breaking global events that turn quiet charts volatile in minutes.' },
];

const TICKER = ['Macroeconomic shifts', 'Central bank policy', 'Corporate earnings', 'Geopolitics', 'Breaking global updates', 'High-impact events'];

export default function MarketNews() {
  const alertsUrl = TELEGRAM_URL || LEARN.youtubePlaylistUrl;

  return (
    <div className="mn">
      {/* HERO: one promise, one supporting paragraph */}
      <section className="mn-hero" aria-labelledby="mn-t">
        {/* A volatility trace: a calm line that spikes on three market-moving events, then settles into a trend. */}
        <svg className="mn-wave" viewBox="0 0 640 260" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">
          <g fill="none" stroke="#151814" strokeOpacity=".09">
            <circle cx="540" cy="110" r="70" />
            <circle cx="540" cy="110" r="120" />
            <circle cx="540" cy="110" r="170" />
          </g>
          <g stroke="#151814" strokeOpacity=".12" strokeDasharray="3 7">
            <line x1="0" y1="130" x2="640" y2="130" />
          </g>
          {/* event flags */}
          <g className="mn-flags" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="10" fontWeight="600" letterSpacing="1.2">
            <g><line x1="150" y1="40" x2="150" y2="226" stroke="#151814" strokeOpacity=".28" strokeDasharray="2 5" /><rect x="150" y="26" width="108" height="22" rx="11" fill="#F3F4EF" stroke="#151814" /><text x="163" y="41" fill="#151814">RATE DECISION</text></g>
            <g><line x1="330" y1="60" x2="330" y2="226" stroke="#151814" strokeOpacity=".28" strokeDasharray="2 5" /><rect x="330" y="46" width="84" height="22" rx="11" fill="#F3F4EF" stroke="#151814" /><text x="343" y="61" fill="#151814">EARNINGS</text></g>
            <g><line x1="470" y1="30" x2="470" y2="226" stroke="#151814" strokeOpacity=".28" strokeDasharray="2 5" /><rect x="470" y="16" width="80" height="22" rx="11" fill="#B8D83D" stroke="#151814" /><text x="483" y="31" fill="#151814">BREAKING</text></g>
          </g>
          <path className="mn-trace" d="M0 150 L40 146 L70 152 L100 140 L130 144 L150 70 L162 200 L178 120 L196 168 L224 136 L260 148 L300 138 L322 142 L330 96 L342 188 L358 124 L384 150 L420 134 L452 140 L470 40 L482 208 L498 96 L520 150 L548 112 L580 96 L612 70 L640 52" fill="none" stroke="#151814" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle className="mn-dot" cx="640" cy="52" r="6" fill="#B8D83D" stroke="#151814" strokeWidth="2" />
        </svg>
        <span className="label">Market News</span>
        <h1 id="mn-t" className="h-l mn-title">Master the market moves <span className="hl">before they happen.</span></h1>
        <div className="mn-intro">
          <p className="mn-quote">In trading, the right information at the wrong time is just <b>expensive noise.</b></p>
          <p>
            Welcome to your ultimate high-volatility market intelligence hub. We filter out the chaos to deliver real-time, high-impact
            financial news, macroeconomic shifts and breaking global updates that actively trigger market momentum.
          </p>
        </div>
      </section>

      {/* TICKER: static strip of the beats we cover */}
      <ul className="mn-ticker" aria-label="What we track">
        {TICKER.map(t => <li key={t}>{t}</li>)}
      </ul>

      {/* CATALYSTS: what moves prices */}
      <section className="mn-catalysts" aria-labelledby="mn-cat-t">
        <div className="mn-cat-head">
          <span className="label">What we track</span>
          <h2 id="mn-cat-t" className="h-m">The catalysts that drive prices and your P&amp;L.</h2>
        </div>
        <ol>
          {CATALYSTS.map(c => (
            <li key={c.n}>
              <span className="mn-num" aria-hidden="true">{c.n}</span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* LATEST: only when there are items */}
      {NEWS.length > 0 && (
        <section className="mn-latest" aria-labelledby="mn-latest-t">
          <h2 id="mn-latest-t" className="h-m">Latest updates</h2>
          <ul>
            {NEWS.map(item => (
              <li key={item.url || item.title}>
                {item.date && <span className="meta">{item.date}</span>}
                <h3>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}</h3>
                {item.summary && <p>{item.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CALL TO ACTION: the strongest moment, on charcoal */}
      <section className="mn-cta" aria-labelledby="mn-cta-t">
        <div className="mn-cta-rings" aria-hidden="true"><i /><i /><i /></div>
        <p className="mn-cta-lead">Stop reacting to the market. <strong>Start anticipating it.</strong></p>
        <h2 id="mn-cta-t" className="mn-cta-title">Big News. Big Volatility. <span className="lime">Bigger Opportunities.</span></h2>
        <p className="mn-cta-sub">Check today's market-moving events instantly. Stay ahead, stay sharp, and trade with absolute confidence.</p>
        {alertsUrl && (
          <div className="mn-cta-actions">
            <a className="btn btn-lime" href={alertsUrl} target="_blank" rel="noopener noreferrer">Join our Telegram <span className="ar">→</span></a>
            <span className="mn-cta-note">Subscribe to alerts</span>
          </div>
        )}
      </section>

      <Disclaimer />
    </div>
  );
}
