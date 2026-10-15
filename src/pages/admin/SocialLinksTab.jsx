import { useEffect, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';
import { DEFAULT_LINKS } from '../../config/learn.js';
import { useSiteLinks } from '../../context/SiteLinksContext.jsx';

const FIELDS = [
  ['telegram', 'Telegram', 'Public channel. Used in the nav icon, footer and Contact page. Never put the private VIP link here.'],
  ['instagram', 'Instagram', 'Leave empty to hide the footer button.'],
  ['youtube', 'YouTube', 'Playlist or channel link.'],
  ['twitter', 'X (Twitter)', ''],
  ['facebook', 'Facebook', ''],
  ['discord', 'Discord', ''],
  ['tradingview', 'TradingView', ''],
];

// Paste the links for the site's social accounts. The current links are already filled in. Clearing a field
// goes back to the built-in link (or hides the button when there is none).
export default function SocialLinksTab() {
  const { reload } = useSiteLinks();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let live = true;
    adminApi.siteLinks()
      .then(saved => { if (live) setForm(Object.fromEntries(FIELDS.map(([k]) => [k, saved[k] || DEFAULT_LINKS[k] || '']))); })
      .catch(e => live && setError(e));
    return () => { live = false; };
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      // A value equal to the built-in default is sent as empty so the default keeps following the code.
      const body = Object.fromEntries(FIELDS.map(([k]) => {
        const v = form[k].trim();
        return [k, v === (DEFAULT_LINKS[k] || '') ? '' : v];
      }));
      await adminApi.saveSiteLinks(body);
      await reload();
      setMsg({ ok: 'Saved. The website now uses these links.' });
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="rd-error" role="alert">{error.message}</p>;
  if (!form) return <p>Loading…</p>;

  return (
    <form className="rd-card rd-form" onSubmit={save}>
      <h2 className="rd-h2">Social media links</h2>
      <p>Paste the full link (https://…) for each account. These appear in the website's nav and footer.</p>
      {FIELDS.map(([key, label, hint]) => (
        <label key={key} className="rd-field">
          <span>{label}</span>
          <input type="url" inputMode="url" placeholder="https://" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} maxLength={500} />
          {hint && <small>{hint}</small>}
        </label>
      ))}
      {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
      {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
      <button className="btn btn-dark" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save links'}</button>
    </form>
  );
}
