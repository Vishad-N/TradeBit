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
