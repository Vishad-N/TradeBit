import { useEffect, useRef, useState } from 'react';
import { WHATSAPP_NUMBER } from '../config/learn.js';
import { PLATFORMS_FALLBACK } from '../config/platforms.js';

// Partner links and codes shown in the Trading Platforms section. The links carry the referral, so users never type a code.
const broker = slug => PLATFORMS_FALLBACK.find(p => p.slug === slug) || {};
const BROKERS = [
  { key: 'xm', label: 'XM', ...broker('xm-global') },
  { key: 'elefin', label: 'Elefin', ...broker('elefin') },
].filter(b => b.referralUrl);
const VERIFY_MESSAGE = `Hi TradeBit India, I have opened my real account and deposited the $100 minimum. Please verify me for the VIP Group. Attached screenshots:
1) Real Account Dashboard (account number and name visible)
2) Deposit Proof ($100 minimum deposit successful)`;
const VERIFY_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(VERIFY_MESSAGE)}`;

const INSIDE = [
  { t: 'Premium Trading Setups', d: 'High-probability setups shared during live market hours.', items: ['Gold (XAUUSD) & crypto setups', 'Entry, Stop Loss & Take Profit levels', 'Technical analysis & market insights', 'Risk management guidance'] },
  { t: 'Exclusive Learning Material', d: 'Professionally structured resources to upgrade your knowledge.', items: ['Premium trading guides & PDFs', 'Advanced strategy rulebooks', 'Trading cheat sheets', 'Price Action, SMC & ICT concepts'] },
  { t: 'Basic to Advanced Masterclasses', d: 'Step-by-step video lessons on professional concepts.', items: ['Beginner to advanced strategies', 'Smart Money Concepts (SMC)', 'ICT, liquidity, order blocks & FVG', 'Trading psychology & risk management'] },
];

const STEPS = [
  { n: '01', t: 'Open your XM or Elefin account', d: 'Create a real account through either partner link below. The referral is applied automatically, so there is no code to enter.' },
  { n: '02', t: 'Activate with $100', d: 'Fund your real account with a minimum deposit of $100. Make sure the deposit is successful.' },
  { n: '03', t: 'Verify on WhatsApp', d: 'Send both screenshots to our WhatsApp team: (1) your Real Account Dashboard showing the account number and name clearly, and (2) Deposit Proof of your $100 minimum deposit. Real account only, not Demo. Once verified, you are added to the VIP Group instantly.' },
];

// Any button can open the VIP popup by dispatching this window event (the nav listens for it).
export const OPEN_VIP_EVENT = 'tb:open-vip';
export const openVip = () => window.dispatchEvent(new Event(OPEN_VIP_EVENT));

// "VIP Community" popup. Opened from the nav. Two actions: open an XM account, then verify on WhatsApp.
export default function VipModal({ open, onClose }) {
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState('');
  const [ready, setReady] = useState(false);
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

  const copyCode = async b => {
    try {
      await navigator.clipboard.writeText(b.referralCode);
      setCopied(b.key);
      setTimeout(() => setCopied(''), 1800);
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
            {BROKERS.filter(b => b.referralCode).map(b => (
              <div key={b.key} className="vip-code">
                <span>{b.label} Partner Code</span>
                <code>{b.referralCode}</code>
                <button type="button" onClick={() => copyCode(b)}>{copied === b.key ? 'Copied' : 'Copy'}</button>
              </div>
            ))}
          </section>
        </div>

        <footer className="vip-foot">
          <p className="vip-req"><b>$100</b> minimum deposit required for eligibility. VIP membership itself has no separate fee.</p>
          <div className="vip-actions">
            {BROKERS.map(b => (
              <a key={b.key} href={b.referralUrl} className="vip-btn vip-btn-gold" target="_blank" rel="noopener noreferrer">1. Open {b.label} account <span aria-hidden="true">→</span></a>
            ))}
            <label className="vip-ack">
              <input type="checkbox" checked={ready} onChange={e => setReady(e.target.checked)} />
              <span>I have my <b>Real Account Dashboard</b> and <b>$100 Deposit Proof</b> screenshots ready (Real account, not Demo).</span>
            </label>
            <a
              href={ready ? VERIFY_URL : undefined}
              className={ready ? 'vip-btn vip-btn-green vip-wa' : 'vip-btn vip-btn-green vip-wa is-disabled'}
              aria-disabled={!ready}
              target="_blank" rel="noopener noreferrer"
            >2. Verify on WhatsApp (attach screenshots) <span aria-hidden="true">→</span></a>
          </div>
          <p className="vip-fine">Trading involves significant risk and profits are not guaranteed. Deposits remain subject to the broker's terms. Hide account numbers and personal information in verification screenshots.</p>
        </footer>
      </div>
    </div>
  );
}
