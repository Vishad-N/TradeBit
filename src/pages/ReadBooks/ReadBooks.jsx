import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { readingApi } from '../../services/readingApi.js';
import { BookCard, LibrarySkeleton, LockIcon, TaskPanel } from './Library.jsx';
import BookReader from './BookReader.jsx';
import BooksArt from './BooksArt.jsx';
import OfferClock from '../../components/OfferClock.jsx';

const POLL_MS = 20000;

// Shown on the Books page when the user has a 1:1 mentorship payment in flight.
function MentorshipNotice({ state }) {
  if (state !== 'PENDING' && state !== 'REJECTED') return null;
  return (
    <div className="rd-notice rd-gap-sm" role="status">
      <strong>{state === 'PENDING' ? 'Access pending' : 'Mentorship payment not approved'}</strong>
      <p>{state === 'PENDING' ? 'Your 1:1 mentorship payment is waiting for manual verification. The book unlocks once it is approved.' : 'Your last 1:1 mentorship payment could not be verified.'}</p>
      <Link className="rd-link" to="/mentorship">View payment status →</Link>
    </div>
  );
}

// The page's pitch. Shown whenever the visitor is at the library's front door (logged out, nothing to read yet,
// loading, or an access problem); the mid-flow task screens keep their own focused titles.
function BooksIntro() {
  return (
    <header className="bk-intro">
      <div className="bk-copy">
        <span className="label">Free Books</span>
        <h1 className="h-l bk-title">
          Master high-probability <span className="hl">SMC, ICT</span> and advanced price action strategies,{' '}
          <em>without spending a single rupee.</em>
        </h1>
        <div className="bk-body">
          <h2 className="bk-sub">Unlock elite knowledge: the premium books library</h2>
          <p>
            Information is power, and we believe it should be accessible to everyone. This exclusive folder houses a handpicked
            collection of high-value books designed to give you an edge in your field. From transformative self-help to deeply
            technical masterpieces, your next intellectual leap is just a click away.
          </p>
          <p className="bk-callout"><span aria-hidden="true">🎯</span> Don't leave your growth to chance. Explore the folder, read instantly, and start learning without boundaries.</p>
        </div>
      </div>
      <div className="bk-art" aria-hidden="false"><BooksArt /></div>
    </header>
  );
}

function Shell({ label, title, lead, children }) {
  const focused = Boolean(title); // task screens pass their own title
  return (
    <section className={`rd-section ${focused ? 'rd-narrow' : 'bk'}`}>
      {focused ? (
        <>
          <span className="label">{label || 'Books'}</span>
          <h1 className="h-l rd-title">{title}</h1>
        </>
      ) : <BooksIntro />}
      {lead && <p className="rd-lead bk-status">{lead}</p>}
      <div className={focused ? undefined : 'bk-action'}>{children}</div>
    </section>
  );
}

// Shown while a free-reading window is live (with a countdown) or scheduled (when it next opens).
function FreeBanner({ fw }) {
  const live = fw.active;
  return (
    <aside className={'lib-free' + (live ? ' is-live' : '')} aria-label="Free reading days">
      <div className="lib-free-txt">
        <span className="lib-free-pill">{live ? 'Free reading is on' : 'Free reading days'}</span>
        <strong>{live ? 'Everything marked Free is open. No task needed.' : `Free to read on ${fw.label}`}</strong>
        {!live && !fw.nextStartsAt && <p>No upcoming free window is scheduled.</p>}
      </div>
      {live && fw.endsAt && <OfferClock endsAt={fw.endsAt} tone="light" prefix="Free window ends" />}
      {!live && fw.nextStartsAt && <OfferClock endsAt={fw.nextStartsAt} tone="light" prefix="Opens" />}
    </aside>
  );
}

function ReaderPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [lib, setLib] = useState(null);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fresh, setFresh] = useState([]); // books that just unlocked, for the highlight
  const [toast, setToast] = useState(null);
  const prev = useRef(null);
  const openId = params.get('book');

  const apply = useCallback(next => {
    // A book that was waiting and is now open just got approved: celebrate it.
    const was = prev.current;
    if (was) {
      const unlocked = next.books.filter(b => b.state === 'UNLOCKED' && was.get(b.id) && was.get(b.id) !== 'UNLOCKED');
      if (unlocked.length) {
        setFresh(unlocked.map(b => b.id));
        setToast(unlocked.length === 1 ? `“${unlocked[0].title}” is unlocked` : `${unlocked.length} books unlocked`);
        setTimeout(() => setFresh([]), 6000);
        setTimeout(() => setToast(null), 5000);
      }
    }
    prev.current = new Map(next.books.map(b => [b.id, b.state]));
    setLib(next);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await readingApi.library());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [apply]);

  useEffect(() => {
    if (user) load();
    else { setLib(null); setError(null); prev.current = null; }
  }, [user, load]);

  // While a task is waiting for the admin, check back so approval shows up without a manual refresh.
  const waiting = lib?.books.some(b => b.state === 'PENDING_REVIEW');
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [waiting, load]);

  // Free days open and close on their own: re-check the library right after the next boundary.
  const fw = lib?.freeWindow;
  useEffect(() => {
    const target = fw?.active ? fw.endsAt : fw?.nextStartsAt;
    if (!target) return undefined;
    const ms = Date.parse(target) - Date.parse(fw.serverTime) + 1500; // measured on the server's clock
    if (!(ms > 0)) return undefined;
    const t = setTimeout(load, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [fw, load]);

  const select = id => setParams(p => { const n = new URLSearchParams(p); if (id) n.set('book', id); else n.delete('book'); return n; });
  const closePanel = useCallback(() => { setSubmitError(null); select(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(taskId) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      apply(await readingApi.submitTask(taskId));
    } catch (e) {
      setSubmitError(e);
      if (e.status === 409) load();
    } finally {
      setSubmitting(false);
    }
  }

  // ---- logged out ----
  if (authLoading) return <Shell lead="Loading…" />;
  if (!user) {
    return (
      <Shell lead="Access your available reading material.">
        <div className="rd-card">
          <p>Please log in to continue.</p>
          <Link className="btn btn-lime" to="/login?next=/read/books">Login to Continue <span className="ar">→</span></Link>
        </div>
      </Shell>
    );
  }

  // ---- errors / loading ----
  if (error && !lib) {
    return (
      <Shell lead="We couldn't load your library.">
        <div className="rd-card">
          <p className="rd-error" role="alert">{error.message}</p>
          <button className="btn btn-dark" onClick={load}>Try again</button>
        </div>
      </Shell>
    );
  }
  if (!lib) {
    return (
      <section className="rd-section lib">
        <span className="label">Your Library</span>
        <h1 className="h-l lib-h">Loading your books…</h1>
        <LibrarySkeleton />
      </section>
    );
  }

  const selected = lib.books.find(b => b.id === openId);

  // ---- reader ----
  if (selected?.state === 'UNLOCKED') {
    return <BookReader key={selected.id} book={selected} startPage={selected.currentPage} onAccessLost={load} onBack={closePanel} />;
  }

  // ---- library ----
  const unlocked = lib.books.filter(b => b.state === 'UNLOCKED').length;
  const adminLink = isAdmin && <Link className="rd-link" to="/admin/reading">Open the Reading admin →</Link>;
  const mentorship = lib.mentorshipPayment && (lib.mentorshipPayment === 'PENDING' || lib.mentorshipPayment === 'REJECTED');

  return (
    <section className="rd-section lib">
      <header className="lib-head">
        <span className="label">Your Library</span>
        <h1 className="h-l lib-h">Pick a book to <span className="hl">start reading.</span></h1>
        <p className="lib-sub">
          {lib.books.length === 0
            ? 'No books are available yet. Please check back soon.'
            : <><b>{unlocked}</b> of {lib.books.length} unlocked. Open a locked book to see the task that unlocks it; one task can open several books at once.</>}
        </p>
        {lib.books.length > 0 && (
          <div className="lib-meter" role="progressbar" aria-label="Books unlocked" aria-valuemin={0} aria-valuemax={lib.books.length} aria-valuenow={unlocked}>
            <b style={{ width: `${(unlocked / lib.books.length) * 100}%` }} />
          </div>
        )}
      </header>

      {mentorship && <MentorshipNotice state={lib.mentorshipPayment} />}
      {fw && <FreeBanner fw={fw} />}

      {lib.books.length > 0 && (
        <ul className="lib-grid">
          {lib.books.map((b, i) => (
            <BookCard key={b.id} book={b} index={i} fresh={fresh.includes(b.id)} onOpen={x => { setSubmitError(null); select(x.id); }} />
          ))}
        </ul>
      )}
      {adminLink && <p className="lib-admin">{adminLink}</p>}

      {selected && selected.state !== 'UNLOCKED' && (
        <TaskPanel book={selected} busy={submitting} error={submitError} onClose={closePanel} onSubmit={() => submit(selected.task.id)} />
      )}
      {toast && <div className="lib-toast" role="status"><LockIcon open /> {toast}</div>}
    </section>
  );
}

// Admins land on the dashboard; "View as reader" (?view=reader) shows them the page readers see.
export default function ReadBooks() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [params] = useSearchParams();
  const asReader = params.get('view') === 'reader';

  if (!loading && user && isAdmin && !asReader) return <Navigate to="/admin/reading" replace />;
  if (user && isAdmin) {
    return (
      <>
        <div className="rd-adminbar" role="status">
          <span>Viewing as a reader</span>
          <Link className="rd-link" to="/admin/reading">← Back to admin dashboard</Link>
          <button type="button" className="rd-link rd-logout" onClick={logout}>Log out</button>
        </div>
        <ReaderPage />
      </>
    );
  }
  if (user) {
    return (
      <>
        <div className="rd-adminbar" role="status">
          <span>Signed in as {user.name || user.email}</span>
          <button type="button" className="rd-link rd-logout" onClick={logout}>Log out</button>
        </div>
        <ReaderPage />
      </>
    );
  }
  return <ReaderPage />;
}
