import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext.jsx';
import { mentorshipApi } from '../services/readingApi.js';

const fmtDate = d => (d ? new Date(d).toLocaleString() : '—');
const todayISO = () => new Date().toISOString().slice(0, 10);

function Shell({ title, lead, children }) {
  return (
    <section className="rd-section rd-narrow">
      <span className="label">1:1 Mentorship</span>
      <h1 className="h-l rd-title">{title}</h1>
      {lead && <p className="rd-lead">{lead}</p>}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- payment details (fee / network / wallet / QR)
function PaymentDetails({ info }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!showQr || qr || !info.walletAddress) return;
    QRCode.toDataURL(info.walletAddress, { margin: 1, width: 220, color: { dark: '#151814', light: '#F3F4EF' } }).then(setQr).catch(() => setQr(null));
  }, [showQr, qr, info.walletAddress]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(info.walletAddress);
    } catch {
      // Clipboard API unavailable (http, old browser): fall back to selecting the text.
      const el = document.getElementById('wallet-address');
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rd-card mp-pay">
      <div className="mp-row"><span className="mp-k">Mentorship fee</span><b className="mp-fee">{info.priceUsdt} <small>USDT</small></b></div>
      <div className="mp-row"><span className="mp-k">Network</span><b className="mp-net">TRC20</b></div>
      <div className="mp-wallet">
        <span className="mp-k">Wallet address</span>
        <code id="wallet-address" className="mp-addr">{info.walletAddress}</code>
        <div className="mp-btns">
          <button type="button" className="btn btn-dark" onClick={copy}>{copied ? 'Copied ✓' : 'Copy address'}</button>
          <button type="button" className="rd-mini" aria-expanded={showQr} onClick={() => setShowQr(v => !v)}>{showQr ? 'Hide QR' : 'Show QR'}</button>
        </div>
        {showQr && (qr ? <img className="mp-qr" src={qr} alt="QR code of the wallet address" width="220" height="220" /> : <p className="rd-note">Generating QR…</p>)}
      </div>
      <div className="mp-warn" role="note">
        <strong>Use the TRC20 (TRON) network only.</strong>
        <p>Send exactly <b>USDT</b> on <b>TRC20</b>. Funds sent on any other network or in any other coin will be lost and cannot be recovered.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- submit payment details
function PaymentForm({ onDone }) {
  const [f, setF] = useState({ amountPaid: '', txHash: '', paymentDate: todayISO() });
  const [shot, setShot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pick(e) {
    const file = e.target.files?.[0];
    setError('');
    if (!file) { setShot(null); setPreview(null); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError('Screenshot must be a JPG, PNG or WEBP image.'); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setError('Screenshot must be 5MB or smaller.'); e.target.value = ''; return; }
    setShot(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const hash = f.txHash.trim();
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) return setError('Transaction hash must be 64 characters (0-9, a-f). Copy it from your wallet or exchange.');
    if (!/^\d{1,12}(\.\d{1,6})?$/.test(f.amountPaid.trim()) || Number(f.amountPaid) <= 0) return setError('Enter the amount you paid, e.g. 150 or 150.5.');
    if (!shot) return setError('Please attach your payment screenshot.');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('amountPaid', f.amountPaid.trim());
      form.append('txHash', hash);
      form.append('paymentDate', f.paymentDate);
      form.append('screenshot', shot);
      onDone(await mentorshipApi.submitPayment(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rd-card rd-form" onSubmit={submit} noValidate>
      <h2 className="rd-h2">After you have paid</h2>
      <p className="rd-note">Payment is verified manually by our team, so add the details below. This can take some time.</p>
      <label className="rd-field"><span>Amount paid (USDT)</span><input inputMode="decimal" value={f.amountPaid} onChange={set('amountPaid')} placeholder="e.g. 150" required /></label>
      <label className="rd-field"><span>Transaction hash</span><input value={f.txHash} onChange={set('txHash')} placeholder="64-character transaction ID" autoComplete="off" spellCheck="false" required /></label>
      <label className="rd-field"><span>Payment date</span><input type="date" value={f.paymentDate} max={todayISO()} onChange={set('paymentDate')} required /></label>
      <label className="rd-field"><span>Payment screenshot</span><input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} onChange={pick} required /><small>JPG, PNG or WEBP, up to 5MB.</small></label>
      {preview && <img className="mp-preview" src={preview} alt="Preview of your payment screenshot" />}
      {error && <p className="rd-error" role="alert">{error}</p>}
      <button className="btn btn-lime rd-block" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit payment for verification'} <span className="ar">→</span></button>
    </form>
  );
}

// ---------------------------------------------------------------- local test mode (skip payment)
function TestModeBanner({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function activate() {
    setBusy(true); setError('');
    try { onDone(await mentorshipApi.testActivate()); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="rd-notice" role="note">
      <strong>Test mode: payment is disabled</strong>
      <p>This is a local testing switch. Skip the payment to activate the mentorship (and unlock the book) right away.</p>
      {error && <p className="rd-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-lime" onClick={activate} disabled={busy}>{busy ? 'Activating…' : 'Activate mentorship (skip payment)'} <span className="ar">→</span></button>
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Mentorship() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([mentorshipApi.status(), mentorshipApi.paymentInfo()]);
      setStatus(s); setInfo(i); setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  // While waiting for the admin, check back so approval shows up without a manual refresh.
  useEffect(() => {
    if (status?.state !== 'PENDING') return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [status?.state, load]);

  if (authLoading) return <Shell title="1:1 Mentorship" lead="Loading…" />;
  if (!user) {
    return (
      <Shell title="Log in to continue" lead="Create an account or log in to apply for 1:1 mentorship.">
        <div className="rd-card"><Link className="btn btn-lime" to="/login?next=/mentorship">Login to Continue <span className="ar">→</span></Link></div>
      </Shell>
    );
  }
  if (error && !status) {
    return (
      <Shell title="1:1 Mentorship" lead="We couldn't load your mentorship status.">
        <div className="rd-card"><p className="rd-error" role="alert">{error.message}</p><button className="btn btn-dark" onClick={load}>Try again</button></div>
      </Shell>
    );
  }
  if (!status || !info) return <Shell title="1:1 Mentorship" lead="Loading…" />;

  if (status.state === 'APPROVED') {
    return (
      <Shell title="Mentorship Active" lead="Your payment has been verified. Welcome aboard.">
        <div className="rd-card" role="status">
          <p>Your 1:1 mentorship is now active. Your mentorship is managed on Telegram.</p>
          {status.telegramUrl
            ? <a className="btn btn-lime" href={status.telegramUrl} target="_blank" rel="noopener noreferrer">Open Telegram <span className="ar">→</span></a>
            : <p className="rd-note">Your mentor will contact you on Telegram shortly.</p>}
          <Link className="rd-link" to="/read/books">Open your protected book →</Link>
        </div>
      </Shell>
    );
  }

  if (status.state === 'PENDING') {
    const p = status.payment;
    return (
      <Shell title="Payment Pending">
        <div className="rd-card" role="status">
          <p>Your payment has been submitted and is waiting for manual verification.</p>
          <dl className="rd-dl">
            <dt>Amount</dt><dd>{p.amountPaid} USDT</dd>
            <dt>Network</dt><dd>{p.network}</dd>
            <dt>Tx hash</dt><dd className="mp-hash">{p.txHash}</dd>
            <dt>Submitted</dt><dd>{fmtDate(p.submittedAt)}</dd>
          </dl>
          <p className="rd-note">You'll get Telegram access and your book unlocks once an admin approves it. You can close this page and come back.</p>
        </div>
      </Shell>
    );
  }

  // NOT_STARTED or REJECTED
  return (
    <Shell title="Apply for 1:1 Mentorship" lead="Learn directly with the mentor. Pay in USDT on TRC20, then submit your payment details for manual verification.">
      {status.state === 'REJECTED' && (
        <div className="rd-notice" role="status">
          <strong>Payment not approved</strong>
          <p>Your last submission could not be verified.</p>
          {status.rejectionReason ? <p><b>Reason:</b> {status.rejectionReason}</p> : null}
          <p>You can submit the correct details again below.</p>
        </div>
      )}
      {info.testMode && <TestModeBanner onDone={setStatus} />}
      {!info.configured ? (
        info.testMode ? null : <div className="rd-card"><h2 className="rd-h2">Payments open soon</h2><p>1:1 mentorship payments are not available yet. Please check back shortly.</p></div>
      ) : (
        <>
          <ol className="mp-steps"><li>Pay in USDT on TRC20</li><li>Submit your payment details</li><li>We verify it manually</li></ol>
          <PaymentDetails info={info} />
          <div className="rd-gap" />
          <PaymentForm onDone={setStatus} />
        </>
      )}
    </Shell>
  );
}
