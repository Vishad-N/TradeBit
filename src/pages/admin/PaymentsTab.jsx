import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/readingApi.js';

const STATUS_LABEL = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
const fmt = d => (d ? new Date(d).toLocaleString() : '—');
const short = h => `${h.slice(0, 8)}…${h.slice(-6)}`;
const Chip = ({ value }) => <span className={`rd-chip rd-chip-${value === 'PENDING' ? 'pending_review' : value.toLowerCase()}`}>{STATUS_LABEL[value] || value}</span>;

// Manual USDT (TRC20) payment review. There is no automatic verification: the admin checks the
// transaction hash and screenshot, then approves or rejects.
export default function PaymentsTab() {
  const [filter, setFilter] = useState('PENDING');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const [shot, setShot] = useState(null); // blob url of the open payment's screenshot
  const [shotError, setShotError] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setRows(await adminApi.mentorshipPayments(filter)); setError(null); } catch (e) { setError(e); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  // Fetch the private screenshot with the admin token whenever a payment is opened.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let url = null;
    setShot(null); setShotError('');
    adminApi.paymentScreenshot(open.id)
      .then(u => { url = u; alive ? setShot(u) : URL.revokeObjectURL(u); })
      .catch(e => alive && setShotError(e.message));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [open?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(kind, row = open) {
    setBusy(true); setMsg('');
    try {
      if (kind === 'approve') await adminApi.approvePayment(row.id);
      else await adminApi.rejectPayment(row.id, reason.trim() || undefined);
      setOpen(null); setReason('');
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="rd-note">USDT on TRC20, verified by hand. Check the transaction hash and screenshot before approving. Approving activates the user's 1:1 mentorship and unlocks the protected book.</p>
      <div className="rd-filters" role="tablist" aria-label="Filter payments">
        {[['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['', 'All']].map(([v, l]) => (
          <button key={l} type="button" role="tab" aria-selected={filter === v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {error && <p className="rd-error" role="alert">{error.message}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p>No payments here.</p> : (
        <div className="rd-table-wrap">
          <table className="rd-table">
            <thead><tr><th>User</th><th>Amount</th><th>Network</th><th>Tx hash</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td data-label="User"><strong>{r.user.name}</strong><small>{r.user.email}</small></td>
                  <td data-label="Amount">{r.amountPaid} USDT</td>
                  <td data-label="Network">{r.network}</td>
                  <td data-label="Tx hash" title={r.txHash}>{short(r.txHash)}</td>
                  <td data-label="Submitted">{fmt(r.submittedAt)}</td>
                  <td data-label="Status"><Chip value={r.status} /></td>
                  <td data-label="Action" className="rd-actions"><button className="rd-mini" onClick={() => { setOpen(r); setReason(r.rejectionReason || ''); setMsg(''); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="rd-modal-back" role="dialog" aria-modal="true" aria-label="Review payment" onClick={e => e.target === e.currentTarget && setOpen(null)}>
          <div className="rd-modal rd-card">
            <h2 className="rd-h2">Review payment</h2>
            <dl className="rd-dl">
              <dt>User</dt><dd>{open.user.name} ({open.user.email})</dd>
              <dt>Amount</dt><dd>{open.amountPaid} USDT</dd>
              <dt>Network</dt><dd>{open.network}</dd>
              <dt>Tx hash</dt><dd className="mp-hash">{open.txHash}</dd>
              <dt>Payment date</dt><dd>{fmt(open.paymentDate)}</dd>
              <dt>Submitted</dt><dd>{fmt(open.submittedAt)}</dd>
              <dt>Status</dt><dd><Chip value={open.status} /></dd>
              {open.reviewedAt && <><dt>Reviewed</dt><dd>{fmt(open.reviewedAt)}</dd></>}
              {open.rejectionReason && <><dt>Reason</dt><dd>{open.rejectionReason}</dd></>}
            </dl>
            <div>
              <span className="mp-k">Screenshot</span>
              {shot ? <a href={shot} target="_blank" rel="noopener noreferrer"><img className="mp-preview" src={shot} alt="Payment screenshot" /></a> : shotError ? <p className="rd-error">{shotError}</p> : <p>Loading screenshot…</p>}
            </div>
            <label className="rd-field"><span>Rejection reason (optional)</span><textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="e.g. Transaction not found on the TRC20 network." /></label>
            {msg && <p className="rd-error" role="alert">{msg}</p>}
            <div className="rd-modal-actions">
              <button className="btn btn-lime" disabled={busy || open.status === 'APPROVED'} onClick={() => decide('approve')}>Approve</button>
              <button className="btn btn-dark" disabled={busy || open.status === 'REJECTED'} onClick={() => decide('reject')}>Reject</button>
              <button className="rd-link" onClick={() => setOpen(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
