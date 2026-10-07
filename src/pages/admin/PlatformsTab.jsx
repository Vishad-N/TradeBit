import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';

const EMPTY = { name: '', slug: '', category: '', description: '', referralUrl: '', referralCode: '', websiteUrl: '', ctaLabel: '', logoUrl: '', featured: false, isActive: true, sortOrder: '0' };

// Manage the cards shown in the landing page's "Trading Platforms" section.
// Referral URLs are stored exactly as pasted; the site never rebuilds or edits them.
export default function PlatformsTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // platform being edited
  const [removeLogo, setRemoveLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const load = useCallback(async () => {
    try { setRows(await adminApi.platforms()); setError(null); } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function reset() {
    setForm(EMPTY); setEditing(null); setRemoveLogo(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function edit(p) {
    setEditing(p); setMsg(null); setRemoveLogo(false);
    setForm({
      name: p.name, slug: p.slug, category: p.category || '', description: p.description || '', referralUrl: p.referralUrl || '',
      referralCode: p.referralCode || '', websiteUrl: p.websiteUrl || '', ctaLabel: p.ctaLabel || '', logoUrl: p.logoUrl || '',
      featured: p.featured, isActive: p.isActive, sortOrder: String(p.sortOrder),
    });
    if (fileRef.current) fileRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (typeof v === 'boolean') fd.append(k, String(v));
        else if (editing || v !== '') fd.append(k, v); // on edit, empty values clear the field
      });
      if (removeLogo) fd.append('removeLogo', 'true');
      const file = fileRef.current?.files?.[0];
      if (file) fd.append('logo', file);
      if (editing) await adminApi.updatePlatform(editing.id, fd);
      else await adminApi.createPlatform(fd);
      setMsg({ ok: editing ? 'Saved.' : 'Platform added. It now appears on the website.' });
      reset(); load();
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  const act = fn => async () => { try { await fn(); load(); } catch (err) { setMsg({ error: err.message }); } };
  const toggleForm = (p, patch) => { const f = new FormData(); Object.entries(patch).forEach(([k, v]) => f.append(k, String(v))); return adminApi.updatePlatform(p.id, f); };

  return (
    <>
      <p className="rd-note">Cards for the landing page's Trading Platforms section. The Sign Up button opens the platform's own referral URL (through <code>/go/&lt;slug&gt;</code>, which also counts clicks).</p>
      <form className="rd-card rd-form" onSubmit={save} style={{ maxWidth: 720 }}>
        <h2 className="rd-h2">{editing ? `Edit: ${editing.name}` : 'Add Platform'}</h2>
        <label className="rd-field"><span>Platform name</span><input value={form.name} onChange={set('name')} required maxLength={80} /></label>
        <label className="rd-field"><span>Description</span><textarea rows={2} value={form.description} onChange={set('description')} maxLength={400} /></label>
        <label className="rd-field"><span>Official referral URL (https)</span><input type="url" value={form.referralUrl} onChange={set('referralUrl')} placeholder="https://platform.com/register?ref=YOUR_ID" /><small>Paste it exactly as the platform gave it. Different platforms use different formats; nothing is rewritten.</small></label>
        <label className="rd-field"><span>Referral code (optional)</span><input value={form.referralCode} onChange={set('referralCode')} maxLength={120} /><small>Shown with a Copy button. A code cannot be typed into another website for the visitor.</small></label>
        <label className="rd-field"><span>Registration page URL (only if there is a code but no referral URL)</span><input type="url" value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://platform.com/signup" /></label>
        <label className="rd-field"><span>Category (optional)</span><input value={form.category} onChange={set('category')} maxLength={40} placeholder="Broker, Prop Firm, …" /></label>
        <label className="rd-field"><span>Button label (optional)</span><input value={form.ctaLabel} onChange={set('ctaLabel')} maxLength={24} placeholder="Sign Up" /></label>
        <label className="rd-field"><span>Logo (JPG, PNG or WEBP, up to 1MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} /></label>
        <label className="rd-field"><span>…or a logo URL (https, SVG allowed)</span><input type="url" value={form.logoUrl} onChange={set('logoUrl')} /></label>
        {editing && (editing.logoKey || editing.logoUrl) && <label className="rd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={removeLogo} onChange={e => setRemoveLogo(e.target.checked)} style={{ width: 'auto' }} /><span>Remove current logo</span></label>}
        <label className="rd-field"><span>Display order (lower first)</span><input type="number" value={form.sortOrder} onChange={set('sortOrder')} /></label>
        <label className="rd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={form.featured} onChange={set('featured')} style={{ width: 'auto' }} /><span>Featured card</span></label>
        <label className="rd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={form.isActive} onChange={set('isActive')} style={{ width: 'auto' }} /><span>Visible on the website</span></label>
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <div className="rd-modal-actions">
          <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Platform'} <span className="ar">→</span></button>
          {editing && <button type="button" className="rd-link" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <h2 className="rd-h2 rd-gap">Platforms</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>No platforms yet. Add the first one above.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Platform</th><th>Link</th><th>Clicks</th><th>Visible</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td data-label="Platform"><strong>{p.name}</strong>{p.featured ? ' ★' : ''}<small>/go/{p.slug}{p.category ? ` · ${p.category}` : ''}</small></td>
                  <td data-label="Link" style={{ wordBreak: 'break-all', maxWidth: 260 }}>{p.referralUrl || (p.referralCode ? `Code ${p.referralCode} → ${p.websiteUrl}` : '—')}</td>
                  <td data-label="Clicks">{p.clicks}</td>
                  <td data-label="Visible">{p.isActive ? 'Yes' : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" onClick={() => edit(p)}>Edit</button>
                    <button className="rd-mini" onClick={act(() => toggleForm(p, { isActive: !p.isActive }))}>{p.isActive ? 'Hide' : 'Show'}</button>
                    <button className="rd-mini rd-danger" onClick={() => window.confirm(`Delete "${p.name}"?`) && act(() => adminApi.deletePlatform(p.id))()}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
