import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../services/readingApi.js';
import PaymentsTab from './PaymentsTab.jsx';
import PlatformsTab from './PlatformsTab.jsx';
import WebinarTab from './WebinarTab.jsx';

const TABS = [['books', 'Books'], ['tasks', 'Tasks'], ['requests', 'Reading Requests'], ['payments', 'Mentorship Payments'], ['platforms', 'Platforms'], ['webinar', 'Webinar Registrations']];
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

// ---------------------------------------------------------------- Books
function BooksTab() {
  const { data: books, error, reload } = useList(adminApi.books);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

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
      form.append('file', file);
      await adminApi.uploadBook(form);
      setTitle(''); setDescription(''); fileRef.current.value = '';
      setMsg({ ok: 'Uploaded. The book is being processed into pages.' });
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
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <button className="btn btn-lime" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload Book'} <span className="ar">→</span></button>
      </form>

      <h2 className="rd-h2 rd-gap">Books</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!books ? <p>Loading…</p> : books.length === 0 ? <p>No books yet.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Title</th><th>Status</th><th>Pages</th><th>Visible</th><th>Actions</th></tr></thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id}>
                  <td data-label="Title"><strong>{b.title}</strong>{b.status === 'FAILED' && <small className="rd-error">{b.processingError}</small>}</td>
                  <td data-label="Status"><Chip value={b.status} /></td>
                  <td data-label="Pages">{b.pageCount || '—'}</td>
                  <td data-label="Visible">{b.isActive ? 'Yes' : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" onClick={act(() => adminApi.updateBook(b.id, { isActive: !b.isActive }))}>{b.isActive ? 'Hide' : 'Show'}</button>
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
  const [form, setForm] = useState({ bookId: '', title: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const readyBooks = (books || []).filter(b => b.status === 'READY');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.createTask({ ...form, bookId: form.bookId || readyBooks[0]?.id });
      setForm(f => ({ ...f, title: '', description: '' }));
      setMsg({ ok: 'Task published. It is now the one active task for every user.' });
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
        <p className="rd-note">One task is shown to every user. Publishing a new task replaces the active one; earlier submissions and approved access are kept.</p>
        <label className="rd-field"><span>Book unlocked by this task</span>
          <select value={form.bookId || readyBooks[0]?.id || ''} onChange={set('bookId')} required>
            {readyBooks.length === 0 && <option value="">No ready books</option>}
            {readyBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <label className="rd-field"><span>Task title</span><input value={form.title} onChange={set('title')} required maxLength={200} /></label>
        <label className="rd-field"><span>Task description</span><textarea rows={4} value={form.description} onChange={set('description')} required maxLength={5000} /></label>
        {msg?.error && <p className="rd-error" role="alert">{msg.error}</p>}
        {msg?.ok && <p className="rd-ok" role="status">{msg.ok}</p>}
        <button className="btn btn-lime" type="submit" disabled={busy || readyBooks.length === 0}>{busy ? 'Publishing…' : 'Publish Task'} <span className="ar">→</span></button>
      </form>

      <h2 className="rd-h2 rd-gap">Tasks</h2>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!tasks ? <p>Loading…</p> : tasks.length === 0 ? <p>No tasks yet.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Task</th><th>Book</th><th>Submissions</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td data-label="Task"><strong>{t.title}</strong><small>{t.description.slice(0, 90)}{t.description.length > 90 ? '…' : ''}</small></td>
                  <td data-label="Book">{t.book.title}</td>
                  <td data-label="Submissions">{t._count.submissions}</td>
                  <td data-label="Active">{t.isActive ? <Chip value="APPROVED" /> : 'No'}</td>
                  <td data-label="Actions" className="rd-actions">
                    <button className="rd-mini" onClick={async () => { await adminApi.updateTask(t.id, { isActive: !t.isActive }).catch(err => setMsg({ error: err.message })); reload(); }}>{t.isActive ? 'Deactivate' : 'Make active'}</button>
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
              <dt>Book</dt><dd>{open.task.book.title}</dd>
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
  const { user, loading, isAdmin } = useAuth();
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
      <p><Link className="rd-link" to="/read/books?view=reader">View as reader →</Link></p>
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
    </section>
  );
}
