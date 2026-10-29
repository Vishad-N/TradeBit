import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';

const LABEL = { PENDING: 'Awaiting approval', ACTIVE: 'Active', REJECTED: 'Rejected', REVOKED: 'Revoked' };
const SOURCE = { FREE_APPROVAL: 'Free (approval)', PAYMENT: 'Paid online' };
const fmt = d => (d ? new Date(d).toLocaleString() : '—');
const Chip = ({ value }) => <span className={`rd-chip rd-chip-${value === 'PENDING' ? 'pending_review' : value === 'ACTIVE' ? 'approved' : 'rejected'}`}>{LABEL[value] || value}</span>;

// Programme enrolments ("Your Invitation"). Free sign-ups wait here for approval; paid ones arrive already active.
// An ACTIVE enrolment opens every published course whose access is "Enrolled students".
export default function EnrollmentsTab() {
  const [filter, setFilter] = useState('PENDING');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { setRows(await adminApi.enrollments(filter)); setError(''); } catch (e) { setError(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function act(kind, row) {
    let reason = '';
    if (kind === 'reject') { reason = window.prompt('Reason (optional, shown to the user):', ''); if (reason === null) return; }
    if (kind === 'revoke' && !window.confirm(`Withdraw ${row.user.name}'s course access?`)) return;
    setBusy(row.id); setError('');
    try {
      if (kind === 'approve') await adminApi.approveEnrollment(row.id);
      else if (kind === 'reject') await adminApi.rejectEnrollment(row.id, reason.trim() || undefined);
      else await adminApi.revokeEnrollment(row.id);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  return (
    <>
      <p className="rd-note">Students who enrol in "Your Invitation". When the price is 0 they wait here for your approval; when it is above 0 they pay through Razorpay and are activated automatically. Active students can open every published course set to "Enrolled students".</p>
      <div className="rd-filters" role="tablist" aria-label="Filter enrolments">
        {[['PENDING', 'Awaiting approval'], ['ACTIVE', 'Active'], ['REJECTED', 'Rejected'], ['REVOKED', 'Revoked'], ['', 'All']].map(([v, l]) => (
          <button key={l} type="button" role="tab" aria-selected={filter === v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {error && <p className="rd-error" role="alert">{error}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>No enrolments here.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>Student</th><th>Phone</th><th>Type</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td data-label="Student"><strong>{r.user.name}</strong><small>{r.user.email}</small></td>
                  <td data-label="Phone">{r.user.phone || '—'}</td>
                  <td data-label="Type">{SOURCE[r.source]}</td>
                  <td data-label="Requested">{fmt(r.requestedAt)}</td>
                  <td data-label="Status"><Chip value={r.status} />{r.rejectionReason && <small>{r.rejectionReason}</small>}</td>
                  <td data-label="Action" className="rd-actions">
                    {r.status !== 'ACTIVE' && <button className="rd-mini" disabled={busy === r.id} onClick={() => act('approve', r)}>Approve</button>}
                    {r.status === 'PENDING' && <button className="rd-mini" disabled={busy === r.id} onClick={() => act('reject', r)}>Reject</button>}
                    {r.status === 'ACTIVE' && <button className="rd-mini" disabled={busy === r.id} onClick={() => act('revoke', r)}>Revoke</button>}
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
