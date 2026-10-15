import { Link } from 'react-router-dom';
import { WHATSAPP_MESSAGE, WHATSAPP_NUMBER } from '../config/learn.js';
import { useSiteLinks } from '../context/SiteLinksContext.jsx';
import '../styles/contact.css';

const EMAIL = 'support@tradebitindia.com';
const PHONE_DISPLAY = '+91-7805888599';
const PHONE_HREF = 'tel:+917805888599';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function Contact() {
  const { telegram: TELEGRAM_URL } = useSiteLinks();
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  // The fastest channel first and visually strongest; the rest follow in a quieter style.
  const channels = [
    {
      key: 'whatsapp', primary: true, label: 'WhatsApp', value: PHONE_DISPLAY, hint: 'Chat with us. The quickest way to reach the team.',
      href: whatsappUrl, external: true, cta: 'Start chat',
      icon: <Icon><path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19z" /><path d="M9.2 9.3c.3 2 2.5 4.2 4.5 4.5l1.2-1-1.6-1.1-.8.6c-.8-.4-1.6-1.2-2-2l.6-.8L9.9 8z" /></Icon>,
    },
    {
      key: 'email', label: 'Email', value: EMAIL, hint: 'Course, payment and enrollment questions.',
      href: `mailto:${EMAIL}`, cta: 'Send an email',
      icon: <Icon><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5 12 13l8.5-5.5" /></Icon>,
    },
    {
      key: 'call', label: 'Call', value: PHONE_DISPLAY, hint: 'Speak to support about access or enrollment.',
      href: PHONE_HREF, cta: 'Call now',
      icon: <Icon><path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" /></Icon>,
    },
    TELEGRAM_URL && {
      key: 'telegram', label: 'Telegram', value: 'TradeBit India community', hint: 'Join the channel for updates and market notes.',
      href: TELEGRAM_URL, external: true, cta: 'Join channel',
      icon: <Icon><path d="M21 4 3 11.2l5.6 2 2 5.8 3-3.6 4.6 3.4z" /><path d="m8.6 13.2 8-5.6" /></Icon>,
    },
  ].filter(Boolean);

  return (
    <div className="ct">
      <section className="ct-main" aria-labelledby="ct-t">
        <div className="ct-intro">
          <span className="label">Contact Us</span>
          <h1 id="ct-t" className="h-l ct-title">Let's <span className="hl">talk.</span></h1>
          <p className="ct-lead">Questions about a course, your enrollment or a payment? Pick the channel that suits you and our support team will help.</p>

          <div className="ct-note">
            <span className="meta">Before you write</span>
            <p>Include your <b>name</b> and the <b>email or phone you enrolled with</b>. It lets us find your account straight away.</p>
          </div>
        </div>

        <ul className="ct-channels">
          {channels.map(c => (
            <li key={c.key}>
              <a
                className={`ct-card${c.primary ? ' is-primary' : ''}`}
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span className="ct-ico">{c.icon}</span>
                <span className="ct-text">
                  <span className="ct-label">{c.label}</span>
                  <span className="ct-value">{c.value}</span>
                  <span className="ct-hint">{c.hint}</span>
                </span>
                <span className="ct-go" aria-hidden="true">{c.cta} <i>→</i></span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="ct-help" aria-label="Common questions">
        <article>
          <h2>Charged twice?</h2>
          <p>Send the transaction ID and a screenshot within <b>48 hours</b>. A verified duplicate payment is refunded to the original source.</p>
          <Link to="/refund">Refund &amp; cancellation policy <span aria-hidden="true">→</span></Link>
        </article>
        <article>
          <h2>Can't open your course?</h2>
          <p>Message us on WhatsApp or email with the account you enrolled with and we'll sort out your access.</p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Message on WhatsApp <span aria-hidden="true">→</span></a>
        </article>
        <article>
          <h2>Not sure where to start?</h2>
          <p>Meet the team and the 1% Club, or read how we teach before you decide.</p>
          <Link to="/about">About TradeBit India <span aria-hidden="true">→</span></Link>
        </article>
      </section>
    </div>
  );
}
