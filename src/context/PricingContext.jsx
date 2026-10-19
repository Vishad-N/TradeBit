import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { pricingApi } from '../services/readingApi.js';

// Prices and timed offers, configured in Admin -> Pricing. Starts with the original prices so the page never
// waits on (or breaks without) the API. `offer` is only set while an offer is live.
const FALLBACK = {
  invitation: { listPrice: 24999, regularPrice: 0, price: 0, offer: null },
  club: { listPrice: 2000, regularPrice: 499, price: 499, offer: null },
};

const PricingContext = createContext({ ...FALLBACK, offsetMs: 0, reload: () => {} });

export function PricingProvider({ children }) {
  const [data, setData] = useState(FALLBACK);
  const [offsetMs, setOffsetMs] = useState(0); // server clock minus device clock, so countdowns ignore a wrong device clock

  const reload = useCallback(async () => {
    try {
      const r = await pricingApi.get();
      if (!r?.invitation || !r?.club) return;
      setData({ invitation: r.invitation, club: r.club });
      const server = Date.parse(r.serverTime);
      if (Number.isFinite(server)) setOffsetMs(server - Date.now());
    } catch { /* keep what we have */ }
  }, []);

  useEffect(() => {
    reload();
    const poll = setInterval(reload, 60_000);
    const onVisible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(poll); document.removeEventListener('visibilitychange', onVisible); };
  }, [reload]);

  const value = useMemo(() => ({ ...data, offsetMs, reload }), [data, offsetMs, reload]);
  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export const usePricing = () => useContext(PricingContext);

/**
 * Time left until `endsAt` (ISO string), ticking every second on the server's clock.
 * Returns null when there is no end date. When it reaches zero the pricing is re-fetched once so the offer disappears.
 */
export function useCountdown(endsAt) {
  const { offsetMs, reload } = usePricing();
  const end = endsAt ? Date.parse(endsAt) : NaN;
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  const fired = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(end)) return undefined;
    fired.current = false;
    setNow(Date.now() + offsetMs);
    const id = setInterval(() => setNow(Date.now() + offsetMs), 1000);
    return () => clearInterval(id);
  }, [end, offsetMs]);

  const left = Number.isFinite(end) ? Math.max(0, end - now) : null;
  useEffect(() => {
    if (left === 0 && !fired.current) { fired.current = true; reload(); }
  }, [left, reload]);

  if (left == null) return null;
  const s = Math.floor(left / 1000);
  return { left, done: left === 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

const endFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' });
/** "Mon, 20 Oct 2026, 6:30 pm IST" in the viewer's own time zone. */
export const formatEnd = (iso) => (iso ? endFmt.format(new Date(iso)) : '');

export const formatInr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const formatUsd = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const percentOff = (list, price) => (list > 0 && price < list ? Math.round((1 - price / list) * 100) : 0);
