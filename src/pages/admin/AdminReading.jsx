import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../services/readingApi.js';
import { API_URL } from '../../services/api.js';
import PaymentsTab from './PaymentsTab.jsx';
import PlatformsTab from './PlatformsTab.jsx';
import WebinarTab from './WebinarTab.jsx';
import TestimonialsTab from './TestimonialsTab.jsx';
import ProfitShotsTab from './ProfitShotsTab.jsx';
import GalleryTab from './GalleryTab.jsx';
import SocialLinksTab from './SocialLinksTab.jsx';
import PricingTab from './PricingTab.jsx';
import FreeDaysTab from './FreeDaysTab.jsx';

const TABS = [['books', 'Books'], ['tasks', 'Tasks'], ['requests', 'Reading Requests'], ['payments', 'Mentorship Payments'], ['platforms', 'Platforms'], ['webinar', 'Webinar Registrations'], ['testimonials', 'Testimonials'], ['profits', 'Profit Screenshots'], ['gallery', 'Gallery'], ['social', 'Social Links'], ['pricing', 'Pricing'], ['freedays', 'Free Days']];
const STATUS_LABEL = { PENDING_REVIEW: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', PROCESSING: 'Processing', READY: 'Ready', FAILED: 'Failed' };
const fmt = d => (d ? new Date(d).toLocaleString() : '—');

const Chip = ({ value }) => <span className={`rd-chip rd-chip-${value.toLowerCase()}`}>{STATUS_LABEL[value] || value}</span>;

/** Loads a list and exposes reload; keeps loading / error state in one place. */
function useList(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    try { setData(await fetcher()); setError(null); } catch (e) { setError(e); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

/** "1% Club only" switch for the book forms. */
function ClubOnlyToggle({ checked, onChange }) {
  return (
    <label className="rd-check rd-club-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span><b>1% Club only</b><small>Only 1% Club members can read this book. No task or free day opens it. Admins can still open it for testing.</small></span>
    </label>
  );
}

// ---------------------------------------------------------------- Books
function BooksTab() {
  const { data: books, error, reload } = useList(adminApi.books);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const [link, setLink] = useState('');
  const [clubOnly, setClubOnly] = useState(false); // new book is for 1% Club members only
  const [editing, setEditing] = useState(null); // book being edited
  const [edit, setEdit] = useState({ title: '', description: '', clubOnly: false });
  const coverRef = useRef(null);

  const startEdit = b => { setEditing(b); setEdit({ title: b.title, description: b.description || '', clubOnly: !!b.clubOnly }); setMsg(null); };
  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.updateBook(editing.id, { title: edit.title.trim(), description: edit.description.trim(), clubOnly: edit.clubOnly });
      const cover = coverRef.current?.files?.[0];
      if (cover) {
        const fd = new FormData();
        fd.append('cover', cover);
        await adminApi.setBookCover(editing.id, fd);
      }
      setEditing(null);
      setMsg({ ok: 'Book updated.' });
      reload();
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  // Poll while any book is still being converted into pages.
  useEffect(() => {
    if (!books?.some(b => b.status === 'PROCESSING')) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [books, reload]);

  async function upload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg({ error: 'Choose a PDF file first.' });
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setMsg({ error: 'Only PDF files can be uploaded.' });
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('clubOnly', String(clubOnly));
      form.append('file', file);
      await adminApi.uploadBook(form);
      setTitle(''); setDescription(''); setClubOnly(false); fileRef.current.value = '';
      setMsg({ ok: 'Uploaded. The book is being processed into pages.' });
      reload();
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  // Large books: paste a Google Drive ("Anyone with the link") or Dropbox link; the server downloads and converts it.
  async function addFromLink(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.addBookFromLink({ title: title.trim(), description: description.trim(), clubOnly, url: link.trim() });
      setTitle(''); setDescription(''); setLink(''); setClubOnly(false);
      setMsg({ ok: 'Added. The server is downloading the PDF and processing it into pages. Watch the Status below.' });
      reload();
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  const act = fn => async () => {
    try { await fn(); reload(); } catch (err) { setMsg({ error: err.message }); }
  };

  return (
    <>
      <form className="rd-card rd-form" onSubmit={upload}>
        <h2 className="rd-h2">Add Book</h2>
        <label className="rd-field"><span>Book Title</span><input value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} /></label>
        <label className="rd-field"><span>Description</span><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} /></label>
        <label className="rd-field"><span>PDF File</span><input type="file" accept="application/pdf,.pdf" ref={fileRef} required /></label>
        <ClubOnlyToggle checked={clubOnly} onChange={setClubOnly} />
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload Book'} <span className="ar">→</span></button>
      </form>

      <form className="rd-card rd-form rd-gap" onSubmit={addFromLink}>
        <h2 className="rd-h2">Add Large Book from a Link</h2>
        <p>For PDFs too big to upload. Uses the Book Title and Description above. Share the file as "Anyone with the link", then paste the Google Drive or Dropbox link.</p>
        <label className="rd-field"><span>PDF Link</span><input type="url" inputMode="url" placeholder="https://drive.google.com/file/d/…" value={link} onChange={e => setLink(e.target.value)} required maxLength={1000} /></label>
        <button className="btn btn-dark" type="submit" disabled={busy || !title.trim()}>{busy ? 'Adding…' : 'Add from Link'} <span className="ar">→</span></button>
      </form>

      {editing && (
        <form className="rd-card rd-form rd-gap" onSubmit={saveEdit}>
          <h2 className="rd-h2">Edit Book</h2>
          <label className="rd-field"><span>Book Title</span><input value={edit.title} onChange={e => setEdit(v => ({ ...v, title: e.target.value }))} required maxLength={200} /></label>
          <label className="rd-field"><span>Description</span><textarea rows={3} value={edit.description} onChange={e => setEdit(v => ({ ...v, description: e.target.value }))} maxLength={2000} /></label>
          <ClubOnlyToggle checked={edit.clubOnly} onChange={v => setEdit(e => ({ ...e, clubOnly: v }))} />
          <label className="rd-field"><span>Thumbnail (optional: JPG, PNG or WEBP, up to 2MB){editing.coverKey ? ' · choose a file to replace the current one' : ''}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" ref={coverRef} />
            <small>Shown on the book card. A portrait image (about 3:4) works best; without one a coloured cover with initials is used.</small>
          </label>
          {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
          <div className="rd-actions">
            <button className="btn btn-lime" type="submit" disabled={busy || !edit.title.trim()}>{busy ? 'Saving…' : 'Save Changes'} <span className="ar">→</span></button>
            <button className="btn btn-dark" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      <h2 className="rd-h2 rd-gap">Books</h2>
      {!editing && msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!books ? <p>Loading…</p> : books.length === 0 ? <p>No books yet.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Title</th><th>Status</th><th>Pages</th><th>Visible</th><th>Access</th><th>Actions</th></tr></thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id}>
                  <td data-label="Title">{b.coverKey && <img src={`${API_URL}/books/${b.id}/cover?v=${new Date(b.updatedAt).getTime()}`} alt="" style={{ width: 32, height: 42, borderRadius: 4, objectFit: 'cover', float: 'left', marginRight: 10 }} onError={e => { e.currentTarget.style.display = 'none'; }} />}<strong>{b.title}</strong>{b.status === 'FAILED' && <small className="rd-error">{b.processingError}</small>}</td>
                  <td data-label="Status"><Chip value={b.status} /></td>
                  <td data-label="Pages">{b.pageCount || '—'}</td>
                  <td data-label="Visible">{b.isActive ? 'Yes' : 'No'}</td>
                  <td data-label="Access">{b.clubOnly ? <span className="rd-chip rd-chip-club">1% Club only</span> : 'Everyone'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" onClick={() => startEdit(b)}>Edit</button>
                    {b.coverKey && <button className="rd-mini" onClick={act(() => adminApi.clearBookCover(b.id))}>Remove thumbnail</button>}
                    <button className="rd-mini" onClick={act(() => adminApi.updateBook(b.id, { isActive: !b.isActive }))}>{b.isActive ? 'Hide' : 'Show'}</button>
                    <button className="rd-mini" onClick={act(() => adminApi.updateBook(b.id, { clubOnly: !b.clubOnly }))}>{b.clubOnly ? 'Make public' : 'Club only'}</button>
                    {b.status === 'FAILED' && <button className="rd-mini" onClick={act(() => adminApi.reprocessBook(b.id))}>Retry</button>}
                    <button className="rd-mini rd-danger" onClick={() => window.confirm(`Delete "${b.title}" and all its pages?`) && act(() => adminApi.deleteBook(b.id))()}>Delete</button>
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

// ---------------------------------------------------------------- Tasks
function TasksTab() {
  const { data: tasks, error, reload } = useList(adminApi.tasks);
  const { data: books } = useList(adminApi.books);
  const [form, setForm] = useState({ title: '', description: '' });
  const [picked, setPicked] = useState([]); // book ids this task unlocks
  const [editing, setEditing] = useState(null); // task whose books are being changed
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  // 1% Club books are never unlocked by a task, so they are not offered here.
  const readyBooks = (books || []).filter(b => b.status === 'READY' && !b.clubOnly);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.createTask({ ...form, bookIds: picked });
      setForm({ title: '', description: '' });
      setPicked([]);
      setMsg({ ok: `Task published. Completing it unlocks ${picked.length} book${picked.length === 1 ? '' : 's'}.` });
      reload();
    } catch (err) {
      setMsg({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="rd-card rd-form" onSubmit={create}>
        <h2 className="rd-h2">Publish Global Task</h2>
        <p className="rd-note">A task can unlock one or several books: when a user's submission is approved, every book you tick here opens for them. Tasks are independent; each locked book shows the newest active task that includes it.</p>
        <BookPicker books={readyBooks} value={picked} onChange={setPicked} />
        <label className="rd-field"><span>Task title</span><input value={form.title} onChange={set('title')} required maxLength={200} /></label>
        <label className="rd-field"><span>Task description</span><textarea rows={4} value={form.description} onChange={set('description')} required maxLength={5000} /></label>
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <button className="btn btn-lime" type="submit" disabled={busy || picked.length === 0}>{busy ? 'Publishing…' : 'Publish Task'} <span className="ar">→</span></button>
      </form>

      <h2 className="rd-h2 rd-gap">Tasks</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!tasks ? <p>Loading…</p> : tasks.length === 0 ? <p>No tasks yet.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Task</th><th>Unlocks</th><th>Submissions</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td data-label="Task"><strong>{t.title}</strong><small>{t.description.slice(0, 90)}{t.description.length > 90 ? '…' : ''}</small></td>
                  <td data-label="Unlocks">{t.books.length === 0 ? '—' : t.books.map(b => b.title).join(', ')}</td>
                  <td data-label="Submissions">{t._count.submissions}</td>
                  <td data-label="Active">{t.isActive ? <Chip value="APPROVED" /> : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" onClick={() => setEditing(t)}>Edit books</button>
                    <button className="rd-mini" onClick={async () => { await adminApi.updateTask(t.id, { isActive: !t.isActive }).catch(err => setMsg({ error: err.message })); reload(); }}>{t.isActive ? 'Deactivate' : 'Make active'}</button>
                    <button className="rd-mini rd-danger" onClick={async () => {
                      if (!window.confirm(`Delete task "${t.title}"? Its ${t._count.submissions} submission(s) will be removed too, and books users unlocked only through this task will lock again.`)) return;
                      try { await adminApi.deleteTask(t.id); reload(); } catch (err) { setMsg({ error: err.message }); }
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="rd-modal-back" role="dialog" aria-modal="true" aria-label="Choose the books this task unlocks" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="rd-modal rd-card">
            <h2 className="rd-h2">Books unlocked by “{editing.title}”</h2>
            <p className="rd-note">Users who already completed this task get any book you add right away.</p>
            <BookPicker books={readyBooks} value={editing.books.map(b => b.id)} onChange={ids => setEditing(e => ({ ...e, books: ids.map(id => ({ id })) }))} />
            <div className="rd-actions">
              <button className="btn btn-lime" disabled={editing.books.length === 0} onClick={async () => {
                try { await adminApi.updateTask(editing.id, { bookIds: editing.books.map(b => b.id) }); setEditing(null); reload(); } catch (err) { setMsg({ error: err.message }); }
              }}>Save books <span className="ar">→</span></button>
              <button className="btn btn-dark" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Tick the books a task unlocks. */
function BookPicker({ books, value, onChange }) {
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <fieldset className="rd-field rd-picker">
      <span>Books unlocked by this task ({value.length} selected)</span>
      {books.length === 0 && <small>No ready books yet. Upload a book first.</small>}
      <div className="rd-picker-list">
        {books.map(b => (
          <label key={b.id} className="rd-check">
            <input type="checkbox" checked={value.includes(b.id)} onChange={() => toggle(b.id)} />
            <span>{b.title}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------- Requests
function RequestsTab() {
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const { data: rows, error, reload } = useList(() => adminApi.requests(filter), [filter]);
  const [open, setOpen] = useState(null); // request being viewed
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function decide(kind) {
    setBusy(true);
    setMsg(null);
    try {
      if (kind === 'approve') await adminApi.approve(open.id);
      else await adminApi.reject(open.id, reason.trim() || undefined);
      setOpen(null); setReason('');
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rd-filters" role="tablist" aria-label="Filter requests">
        {[['PENDING_REVIEW', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['', 'All']].map(([v, l]) => (
          <button key={l} type="button" role="tab" aria-selected={filter === v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>No requests here.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>User</th><th>Task</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td data-label="User"><strong>{r.user.name}</strong><small>{r.user.email}</small></td>
                  <td data-label="Task">{r.task.title}</td>
                  <td data-label="Submitted">{fmt(r.submittedAt)}</td>
                  <td data-label="Status"><Chip value={r.status} /></td>
                  <td data-label="Action" className="rd-actions">
                    <button className="rd-mini" onClick={() => { setOpen(r); setReason(r.rejectionReason || ''); setMsg(null); }}>View</button>
                    {r.status === 'PENDING_REVIEW' && <button className="rd-mini rd-go" onClick={async () => { try { await adminApi.approve(r.id); reload(); } catch (err) { setMsg(err.message); } }}>Approve</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {msg && !open && <p className="rd-error" role="alert">{msg}</p>}

      {open && (
        <div className="rd-modal-back" role="dialog" aria-modal="true" aria-label="Review submission" onClick={e => e.target === e.currentTarget && setOpen(null)}>
          <div className="rd-modal rd-card">
            <h2 className="rd-h2">Review submission</h2>
            <dl className="rd-dl">
              <dt>User</dt><dd>{open.user.name} ({open.user.email})</dd>
              <dt>Task</dt><dd>{open.task.title}</dd>
              <dt>Unlocks</dt><dd>{open.task.books.map(b => b.title).join(', ')}</dd>
              <dt>Submitted</dt><dd>{fmt(open.submittedAt)}</dd>
              <dt>Status</dt><dd><Chip value={open.status} /></dd>
              {open.reviewedAt && <><dt>Reviewed</dt><dd>{fmt(open.reviewedAt)}</dd></>}
            </dl>
            <label className="rd-field"><span>Rejection reason (optional)</span><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="Please complete the activity again." /></label>
            {msg && <p className="rd-error" role="alert">{msg}</p>}
            <div className="rd-modal-actions">
              <button className="btn btn-lime" disabled={busy || open.status === 'APPROVED'} onClick={() => decide('approve')}>Approve</button>
              <button className="btn btn-dark" disabled={busy || open.status === 'REJECTED'} onClick={() => decide('reject')}>Reject Submission</button>
              <button className="rd-link" onClick={() => setOpen(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Page
export default function AdminReading() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState('requests');

  if (loading) return <section className="rd-section"><p>Loading…</p></section>;
  if (!user) {
    return (
      <section className="rd-section rd-narrow">
        <span className="label">Admin</span><h1 className="h-l rd-title">Reading</h1>
        <div className="rd-card"><p>Please log in with an admin account.</p><Link className="btn btn-lime" to="/login?next=/admin/reading">Login to Continue <span className="ar">→</span></Link></div>
      </section>
    );
  }
  if (!isAdmin) {
    return (
      <section className="rd-section rd-narrow">
        <span className="label">Admin</span><h1 className="h-l rd-title">Reading</h1>
        <div className="rd-card"><p role="alert">You do not have permission to view this page.</p><Link className="btn btn-dark" to="/read/books">Back to Books</Link></div>
      </section>
    );
  }

  return (
    <section className="rd-section">
      <span className="label">Admin</span>
      <h1 className="h-l rd-title">Reading</h1>
      <p>
        <Link className="rd-link" to="/read/books?view=reader">View as reader →</Link>
        {' · '}
        <button type="button" className="rd-link rd-logout" onClick={logout}>Log out</button>
      </p>
      <div className="rd-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'books' && <BooksTab />}
      {tab === 'tasks' && <TasksTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'platforms' && <PlatformsTab />}
      {tab === 'webinar' && <WebinarTab />}
      {tab === 'testimonials' && <TestimonialsTab />}
      {tab === 'profits' && <ProfitShotsTab />}
      {tab === 'gallery' && <GalleryTab />}
      {tab === 'social' && <SocialLinksTab />}
      {tab === 'pricing' && <PricingTab />}
      {tab === 'freedays' && <FreeDaysTab />}
    </section>
  );
}
