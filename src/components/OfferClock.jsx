import { formatEnd, useCountdown } from '../context/PricingContext.jsx';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Countdown clock for a timed offer: days / hours / minutes / seconds boxes, with the exact end date and time
 * written underneath. `tone="dark"` is for dark sections, `tone="light"` for light surfaces.
 */
export default function OfferClock({ endsAt, tone = 'dark', className = '', prefix = 'Offer ends' }) {
  const t = useCountdown(endsAt);
  if (!t || t.done) return null;
  const units = [['Days', t.days], ['Hours', t.hours], ['Mins', t.minutes], ['Secs', t.seconds]];
  return (
    <div className={`oclock oclock-${tone} ${className}`.trim()}>
      <div className="oclock-row" role="timer" aria-label={`${prefix} in ${t.days} days, ${t.hours} hours, ${t.minutes} minutes and ${t.seconds} seconds`}>
        {units.map(([label, v]) => (
          <div className="oclock-u" key={label}>
            <b aria-hidden="true">{pad(v)}</b>
            <span aria-hidden="true">{label}</span>
          </div>
        ))}
      </div>
      <p className="oclock-end">{prefix} <time dateTime={endsAt}>{formatEnd(endsAt)}</time></p>
    </div>
  );
}
