import { useEffect, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';
import { formatEnd, usePricing } from '../../context/PricingContext.jsx';
import OfferClock from '../../components/OfferClock.jsx';

const PRODUCTS = [
  { id: 'invitation', name: 'Your Invitation', where: 'The course offer at the bottom of the main page', unit: '₹', note: 'Indian rupees. Above 0 = students pay via Razorpay and get course access at once. 0 = free: students request access and you approve them in the Enrolments tab.' },
  { id: 'club', name: '1% Club', where: 'The 1% Club page and sign-up popup', unit: '$', note: 'Dollars on the 1% Club page, USDT in the popup. This is also the amount on the mentorship payment page.' },
];
const TITLES = ['Limited Time Offer', 'New Offer'];
const QUICK = [['+1 hour', 3600e3], ['+24 hours', 864e5], ['+3 days', 3 * 864e5], ['+7 days', 7 * 864e5], ['+30 days', 30 * 864e5]];

const pad = (n) => String(n).padStart(2, '0');
/** ISO (UTC) -> value for <input type="datetime-local"> in the admin's own time zone. */
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** datetime-local value -> ISO (UTC), or '' when empty/invalid. */
const toIso = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.toISOString() : ''; };

const fromServer = (v) => ({
  listPrice: String(v.listPrice),
  price: String(v.price),
  offerEnabled: v.offerEnabled,
  offerTitle: v.offerTitle || TITLES[0],
  offerPrice: v.offerPrice == null ? '' : String(v.offerPrice),
  offerStartsAt: toLocalInput(v.offerStartsAt),
  offerEndsAt: toLocalInput(v.offerEndsAt),
});

const toServer = (f) => ({
  listPrice: f.listPrice,
  price: f.price,
  offerEnabled: f.offerEnabled,
  offerTitle: f.offerTitle,
  offerPrice: f.offerPrice,
  offerStartsAt: toIso(f.offerStartsAt) || null,
  offerEndsAt: toIso(f.offerEndsAt) || null,
});

function ProductCard({ p, form, onChange }) {
  const set = (k) => (e) => onChange({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const endIso = toIso(form.offerEndsAt);
  const ended = endIso && Date.parse(endIso) <= Date.now();
  const id = (k) => `pr-${p.id}-${k}`;
  return (
    <section className="rd-card rd-form pr-card" aria-labelledby={id('h')}>
      <header className="pr-head">
        <h2 className="rd-h2" id={id('h')}>{p.name}</h2>
        <small>{p.where}</small>
      </header>

      <div className="pr-grid">
        <label className="rd-field" htmlFor={id('list')}>
          <span>Original price ({p.unit})</span>
          <input id={id('list')} type="number" inputMode="decimal" min="0" step="any" value={form.listPrice} onChange={set('listPrice')} required />
          <small>Shown crossed out.</small>
        </label>
        <label className="rd-field" htmlFor={id('price')}>
          <span>Current price ({p.unit})</span>
          <input id={id('price')} type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={set('price')} required />
          <small>{p.note}</small>
        </label>
      </div>

      <div className="pr-offer">
        <label className="pr-switch" htmlFor={id('on')}>
          <input id={id('on')} type="checkbox" checked={form.offerEnabled} onChange={set('offerEnabled')} />
          <span className="pr-track" aria-hidden="true"><i /></span>
          <span><b>New / limited time offer</b><small>Shows a flashing countdown badge on the website until the end time.</small></span>
        </label>

        {form.offerEnabled && (
          <div className="pr-offer-body">
            <div className="pr-grid">
              <label className="rd-field" htmlFor={id('title')}>
                <span>Badge label</span>
                <select id={id('title')} value={form.offerTitle} onChange={set('offerTitle')}>
                  {TITLES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="rd-field" htmlFor={id('oprice')}>
                <span>Offer price ({p.unit})</span>
                <input id={id('oprice')} type="number" inputMode="decimal" min="0" step="any" value={form.offerPrice} onChange={set('offerPrice')} required />
                <small>Replaces the current price while the offer runs.</small>
              </label>
            </div>

            <div className="pr-grid">
              <label className="rd-field" htmlFor={id('start')}>
                <span>Starts (optional)</span>
                <input id={id('start')} type="datetime-local" value={form.offerStartsAt} onChange={set('offerStartsAt')} />
                <small>Leave empty to start right away.</small>
              </label>
              <label className="rd-field" htmlFor={id('end')}>
                <span>Ends</span>
                <input id={id('end')} type="datetime-local" value={form.offerEndsAt} onChange={set('offerEndsAt')} required />
                <small>Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Visitors see it in their own time zone.</small>
              </label>
            </div>

            <div className="pr-quick" role="group" aria-label="Set the end time from now">
              <span>Run for</span>
              {QUICK.map(([label, ms]) => (
                <button key={label} type="button" className="rd-mini" onClick={() => onChange({ ...form, offerEndsAt: toLocalInput(new Date(Date.now() + ms).toISOString()) })}>{label}</button>
              ))}
            </div>

            <div className="pr-preview" aria-live="polite">
              <span className="pr-preview-k">Live preview</span>
              {!endIso && <p>Pick an end date and time to see the countdown.</p>}
              {ended && <p className="rd-error">That end time has already passed. Choose a time in the future.</p>}
              {endIso && !ended && (
                <>
                  <OfferClock endsAt={endIso} tone="light" />
                  <p className="pr-preview-end">Visitors will see: <strong>{formatEnd(endIso)}</strong></p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Admin -> Pricing: the price of Your Invitation and the 1% Club, plus an optional timed offer for each.
export default function PricingTab() {
  const { reload } = usePricing();
  const [forms, setForms] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let live = true;
    adminApi.pricing()
      .then((r) => { if (live) setForms({ invitation: fromServer(r.invitation), club: fromServer(r.club) }); })
      .catch((e) => live && setError(e));
    return () => { live = false; };
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await adminApi.savePricing({ invitation: toServer(forms.invitation), club: toServer(forms.club) });
      setForms({ invitation: fromServer(r.invitation), club: fromServer(r.club) });
      await reload();
      setMsg({ ok: 'Saved. The website now shows these prices and offers.' });
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="rd-error" role="alert">{error.message}</p>;
  if (!forms) return <p>Loading…</p>;

  return (
    <form className="pr-wrap" onSubmit={save}>
      <p className="rd-note">Set what each offering costs and, optionally, run a timed offer. While an offer is on, a flashing badge with a live countdown sticks to the top-right of the website, and the price switches back automatically when the time runs out.</p>
      {PRODUCTS.map((p) => (
        <ProductCard key={p.id} p={p} form={forms[p.id]} onChange={(f) => setForms((s) => ({ ...s, [p.id]: f }))} />
      ))}
      {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
      {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
      <div className="rd-actions">
        <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save pricing'} <span className="ar">→</span></button>
      </div>
    </form>
  );
}
