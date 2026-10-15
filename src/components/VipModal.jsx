import { useEffect, useRef, useState } from 'react';
import { WHATSAPP_NUMBER } from '../config/learn.js';
import { PLATFORMS_FALLBACK } from '../config/platforms.js';

// The XM partner link and code already shown in the Trading Platforms section.
const XM = PLATFORMS_FALLBACK.find(p => p.slug === 'xm-global') || {};
const XM_URL = XM.referralUrl || '';
const XM_CODE = XM.referralCode || '';
const VERIFY_MESSAGE = 'Hi TradeBit India, I have opened my XM account with a $100 minimum deposit. Here is my account screenshot for VIP community verification.';
const VERIFY_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(VERIFY_MESSAGE)}`;

const INSIDE = [
  { t: 'Premium Trading Setups', d: 'High-probability setups shared during live market hours.', items: ['Gold (XAUUSD) & crypto setups', 'Entry, Stop Loss & Take Profit levels', 'Technical analysis & market insights', 'Risk management guidance'] },
  { t: 'Exclusive Learning Material', d: 'Professionally structured resources to upgrade your knowledge.', items: ['Premium trading guides & PDFs', 'Advanced strategy rulebooks', 'Trading cheat sheets', 'Price Action, SMC & ICT concepts'] },
  { t: 'Basic to Advanced Masterclasses', d: 'Step-by-step video lessons on professional concepts.', items: ['Beginner to advanced strategies', 'Smart Money Concepts (SMC)', 'ICT, liquidity, order blocks & FVG', 'Trading psychology & risk management'] },
];

const STEPS = [
  { n: '01', t: 'Open your XM account', d: 'Create a real account with our partner broker through our link, or update an existing one with our Partner Code.' },
  { n: '02', t: 'Activate with $100', d: 'Fund your real account with a minimum deposit of $100 and take a screenshot of your dashboard.' },
  { n: '03', t: 'Verify on WhatsApp', d: 'Send the screenshot to our official WhatsApp team. Once verified, your VIP access is unlocked.' },
];

// Any button can open the VIP popup by dispatching this window event (the nav listens for it).
export const OPEN_VIP_EVENT = 'tb:open-vip';
export const openVip = () => window.dispatchEvent(new Event(OPEN_VIP_EVENT));

// "VIP Community" popup. Opened from the nav. Two actions: open an XM account, then verify on WhatsApp.
export default function VipModal({ open, onClose }) {
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(XM_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable: the code is visible to copy by hand */ }
  };

  return (
    <div className={closing ? 'vip closing' : 'vip'} role="dialog" aria-modal="true" aria-labelledby="vip-t" onClick={e => e.target === e.currentTarget && dismiss()}>
      <div className="vip-box">
        <button ref={closeRef} type="button" className="vip-x" aria-label="Close" onClick={dismiss}>✕</button>

        <header className="vip-head">
          <span className="vip-tag">Limited · Next 24 hours</span>
          <h2 id="vip-t">100% Free <span>VIP Access</span></h2>
          <p>Unlock TradeBit India's premium trading community: setups, education and expert-led masterclasses in one place. No course fees. No membership charges.</p>
        </header>

        <div className="vip-scroll">
          <section aria-label="Inside the VIP community">
            <h3 className="vip-h">What you get inside</h3>
            <div className="vip-cards">
              {INSIDE.map(c => (
                <article key={c.t} className="vip-card">
                  <h4>{c.t}</h4>
                  <p>{c.d}</p>
                  <ul>{c.items.map(i => <li key={i}>{i}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="How to unlock">
            <h3 className="vip-h">Unlock in 3 simple steps</h3>
            <ol className="vip-steps">
              {STEPS.map(s => (
                <li key={s.n}>
                  <b aria-hidden="true">{s.n}</b>
                  <div><strong>{s.t}</strong><span>{s.d}</span></div>
                </li>
              ))}
            </ol>
            {XM_CODE && (
              <div className="vip-code">
                <span>XM Partner Code</span>
                <code>{XM_CODE}</code>
                <button type="button" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button>
              </div>
            )}
          </section>
        </div>

        <footer className="vip-foot">
          <p className="vip-req"><b>$100</b> minimum deposit required for eligibility. VIP membership itself has no separate fee.</p>
          <div className="vip-actions">
            {XM_URL && <a href={XM_URL} className="vip-btn vip-btn-gold" target="_blank" rel="noopener noreferrer">1. Open your XM account <span aria-hidden="true">→</span></a>}
            <a href={VERIFY_URL} className="vip-btn vip-btn-green" target="_blank" rel="noopener noreferrer">2. Verify on WhatsApp <span aria-hidden="true">→</span></a>
          </div>
          <p className="vip-fine">Trading involves significant risk and profits are not guaranteed. Deposits remain subject to the broker's terms. Hide account numbers and personal information in verification screenshots.</p>
        </footer>
      </div>
    </div>
  );
}
