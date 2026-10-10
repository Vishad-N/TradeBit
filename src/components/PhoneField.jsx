import { COUNTRIES } from '../lib/countries.js';
import { cleanPhone } from '../lib/phone.js';

// Country-code dropdown + a 10-digit number box. The caller owns `iso` and `digits` state and styles the
// wrapper through `className` (the select and input inherit the surrounding form's field styles).
export default function PhoneField({ id, iso, digits, onChange, className = 'ph-row', inputRef, invalid, required = true, describedBy }) {
  return (
    <div className={className}>
      <select aria-label="Country code" value={iso} onChange={e => onChange({ iso: e.target.value, digits })}>
        {COUNTRIES.map(c => <option key={c.iso} value={c.iso}>{c.iso} {c.dial} · {c.name}</option>)}
      </select>
      <input
        id={id}
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="10-digit number"
        value={digits}
        maxLength={10}
        pattern="[0-9]{10}"
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={e => onChange({ iso, digits: cleanPhone(e.target.value) })}
        onKeyDown={e => { if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
      />
    </div>
  );
}
