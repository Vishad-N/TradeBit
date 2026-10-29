import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { enrollmentApi } from '../services/readingApi.js';
import { usePricing } from '../context/PricingContext.jsx';
import { useSiteLinks } from '../context/SiteLinksContext.jsx';

let rzpScript;
/** Loads Razorpay's checkout script once. */
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  rzpScript ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => { rzpScript = null; reject(new Error('Could not load the payment window. Check your connection and try again.')); };
    document.body.appendChild(s);
  });
  return rzpScript;
};

/**
 * "Enrol" for the programme. Logged out -> login first.
 * Price 0 -> the student joins the Telegram channel first (verified through the bot when it is set up), then the request goes to an admin.
 * Price above 0 -> Razorpay checkout (a verified payment activates access).
 * Once the server marks the user ACTIVE, the button becomes "Start learning".
 */
export default function EnrollButton({ className = 'btn btn-lime btn-xl', children = 'Get Started Now' }) {
  const { user, loading } = useAuth();
  const { invitation } = usePricing();
  const { telegram } = useSiteLinks();
  const navigate = useNavigate();
  const here = encodeURIComponent(useLocation().pathname + '#offer');
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tg, setTg] = useState(null); // set while the student still has to link / join on Telegram

  const refresh = useCallback(() => enrollmentApi.me().then(setInfo).catch(() => setInfo(null)), []);
  useEffect(() => { if (user) refresh(); else setInfo(null); }, [user?.id, invitation.price, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async (order) => {
    await loadRazorpay();
    await new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'TradeBit India',
        description: 'Your Invitation: complete programme',
        prefill: { name: user.name, email: user.email },
        theme: { color: '#B8D83D' },
        handler: async (r) => {
          try { setInfo(await enrollmentApi.verify(r)); resolve(); } catch (e) { reject(e); }
        },
        modal: { ondismiss: () => reject(Object.assign(new Error(''), { dismissed: true })) },
      });
      rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'The payment did not go through.')));
      rzp.open();
    });
  };

  const onClick = async () => {
    setMsg(''); setBusy(true);
    // Free: open the channel inside the click itself (browsers block popups opened after an await), then queue the request.
    // Without the bot nothing can be checked, so just send them to the channel. With the bot, the panel below walks them through it.
    if (invitation.price === 0 && telegram && info && !info.telegramBot) window.open(telegram, '_blank', 'noopener,noreferrer');
    try {
      const r = await enrollmentApi.start();
      if (r.mode === 'PAY') await pay(r);
      else if (r.mode === 'TELEGRAM') {
        setInfo(r);
        // Telling them apart: the first try just shows the steps, a retry after "continue" explains what is still missing.
        setTg((prev) => (prev && prev.step === r.step ? { ...r, retried: true } : r));
      } else { setTg(null); setInfo(r); }
    } catch (e) {
      if (!e.dismissed) setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <button type="button" className={className} disabled>{children}</button>;
  if (!user) return <Link className={className} to={`/login?next=${here}`}>{children} <span className="ar">→</span></Link>;
  if (info?.state === 'ACTIVE') return <button type="button" className={className} onClick={() => navigate('/courses')}>Start learning <span className="ar">→</span></button>;
  if (info?.state === 'PENDING') {
    return (
      <p role="status" className="enroll-note">
        <b>Request received.</b> We will approve your access shortly. You will see your courses here as soon as it is approved.
        {telegram && <> Not in the channel yet? <a href={telegram} target="_blank" rel="noopener noreferrer">Join our Telegram</a>.</>}
      </p>
    );
  }
  const paid = invitation.price > 0;
  const channel = info?.channelUrl || telegram;
  if (tg && !paid) {
    const linked = tg.step === 'JOIN';
    return (
      <div className="enroll-note" role="group" aria-label="Join Telegram">
        <p><b>Two quick steps on Telegram, then we send your request to the team.</b></p>
        <ol>
          <li>{linked ? <>Telegram linked ✓</> : <><a href={tg.botUrl} target="_blank" rel="noopener noreferrer">Open our Telegram bot</a> and press <b>Start</b>.</>}</li>
          <li>{channel ? <><a href={channel} target="_blank" rel="noopener noreferrer">Join our Telegram channel</a>.</> : 'Join our Telegram channel.'}</li>
        </ol>
        <button type="button" className={className} onClick={onClick} disabled={busy}>{busy ? 'Checking…' : 'I have done both, continue'} <span className="ar">→</span></button>
        {tg.retried && <p role="alert">{linked ? 'We cannot see you in the channel yet. Join it, then try again.' : 'We have not seen your Start in the bot yet. Press Start there, then try again.'}</p>}
        {msg && <p role="alert">{msg}</p>}
      </div>
    );
  }
  return (
    <>
      <button type="button" className={className} onClick={onClick} disabled={busy}>
        {busy ? 'Please wait…' : paid ? `Enrol · pay ₹${invitation.price.toLocaleString('en-IN')}` : 'Join Telegram & enrol free'} <span className="ar">→</span>
      </button>
      {info?.state === 'REJECTED' && <p role="alert" className="enroll-note">Your last request was not approved{info.rejectionReason ? `: ${info.rejectionReason}` : '.'} You can request again.</p>}
      {msg && <p role="alert" className="enroll-note">{msg}</p>}
    </>
  );
}
