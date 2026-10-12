import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';
import { API_URL } from '../../services/api.js';

// Manage the screenshots in the looping "Student Results" strip above the landing page footer.
export default function ProfitShotsTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [caption, setCaption] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { setRows(await adminApi.profitShots()); setError(null); } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(e) {
    e.preventDefault();
    const files = [...(fileRef.current?.files || [])];
    if (files.length === 0) return setMsg({ error: 'Choose one or more images first.' });
    setBusy(true); setMsg(null);
    let done = 0;
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        if (caption.trim() && files.length === 1) fd.append('caption', caption.trim());
        // New screenshots go to the end of the strip, in the order they were chosen.
        fd.append('sortOrder', String((rows?.length || 0) + done));
        await adminApi.createProfitShot(fd);
        done++;
      }
      setMsg({ ok: `${done} image${done > 1 ? 's' : ''} added. ${done > 1 ? 'They now appear' : 'It now appears'} on the website.` });
      setCaption(''); fileRef.current.value = '';
    } catch (err) {
      setMsg({ error: `${done ? `${done} uploaded, then: ` : ''}${err.message}` });
    } finally {
      setBusy(false); load();
    }
  }

  const patch = (id, fields) => async () => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
    try { await adminApi.updateProfitShot(id, fd); load(); } catch (err) { setMsg({ error: err.message }); }
  };
  // Swap display order with the neighbour; indexes are rewritten so ties never leave images stuck.
  const move = (i, d) => async () => {
    const j = i + d;
    if (!rows || j < 0 || j >= rows.length) return;
    const order = rows.map(r => r.id);
    [order[i], order[j]] = [order[j], order[i]];
    try {
      await Promise.all(order.map((id, idx) => {
        const fd = new FormData(); fd.append('sortOrder', String(idx));
        return adminApi.updateProfitShot(id, fd);
      }));
      load();
    } catch (err) { setMsg({ error: err.message }); }
  };

  return (
    <>
      <p className="rd-note">Screenshots for the looping strip above the website footer. JPG, PNG or WEBP, up to 3MB each. They scroll right to left in the order below. Until you add at least one, the site shows whatever is in the project's <code>src/assets/profits</code> folder (or hides the strip).</p>
      <form className="rd-card rd-form" onSubmit={upload} style={{ maxWidth: 720 }}>
        <h2 className="rd-h2">Add Screenshots</h2>
        <label className="rd-field"><span>Images (you can select several)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple ref={fileRef} required /></label>
        <label className="rd-field"><span>Caption (optional, used as alt text; only when adding a single image)</span><input value={caption} onChange={e => setCaption(e.target.value)} maxLength={120} /></label>
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload'} <span className="ar">→</span></button>
      </form>

      <h2 className="rd-h2 rd-gap">Screenshots</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>None yet.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Preview</th><th>Caption</th><th>Visible</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td data-label="Preview"><img src={`${API_URL}/profit-shots/${r.id}/image?v=${new Date(r.updatedAt).getTime()}`} alt={r.caption || 'Profit screenshot'} style={{ height: 56, width: 'auto', borderRadius: 6, display: 'block' }} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /></td>
                  <td data-label="Caption">{r.caption || '—'}</td>
                  <td data-label="Visible">{r.isActive ? 'Yes' : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" disabled={i === 0} onClick={move(i, -1)} aria-label="Move earlier">←</button>
                    <button className="rd-mini" disabled={i === rows.length - 1} onClick={move(i, 1)} aria-label="Move later">→</button>
                    <button className="rd-mini" onClick={patch(r.id, { isActive: !r.isActive })}>{r.isActive ? 'Hide' : 'Show'}</button>
                    <button className="rd-mini rd-danger" onClick={() => window.confirm('Delete this screenshot?') && adminApi.deleteProfitShot(r.id).then(load).catch(err => setMsg({ error: err.message }))}>Delete</button>
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
