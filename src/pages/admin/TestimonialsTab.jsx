import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';
import { API_URL } from '../../services/api.js';

const EMPTY = { kind: 'TEXT', quote: '', name: '', role: '', rating: '5', videoUrl: '', duration: '', isActive: true, sortOrder: '0' };

// Manage the written reviews and the video story shown in the landing page's "Student Stories" section.
// Until at least one written review is active, the site keeps showing its built-in sample reviews.
export default function TestimonialsTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const photoRef = useRef(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const isVideo = form.kind === 'VIDEO';

  const load = useCallback(async () => {
    try { setRows(await adminApi.testimonials()); setError(null); } catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function reset() { setForm(EMPTY); setEditing(null); }

  function edit(t) {
    setEditing(t); setMsg(null);
    setForm({ kind: t.kind, quote: t.quote, name: t.name, role: t.role || '', rating: String(t.rating), videoUrl: t.videoUrl || '', duration: t.duration || '', isActive: t.isActive, sortOrder: String(t.sortOrder) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const body = {
        quote: form.quote.trim(), name: form.name.trim(), role: form.role.trim(),
        rating: Number(form.rating) || 5, isActive: form.isActive, sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      };
      if (isVideo) { body.videoUrl = form.videoUrl.trim(); body.duration = form.duration.trim(); }
      const saved = editing
        ? await adminApi.updateTestimonial(editing.id, body)
        : await adminApi.createTestimonial({ ...body, kind: form.kind });
      const photo = photoRef.current?.files?.[0];
      if (photo) {
        const fd = new FormData();
        fd.append('photo', photo);
        await adminApi.setTestimonialPhoto(saved.id, fd);
      }
      if (photoRef.current) photoRef.current.value = '';
      setMsg({ ok: editing ? 'Saved.' : 'Added. It now appears on the website.' });
      reset(); load();
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  const act = fn => async () => { try { await fn(); load(); } catch (err) { setMsg({ error: err.message }); } };
  const written = (rows || []).filter(t => t.kind === 'TEXT' && t.isActive).length;

  return (
    <>
      <p className="rd-note">
        Reviews for the landing page's Student Stories section. The page shows three written reviews at a time; once more than three
        are active they rotate automatically with an animation. Only the first active video story is shown (lowest display order).
        {rows && <> Active written reviews right now: <strong>{written}</strong>{written === 0 ? ' (the site is showing its sample reviews)' : ''}.</>}
      </p>
      <form className="rd-card rd-form" onSubmit={save} style={{ maxWidth: 720 }}>
        <h2 className="rd-h2">{editing ? `Edit: ${editing.name}` : 'Add Testimonial'}</h2>
        {!editing && (
          <label className="rd-field"><span>Type</span>
            <select value={form.kind} onChange={set('kind')}>
              <option value="TEXT">Written review</option>
              <option value="VIDEO">Video testimonial</option>
            </select>
          </label>
        )}
        <label className="rd-field"><span>{isVideo ? 'Headline quote (shown on the video card)' : 'Review text'}</span>
          <textarea rows={isVideo ? 2 : 4} value={form.quote} onChange={set('quote')} required maxLength={isVideo ? 120 : 1000} />
        </label>
        <label className="rd-field"><span>Student name</span><input value={form.name} onChange={set('name')} required maxLength={80} /></label>
        {!isVideo && (
          <label className="rd-field"><span>Photo (optional: JPG, PNG or WEBP, up to 2MB){editing?.photoKey ? ' · choose a file to replace the current one' : ''}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" ref={photoRef} />
            <small>Shown as the round avatar. A head-and-shoulders crop works best; without a photo a neutral avatar is used.</small>
          </label>
        )}
        <label className="rd-field"><span>Role · City (optional)</span><input value={form.role} onChange={set('role')} maxLength={120} placeholder="Software Engineer · Pune" /></label>
        {isVideo ? (
          <>
            <label className="rd-field"><span>Video URL (https)</span><input type="url" value={form.videoUrl} onChange={set('videoUrl')} required placeholder="https://youtu.be/… , https://vimeo.com/… or an .mp4 link" /><small>YouTube, Vimeo and direct .mp4 links play inside the site. Any other link opens in a new tab.</small></label>
            <label className="rd-field"><span>Duration label (optional)</span><input value={form.duration} onChange={set('duration')} maxLength={12} placeholder="3:12" /></label>
          </>
        ) : (
          <label className="rd-field"><span>Star rating</span>
            <select value={form.rating} onChange={set('rating')}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}</select>
          </label>
        )}
        <label className="rd-field"><span>Display order (lower first)</span><input type="number" value={form.sortOrder} onChange={set('sortOrder')} /></label>
        <label className="rd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={form.isActive} onChange={set('isActive')} style={{ width: 'auto' }} /><span>Visible on the website</span></label>
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <div className="rd-modal-actions">
          <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Testimonial'} <span className="ar">→</span></button>
          {editing && <button type="button" className="rd-link" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <h2 className="rd-h2 rd-gap">Testimonials</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>None yet. The website is showing its sample reviews.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Student</th><th>Type</th><th>Order</th><th>Visible</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.id}>
                  <td data-label="Student">{(t.photoKey || t.photoUrl) && <img src={t.photoKey ? `${API_URL}/testimonials/${t.id}/photo?v=${new Date(t.updatedAt).getTime()}` : t.photoUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', float: 'left', marginRight: 10 }} onError={e => { e.currentTarget.style.display = 'none'; }} />}<strong>{t.name}</strong><small>{t.quote.slice(0, 90)}{t.quote.length > 90 ? '…' : ''}</small></td>
                  <td data-label="Type">{t.kind === 'VIDEO' ? 'Video' : `Written · ${t.rating}★`}</td>
                  <td data-label="Order">{t.sortOrder}</td>
                  <td data-label="Visible">{t.isActive ? 'Yes' : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" onClick={() => edit(t)}>Edit</button>
                    <button className="rd-mini" onClick={act(() => adminApi.updateTestimonial(t.id, { isActive: !t.isActive }))}>{t.isActive ? 'Hide' : 'Show'}</button>
                    {t.photoKey && <button className="rd-mini" onClick={act(() => adminApi.clearTestimonialPhoto(t.id))}>Remove photo</button>}
                    <button className="rd-mini rd-danger" onClick={() => window.confirm(`Delete the testimonial from ${t.name}?`) && act(() => adminApi.deleteTestimonial(t.id))()}>Delete</button>
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
