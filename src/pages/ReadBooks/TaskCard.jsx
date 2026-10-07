// The one global task. Title and description come from the database; the button is per-user.
export default function TaskCard({ task, revision, rejectedReason, busy, error, onSubmit }) {
  return (
    <div className="rd-card">
      {revision && (
        <div className="rd-notice" role="status">
          <strong>Task Requires Revision</strong>
          <p>Your previous submission was not approved.</p>
          {rejectedReason ? <p><b>Reason:</b> {rejectedReason}</p> : null}
        </div>
      )}
      <h2 className="rd-h2">{task.title}</h2>
      <p className="rd-pre">{task.description}</p>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      <button className="btn btn-lime" onClick={onSubmit} disabled={busy}>
        {busy ? 'Submitting…' : 'Mark as Completed'} <span className="ar">→</span>
      </button>
    </div>
  );
}
