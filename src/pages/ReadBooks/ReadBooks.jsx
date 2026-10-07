import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { readingApi } from '../../services/readingApi.js';
import TaskCard from './TaskCard.jsx';
import BookReader from './BookReader.jsx';

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

function Shell({ label = 'Books', title = 'Books', lead, children }) {
  return (
    <section className="rd-section rd-narrow">
      <span className="label">{label}</span>
      <h1 className="h-l rd-title">{title}</h1>
      {lead && <p className="rd-lead">{lead}</p>}
      {children}
    </section>
  );
}

export default function ReadBooks() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await readingApi.status());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    if (user) load();
    else { setStatus(null); setError(null); }
  }, [user, load]);

  // While waiting for the admin, check back so approval shows up without a manual refresh.
  useEffect(() => {
    if (status?.state !== 'PENDING_REVIEW') return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [status?.state, load]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      setStatus(await readingApi.submitTask(status.task.id));
    } catch (e) {
      setError(e);
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

  // ---- errors ----
  if (error && !status) {
    return (
      <Shell lead="We couldn't load your reading status.">
        <div className="rd-card">
          <p className="rd-error" role="alert">{error.message}</p>
          <button className="btn btn-dark" onClick={load}>Try again</button>
        </div>
      </Shell>
    );
  }
  if (!status) return <Shell lead="Loading your reading status…" />;

  // ---- reader ----
  if (status.state === 'ACCESS_ACTIVE') {
    return <BookReader book={status.book} startPage={status.currentPage} onAccessLost={load} />;
  }

  const adminLink = isAdmin && <Link className="rd-link" to="/admin/reading">Open the Reading admin →</Link>;

  switch (status.state) {
    case 'NO_ACTIVE_TASK':
      return (
        <Shell lead="Access your available reading material.">
          <MentorshipNotice state={status.mentorshipPayment} />
          <div className="rd-card"><h2 className="rd-h2">Nothing to read yet</h2><p>There is no reading task available right now. Please check back soon.</p>{adminLink}</div>
        </Shell>
      );
    case 'PENDING_REVIEW':
      return (
        <Shell label="Reading task" title="Task Submitted">
          <div className="rd-card" role="status">
            <p>Your task has been submitted successfully.</p>
            <p>Your request is currently waiting for admin approval.</p>
            <p>You will receive reading access after your submission has been approved.</p>
            <button className="btn btn-dark" disabled>Submitted <span className="ar">✓</span></button>
          </div>
        </Shell>
      );
    case 'ACCESS_EXPIRED':
      return (
        <Shell lead="Access your available reading material.">
          <div className="rd-card"><h2 className="rd-h2">Reading access expired</h2><p>Your reading access has expired. Please contact the team to renew it.</p></div>
        </Shell>
      );
    case 'ACCESS_REVOKED':
      return (
        <Shell lead="Access your available reading material.">
          <div className="rd-card"><h2 className="rd-h2">Reading access removed</h2><p>Your reading access is no longer active. Please contact the team if you think this is a mistake.</p></div>
        </Shell>
      );
    default: // NOT_SUBMITTED, REJECTED
      return (
        <Shell label="Reading task" title="Your Reading Task" lead={status.state === 'REJECTED' ? undefined : 'Complete the following task before requesting access to the book.'}>
          <MentorshipNotice state={status.mentorshipPayment} />
          <TaskCard task={status.task} rejectedReason={status.state === 'REJECTED' ? (status.rejectionReason || '') : null} revision={status.state === 'REJECTED'} busy={submitting} error={error} onSubmit={submit} />
          {adminLink}
        </Shell>
      );
  }
}
