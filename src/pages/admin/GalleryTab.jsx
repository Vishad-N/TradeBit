import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';
import { API_URL } from '../../services/api.js';

// Manage the photos in the Gallery page's glass carousel.
// The site works from day one: below the minimum it tops the carousel up with built-in sample photos.
export default function GalleryTab() {
  const [data, setData] = useState(null); // { min, max, items }
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [caption, setCaption] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { setData(await adminApi.galleryImages()); setError(null); } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = data?.items || [];
  const min = data?.min ?? 6;
  const max = data?.max ?? 20;
  const live = rows.filter(r => r.isActive).length;
  const room = max - rows.length;
  const topUp = Math.max(0, min - live);

  async function upload(e) {
    e.preventDefault();
    const files = [...(fileRef.current?.files || [])];
    if (files.length === 0) return setMsg({ error: 'Choose one or more images first.' });
    if (files.length > room) return setMsg({ error: `The gallery holds at most ${max} images and has room for ${Math.max(room, 0)} more. Choose fewer files, or delete some first.` });
    setBusy(true); setMsg(null);
    let done = 0;
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        if (caption.trim() && files.length === 1) fd.append('caption', caption.trim());
        fd.append('sortOrder', String(rows.length + done));
        await adminApi.createGalleryImage(fd);
        done++;
      }
      setMsg({ ok: `${done} image${done > 1 ? 's' : ''} added.` });
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
    try { await adminApi.updateGalleryImage(id, fd); load(); } catch (err) { setMsg({ error: err.message }); }
  };
  const move = (i, d) => async () => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const order = rows.map(r => r.id);
    [order[i], order[j]] = [order[j], order[i]];
    try {
      await Promise.all(order.map((id, idx) => {
        const fd = new FormData(); fd.append('sortOrder', String(idx));
        return adminApi.updateGalleryImage(id, fd);
      }));
      load();
    } catch (err) { setMsg({ error: err.message }); }
  };

  const status = !data ? null : live >= min
    ? { cls: 'rd-ok', text: `Showing your ${live} image${live > 1 ? 's' : ''} only.` }
    : { cls: 'rd-note', text: live === 0
        ? `No images yet: the page is showing ${min} built-in sample photos of Dubai. They disappear as soon as you have ${min} of your own.`
        : `You have ${live} visible image${live > 1 ? 's' : ''}. The page shows them plus ${topUp} sample Dubai photo${topUp > 1 ? 's' : ''} to reach ${min}. Add ${topUp} more and the samples are removed.` };

  return (
    <>
      <div className="rd-card" style={{ maxWidth: 720, marginBottom: 20 }}>
        <h2 className="rd-h2">How many images?</h2>
        <ul style={{ paddingLeft: 20, listStyle: 'disc', display: 'grid', gap: 6 }}>
          <li><strong>Minimum: {min}.</strong> The glass carousel loops, so it needs at least {min} images to look full. With fewer, the site tops it up with sample photos of Dubai, so the page always works.</li>
          <li><strong>Maximum: {max}.</strong> Every image is loaded into the browser's graphics memory, so more than {max} makes it heavy on phones. The upload is blocked beyond this.</li>
          <li><strong>Best results:</strong> landscape or portrait photos, at least 1600px on the long edge, JPG, PNG or WEBP, up to 4MB each. Images are cropped to the card from the centre, so keep the subject in the middle.</li>
        </ul>
        {status && <p className={status.cls} style={{ marginTop: 14 }}><strong>{rows.length} of {max} used.</strong> {status.text}</p>}
      </div>

      <form className="rd-card rd-form" onSubmit={upload} style={{ maxWidth: 720 }}>
        <h2 className="rd-h2">Add Images</h2>
        <label className="rd-field"><span>Images (you can select several)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple ref={fileRef} required disabled={room <= 0} /></label>
        <label className="rd-field"><span>Caption (optional, used as alt text; only when adding a single image)</span><input value={caption} onChange={e => setCaption(e.target.value)} maxLength={120} /></label>
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <button className="btn btn-lime" type="submit" disabled={busy || room <= 0}>{busy ? 'Uploading…' : room <= 0 ? `Gallery is full (${max})` : 'Upload'} <span className="ar">→</span></button>
      </form>

      <h2 className="rd-h2 rd-gap">Gallery images</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!data ? <p>Loading…</p> : rows.length === 0 ? <p>None yet. The sample Dubai photos are showing.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Preview</th><th>Caption</th><th>Visible</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td data-label="Preview"><img src={`${API_URL}/gallery/${r.id}/image?v=${new Date(r.updatedAt).getTime()}`} alt={r.caption || 'Gallery image'} style={{ height: 56, width: 'auto', borderRadius: 6, display: 'block' }} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /></td>
                  <td data-label="Caption">{r.caption || '—'}</td>
                  <td data-label="Visible">{r.isActive ? 'Yes' : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" disabled={i === 0} onClick={move(i, -1)} aria-label="Move earlier">←</button>
                    <button className="rd-mini" disabled={i === rows.length - 1} onClick={move(i, 1)} aria-label="Move later">→</button>
                    <button className="rd-mini" onClick={patch(r.id, { isActive: !r.isActive })}>{r.isActive ? 'Hide' : 'Show'}</button>
                    <button className="rd-mini rd-danger" onClick={() => window.confirm('Delete this image?') && adminApi.deleteGalleryImage(r.id).then(load).catch(err => setMsg({ error: err.message }))}>Delete</button>
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
