import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Shown prices. The payment page reads the live fee from the backend (MENTORSHIP_PRICE_USDT); keep the two in step.
const PRICE_NOW = 499;
const PRICE_WAS = 1999;
const SAVE_PERCENT = Math.round((1 - PRICE_NOW / PRICE_WAS) * 100);

const INCLUDES = [
  'Private 1:1 guidance with the mentor',
  'Personalised trading feedback on your process',
  'Managed on Telegram, link sent after approval',
  'One-time payment in USDT (TRC20)',
];

// "1% Club" sign-up popup for the 1:1 mentorship. Opened from the nav; the button leads to the existing
// mentorship application (log in first when needed), exactly like the "Apply for 1:1 Mentorship" card.
export default function ClubModal({ open, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const closeRef = useRef(null);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 260);
  };

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = e => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const apply = () => {
    onClose();
    navigate(user ? '/mentorship' : '/login?next=/mentorship');
  };

  return (
    <div className={closing ? 'club closing' : 'club'} role="dialog" aria-modal="true" aria-labelledby="club-t" onClick={e => e.target === e.currentTarget && dismiss()}>
      <div className="club-box">
        <button ref={closeRef} type="button" className="club-x" aria-label="Close" onClick={dismiss}>✕</button>

        <div className="club-stage" aria-hidden="true">
          <i className="club-arch" />
          <svg className="club-orbit" viewBox="0 0 400 300" fill="none"><ellipse cx="200" cy="150" rx="190" ry="78" stroke="#B8D83D" strokeOpacity=".7" transform="rotate(-14 200 150)" /><circle cx="378" cy="200" r="5" fill="#B8D83D" /></svg>
          <img src="/mentors/ways.webp" alt="" width="640" height="1026" decoding="async" />
          <span className="club-badge">Private · 1:1</span>
        </div>

        <div className="club-body">
          <span className="label">1:1 Mentorship</span>
          <h2 id="club-t">Join the <span className="hl">1% Club.</span></h2>
          <p className="club-lead">Learn directly with the mentor. Personalised guidance, built around your trading, in a private 1:1 setting.</p>

          <div className="club-price" aria-label={`Price ${PRICE_NOW} USDT, down from ${PRICE_WAS} USDT`}>
            <s>{PRICE_WAS} USDT</s>
            <b>{PRICE_NOW}<small> USDT</small></b>
            <span className="club-save">Save {SAVE_PERCENT}% · TRC20</span>
          </div>

          <ul className="club-list">
            {INCLUDES.map(t => <li key={t}><b aria-hidden="true">✓</b>{t}</li>)}
          </ul>

          <button type="button" className="btn btn-lime club-cta" onClick={apply}>
            Apply for 1:1 Mentorship <span className="ar">→</span>
          </button>
          <p className="club-fine">Payments are verified manually. You get the Telegram link once your payment is approved.</p>
        </div>
      </div>
    </div>
  );
}
