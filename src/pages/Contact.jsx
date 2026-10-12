import { TELEGRAM_URL, WHATSAPP_MESSAGE, WHATSAPP_NUMBER } from '../config/learn.js';

const h2Style = { fontSize: '24px', fontWeight: '500', color: 'var(--c)', marginTop: '40px', marginBottom: '20px' };
const pStyle = { marginBottom: '20px' };
const ulStyle = { marginBottom: '20px', paddingLeft: '24px', listStyle: 'disc' };

export default function Contact() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  return (
    <div>
      <span className="label">CONTACT</span>
      <h1 className="h-l" style={{ marginTop: '24px', marginBottom: '40px' }}>Contact Us</h1>
      <div className="legal-content" style={{ color: 'var(--c-80)', lineHeight: '1.6', fontSize: '18px' }}>
        <p style={pStyle}>Have a question about our courses, your enrollment or a payment? Our support team is happy to help.</p>

        <h2 style={h2Style}>Get in Touch</h2>
        <ul style={ulStyle}>
          <li>Email: <a href="mailto:support@tradebitindia.com">support@tradebitindia.com</a></li>
          <li>Call: <a href="tel:+917805888599">+91-7805888599</a></li>
          <li>WhatsApp: <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Chat with us</a></li>
          {TELEGRAM_URL && <li>Telegram: <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Join our channel</a></li>}
        </ul>
      </div>
    </div>
  );
}
