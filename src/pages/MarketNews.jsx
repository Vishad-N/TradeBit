import { LEARN, TELEGRAM_URL } from '../config/learn.js';

const pStyle = { marginBottom: '20px' };

// No news feed has been supplied yet. Add items here ({ title, date, summary, url }) to list them.
const NEWS = [];

export default function MarketNews() {
  return (
    <div>
      <span className="label">MARKET NEWS</span>
      <h1 className="h-l" style={{ marginTop: '24px', marginBottom: '40px' }}>Market News</h1>
      <div className="legal-content" style={{ color: 'var(--c-80)', lineHeight: '1.6', fontSize: '18px' }}>
        {NEWS.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {NEWS.map(item => (
              <li key={item.url || item.title} style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '500', color: 'var(--c)', marginBottom: '6px' }}>
                  {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> : item.title}
                </h2>
                {item.date && <p style={{ fontSize: '14px', marginBottom: '8px' }}>{item.date}</p>}
                {item.summary && <p>{item.summary}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p style={pStyle}>Market updates and analysis will be published here soon.</p>
            <p style={pStyle}>
              For live updates, join our{' '}
              {TELEGRAM_URL && <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Telegram channel</a>}
              {TELEGRAM_URL && LEARN.youtubePlaylistUrl && ' or watch our '}
              {LEARN.youtubePlaylistUrl && <a href={LEARN.youtubePlaylistUrl} target="_blank" rel="noopener noreferrer">YouTube playlist</a>}.
            </p>
          </>
        )}
        <p style={{ ...pStyle, fontSize: '14px' }}>Market news is shared for educational purposes only and is not investment advice.</p>
      </div>
    </div>
  );
}
