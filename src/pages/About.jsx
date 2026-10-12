import { Link } from 'react-router-dom';

const h2Style = { fontSize: '24px', fontWeight: '500', color: 'var(--c)', marginTop: '40px', marginBottom: '20px' };
const pStyle = { marginBottom: '20px' };

export default function About() {
  return (
    <div>
      <span className="label">ABOUT</span>
      <h1 className="h-l" style={{ marginTop: '24px', marginBottom: '40px' }}>About Us</h1>
      <div className="legal-content" style={{ color: 'var(--c-80)', lineHeight: '1.6', fontSize: '18px' }}>
        <p style={pStyle}>TradeBit India is a trading education platform built on structure, risk and discipline, for people who want to understand the market, not gamble on it.</p>

        <h2 style={h2Style}>What We Do</h2>
        <p style={pStyle}>We offer courses, masterclasses, live analysis and mentorship programs that teach how markets work, how to manage risk, and how to build a repeatable approach to trading.</p>

        <h2 style={h2Style}>How You Can Learn With Us</h2>
        <p style={pStyle}>Start with our free educational videos on YouTube, join our community on Telegram, or explore our <Link to="/mentorship">mentorship program</Link> and <Link to="/read/books">reading library</Link>.</p>

        <h2 style={h2Style}>Our Promise</h2>
        <p style={pStyle}>TradeBit India provides educational content only and is not a registered investment adviser. Trading involves substantial risk; please read our <Link to="/risk-disclosure">Risk Disclosure</Link>.</p>

        <p style={pStyle}>Have a question? <Link to="/contact">Contact us</Link>.</p>
      </div>
    </div>
  );
}
