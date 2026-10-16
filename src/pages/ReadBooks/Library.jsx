import { useEffect, useRef } from 'react';

// Cover palettes, in the site's colours. Chosen by position so a book keeps its colour while the list is stable.
const COVERS = [
  { bg: '#24472F', fg: '#F3F4EF', accent: '#B8D83D' },
  { bg: '#34297F', fg: '#F3F4EF', accent: '#B8D83D' },
  { bg: '#151814', fg: '#F3F4EF', accent: '#B8D83D' },
  { bg: '#B8D83D', fg: '#151814', accent: '#151814' },
];

const monogram = title => title.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const STATE_LABEL = {
  UNLOCKED: null,
  LOCKED: 'Task to unlock',
  PENDING_REVIEW: 'Waiting for approval',
  REJECTED: 'Needs another try',
  REVOKED: 'Access removed',
  EXPIRED: 'Access expired',
  NO_TASK: 'Coming soon',
};

export function LockIcon({ open }) {
  return (
    <svg className={`lib-lock${open ? ' is-open' : ''}`} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path className="lib-shackle" d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// One book in the library. Unlocked books open the reader; the rest open the task that unlocks them.
export function BookCard({ book, index, fresh, onOpen }) {
  const cover = COVERS[index % COVERS.length];
  const open = book.state === 'UNLOCKED';
  const label = STATE_LABEL[book.state];
  const pct = book.progressPercentage || 0;
  const bundle = book.task?.unlocks?.length > 1 ? book.task.unlocks.length : 0;

  return (
    <li className={`lib-item${fresh ? ' is-fresh' : ''}`} style={{ '--i': index }}>
      <button type="button" className={`lib-card lib-${book.state.toLowerCase()}`} onClick={() => onOpen(book)} aria-label={`${book.title}. ${open ? (pct > 0 ? `Continue reading, ${pct}% done` : 'Open book') : label}`}>
        <span className="lib-cover" style={{ '--bg': cover.bg, '--fg': cover.fg, '--ac': cover.accent }} aria-hidden="true">
          <i className="lib-ring" />
          <span className="lib-mono">{monogram(book.title)}</span>
          <span className="lib-spine" />
          <span className={`lib-badge${open ? ' on' : ''}`}><LockIcon open={open} /></span>
          {open && pct > 0 && <span className="lib-prog"><b style={{ width: `${pct}%` }} /></span>}
        </span>
        <span className="lib-info">
          <strong className="lib-title">{book.title}</strong>
          {book.description && <span className="lib-desc">{book.description}</span>}
          <span className="lib-foot">
            {open
              ? <span className="lib-cta">{pct > 0 ? `Continue · ${pct}%` : 'Read now'} <span className="ar">→</span></span>
              : <span className={`lib-chip lib-chip-${book.state.toLowerCase()}`}>{label}</span>}
            {!open && bundle > 0 && <span className="lib-bundle">+{bundle - 1} more with this task</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

// Slide-in panel for a locked book: the task that opens it, the other books it opens too, and its status.
export function TaskPanel({ book, busy, error, onClose, onSubmit }) {
  const closeRef = useRef(null);
  const task = book.task;

  useEffect(() => {
    const opener = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeRef.current?.focus(), 80);
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  const others = (task?.unlocks || []).filter(b => b.id !== book.id);
  const state = book.state;

  return (
    <div className="lib-back" role="dialog" aria-modal="true" aria-labelledby="lib-p-t" onClick={e => e.target === e.currentTarget && onClose()}>
      <aside className="lib-panel">
        <button ref={closeRef} type="button" className="lib-x" aria-label="Close" onClick={onClose}>✕</button>

        <span className="label lib-p-1">{state === 'PENDING_REVIEW' ? 'Submitted' : 'Unlock this book'}</span>
        <h2 id="lib-p-t" className="lib-p-title lib-p-2">{book.title}</h2>

        {state === 'NO_TASK' && <p className="lib-note lib-p-3">There is no task for this book yet. Please check back soon.</p>}
        {state === 'EXPIRED' && <p className="lib-note lib-p-3">Your reading access has expired. Please contact the team to renew it.</p>}
        {state === 'REVOKED' && <p className="lib-note lib-p-3">Your reading access to this book was removed. Please contact the team if you think this is a mistake.</p>}

        {task && (state === 'LOCKED' || state === 'REJECTED' || state === 'PENDING_REVIEW') && (
          <>
            {state === 'REJECTED' && (
              <div className="rd-notice lib-p-3" role="status">
                <strong>Task requires revision</strong>
                <p>Your previous submission was not approved.</p>
                {book.rejectionReason ? <p><b>Reason:</b> {book.rejectionReason}</p> : null}
              </div>
            )}
            <div className="lib-task lib-p-3">
              <span className="lib-task-k">Your task</span>
              <h3>{task.title}</h3>
              <p className="rd-pre">{task.description}</p>
            </div>

            {others.length > 0 && (
              <div className="lib-also lib-p-4">
                <span className="lib-task-k">Completing it also unlocks</span>
                <ul>{others.map((b, i) => <li key={b.id} style={{ '--j': i }}><LockIcon />{b.title}</li>)}</ul>
              </div>
            )}

            {error && <p className="rd-error" role="alert">{error.message}</p>}

            {state === 'PENDING_REVIEW' ? (
              <div className="lib-wait lib-p-5" role="status">
                <span className="lib-pulse" aria-hidden="true" />
                <div>
                  <strong>Waiting for approval</strong>
                  <p>Your task was submitted. {others.length > 0 ? 'These books unlock' : 'This book unlocks'} as soon as an admin approves it. You can close this and come back.</p>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-lime lib-submit lib-p-5" onClick={onSubmit} disabled={busy}>
                {busy ? 'Submitting…' : state === 'REJECTED' ? 'Submit again' : 'Mark as Completed'} <span className="ar">→</span>
              </button>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <ul className="lib-grid" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <li key={i} className="lib-item" style={{ '--i': i }}>
          <div className="lib-card lib-skel"><span className="lib-cover" /><span className="lib-info"><i /><i /></span></div>
        </li>
      ))}
    </ul>
  );
}
