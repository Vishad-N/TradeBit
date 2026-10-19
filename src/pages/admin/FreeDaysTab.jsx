import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';
import { formatEnd } from '../../context/PricingContext.jsx';
import OfferClock from '../../components/OfferClock.jsx';

// Monday first. `v` is the weekday number the server uses (0 = Sunday).
const DAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
const PRESETS = [['Weekend', [6, 0]], ['Weekdays', [1, 2, 3, 4, 5]], ['Every day', [0, 1, 2, 3, 4, 5, 6]]];
const ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];

const toHHMM = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromHHMM = (v) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
const sameDays = (a, b) => a.length === b.length && a.every((d) => b.includes(d));

// Admin -> Free Days: on the chosen weekdays the chosen books open for every logged-in user, no task needed.
// Books marked "1% Club only" are never opened by this.
export default function FreeDaysTab() {
  const [data, setData] = useState(null); // last saved state from the server
  const [form, setForm] = useState(null);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const hydrate = (r) => {
    setData(r);
    setForm({
      enabled: r.enabled,
      days: r.days,
      allDay: r.startMinute === 0 && r.endMinute === 1440,
      start: toHHMM(r.startMinute),
      end: r.endMinute === 1440 ? '18:00' : toHHMM(r.endMinute),
      timezone: r.timezone,
      allBooks: r.allBooks,
      bookIds: r.bookIds,
    });
  };

  useEffect(() => {
    let live = true;
    Promise.all([adminApi.freeReading(), adminApi.books()])
      .then(([r, b]) => { if (live) { hydrate(r); setBooks(b.filter((x) => x.status === 'READY' && !x.clubOnly)); } })
      .catch((e) => live && setError(e));
    return () => { live = false; };
  }, []);

  const zones = useMemo(() => {
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return [...new Set([form?.timezone, own, ...ZONES].filter(Boolean))];
  }, [form?.timezone]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDay = (v) => set({ days: form.days.includes(v) ? form.days.filter((d) => d !== v) : [...form.days, v] });
  const toggleBook = (id) => set({ bookIds: form.bookIds.includes(id) ? form.bookIds.filter((x) => x !== id) : [...form.bookIds, id] });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await adminApi.saveFreeReading({
        enabled: form.enabled,
        days: form.days,
        startMinute: form.allDay ? 0 : fromHHMM(form.start),
        endMinute: form.allDay ? 1440 : fromHHMM(form.end),
        timezone: form.timezone,
        allBooks: form.allBooks,
        bookIds: form.bookIds,
      });
      hydrate(r);
      setMsg({ ok: r.enabled ? 'Saved. The free days are live.' : 'Saved. Free days are switched off.' });
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="rd-error" role="alert">{error.message}</p>;
  if (!form) return <p>Loading…</p>;

  const win = data?.window;
  const picked = form.allBooks ? books.length : form.bookIds.filter((id) => books.some((b) => b.id === id)).length;

  return (
    <form className="pr-wrap" onSubmit={save}>
      <p className="rd-note">Open books for everyone on set days, such as a Saturday and Sunday free-reading offer. Readers need no task while a free window is live, and the books lock again when it ends. Books marked <b>1% Club only</b> are never included.</p>

      {data?.enabled && win && (
        <section className={'rd-card fd-status ' + (win.active ? 'is-live' : '')} aria-live="polite">
          <span className="fd-pill">{win.active ? 'Live now' : 'Scheduled'}</span>
          <strong>{win.label}</strong>
          {win.active
            ? <OfferClock endsAt={win.endsAt} tone="light" prefix="Free window ends" />
            : win.nextStartsAt
              ? <OfferClock endsAt={win.nextStartsAt} tone="light" prefix="Next free window opens" />
              : <p>No upcoming free window.</p>}
        </section>
      )}

      <section className="rd-card rd-form pr-card">
        <label className="pr-switch" htmlFor="fd-on">
          <input id="fd-on" type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <span className="pr-track" aria-hidden="true"><i /></span>
          <span><b>Free reading days</b><small>Turn the schedule on or off without losing your settings.</small></span>
        </label>

        <fieldset className="fd-set" disabled={!form.enabled}>
          <legend>Free days</legend>
          <div className="fd-days" role="group" aria-label="Free days of the week">
            {DAYS.map(([label, v]) => (
              <button key={v} type="button" className={'fd-day' + (form.days.includes(v) ? ' on' : '')} aria-pressed={form.days.includes(v)} onClick={() => toggleDay(v)}>{label}</button>
            ))}
          </div>
          <div className="pr-quick">
            <span>Quick pick</span>
            {PRESETS.map(([label, d]) => (
              <button key={label} type="button" className={'rd-mini' + (sameDays(form.days, d) ? ' fd-on' : '')} onClick={() => set({ days: d })}>{label}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="fd-set" disabled={!form.enabled}>
          <legend>Time of day</legend>
          <label className="rd-check fd-allday">
            <input type="checkbox" checked={form.allDay} onChange={(e) => set({ allDay: e.target.checked })} />
            <span>All day (12:00 am to midnight)</span>
          </label>
          {!form.allDay && (
            <div className="pr-grid">
              <label className="rd-field"><span>From</span><input type="time" value={form.start} onChange={(e) => set({ start: e.target.value })} required /></label>
              <label className="rd-field"><span>Until</span><input type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} required /><small>Must be later than the start time on the same day.</small></label>
            </div>
          )}
          <label className="rd-field">
            <span>Time zone</span>
            <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })}>
              {zones.map((z) => <option key={z}>{z}</option>)}
            </select>
            <small>The days and times above are read in this time zone, for every reader.</small>
          </label>
        </fieldset>

        <fieldset className="fd-set" disabled={!form.enabled}>
          <legend>Books ({picked} included)</legend>
          <label className="rd-check"><input type="radio" name="fd-scope" checked={form.allBooks} onChange={() => set({ allBooks: true })} /><span>All books (except 1% Club only)</span></label>
          <label className="rd-check"><input type="radio" name="fd-scope" checked={!form.allBooks} onChange={() => set({ allBooks: false })} /><span>Only the books I choose</span></label>
          {!form.allBooks && (
            <div className="rd-picker-list" role="group" aria-label="Books free on these days">
              {books.length === 0 && <small>No public, ready books yet.</small>}
              {books.map((b) => (
                <label key={b.id} className="rd-check">
                  <input type="checkbox" checked={form.bookIds.includes(b.id)} onChange={() => toggleBook(b.id)} />
                  <span>{b.title}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </section>

      {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
      {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
      <div className="rd-actions">
        <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save free days'} <span className="ar">→</span></button>
      </div>
      {data?.enabled && win?.endsAt && <p className="rd-note">Current window closes {formatEnd(win.endsAt)}.</p>}
    </form>
  );
}
