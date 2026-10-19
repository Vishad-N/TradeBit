import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatInr, formatUsd, percentOff, useCountdown, usePricing } from '../context/PricingContext.jsx';
import OfferClock from './OfferClock.jsx';
import '../styles/offer.css';

const pad = (n) => String(n).padStart(2, '0');
const short = (t) => (t.days > 0 ? `${t.days}d ${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}` : `${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}`);

const PRODUCTS = {
  invitation: { name: 'Your Invitation', cta: 'Claim this offer', money: formatInr },
  club: { name: '1% Club', cta: 'Join the 1% Club', money: formatUsd },
};

function BadgeItem({ id, info, open, onToggle, onGo }) {
  const meta = PRODUCTS[id];
  const { offer, listPrice, price } = info;
  const t = useCountdown(offer.endsAt);
  if (!t || t.done) return null;
  const title = offer.title || 'Limited Time Offer';
  const off = percentOff(listPrice, price);
  return (
    <div className={'ob-item' + (open ? ' open' : '')}>
      <button type="button" className="ob-pill" aria-expanded={open} aria-controls={`ob-card-${id}`} onClick={onToggle}
        aria-label={`${title} on ${meta.name}, ends in ${short(t)}. ${open ? 'Hide' : 'Show'} details`}>
        <span className="ob-bolt" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.3 1 3 9.2h4L6.4 15 13 6.6H8.9z" /></svg>
        </span>
        <span className="ob-txt">
          <span className="ob-ttl">{title}</span>
          <span className="ob-sub">{meta.name}</span>
        </span>
        <span className="ob-time" aria-hidden="true">{short(t)}</span>
      </button>

      {open && (
        <div className="ob-card" id={`ob-card-${id}`} role="dialog" aria-label={`${title}: ${meta.name}`}>
          <span className="ob-card-k">{meta.name}</span>
          <h3>{title}</h3>
          <div className="ob-price">
            {listPrice > price && <s>{meta.money(listPrice)}</s>}
            <b>{meta.money(price)}</b>
            {off > 0 && <em>{off}% off</em>}
          </div>
          <OfferClock endsAt={offer.endsAt} tone="dark" />
          <button type="button" className="btn btn-lime ob-cta" onClick={onGo}>{meta.cta} <span className="ar">→</span></button>
        </div>
      )}
    </div>
  );
}

// Sticky "limited time offer" badge, top-right below the navbar. One pill per live offer (Your Invitation / 1% Club);
// each shows a live countdown and opens a card with the price, a clock and the exact end date.
export default function OfferBadge() {
  const pricing = usePricing();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);
  const root = useRef(null);

  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(null); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc); };
  }, [open]);

  if (pathname.startsWith('/admin') || pathname === '/login') return null;
  const live = Object.keys(PRODUCTS).filter((id) => pricing[id]?.offer);
  if (live.length === 0) return null;

  const go = (id) => {
    setOpen(null);
    if (id === 'club') navigate('/1-percent-club');
    else if (pathname === '/') document.getElementById('offer')?.scrollIntoView({ behavior: 'smooth' });
    else navigate('/#offer');
  };

  return (
    <aside className="ob" ref={root} aria-label="Limited time offers">
      {live.map((id) => (
        <BadgeItem key={id} id={id} info={pricing[id]} open={open === id} onToggle={() => setOpen(open === id ? null : id)} onGo={() => go(id)} />
      ))}
    </aside>
  );
}
