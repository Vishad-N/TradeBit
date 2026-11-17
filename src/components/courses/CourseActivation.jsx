import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { coursesApi } from '../../services/coursesApi.js';
import { openCheckout } from '../../lib/razorpay.js';
import { fmtDate, validityText } from '../../lib/courses.js';
import Icon from './Icons.jsx';

/**
 * How a logged-in learner switches a paid / task course on. Shows only what the admin enabled for the course:
 *  - Pay: server creates the Razorpay order (price comes from the course, never from here), checkout opens, the server verifies.
 *  - Task: hands the task in for an admin to approve.
 * Free assignment by an admin needs nothing here: the course simply opens for that learner.
 * `onChanged` reloads the course so the page flips to the unlocked state once access is active.
 */
export default function CourseActivation({ course, onChanged }) {
  const { user } = useAuth();
  const { activation, validity, mine } = course;
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const state = mine?.state || 'NONE';
  const pay = activation?.payment;
  const task = activation?.task;

  async function onPay() {
    setMsg(''); setBusy('pay');
    try {
      const order = await coursesApi.startPayment(course.id);
      await openCheckout({ order, description: course.title, user, onPaid: (r) => coursesApi.verifyPayment(course.id, r) });
      await onChanged();
    } catch (e) {
      if (!e.dismissed) setMsg(e.message);
    } finally { setBusy(''); }
  }

  async function onTask() {
    setMsg(''); setBusy('task');
    try { await coursesApi.submitTask(course.id); await onChanged(); } catch (e) { setMsg(e.message); } finally { setBusy(''); }
  }

  if (state === 'REVOKED') {
    return <p className="cx-lock"><Icon name="lock" size={18} className="cs-ic" /><span>Your access to this course was withdrawn. Please contact us if you think this is a mistake.</span></p>;
  }

  return (
    <div className="cx-act">
      {state === 'EXPIRED' && <p className="cx-lock"><Icon name="clock" size={18} className="cs-ic" /><span>Your access ended on {fmtDate(mine.expiresAt)}. Renew to keep learning.</span></p>}
      {state === 'REJECTED' && <p className="cx-lock" role="alert"><Icon name="alert" size={18} className="cs-ic" /><span>Your task was not approved{mine.rejectionReason ? `: ${mine.rejectionReason}` : '.'} You can submit it again.</span></p>}
      {state === 'NONE' && <p className="cx-lock"><Icon name="lock" size={18} className="cs-ic" /><span>Activate this course to start learning.</span></p>}
      {validity && <p className="cx-act-valid"><Icon name="clock" size={14} />{validityText(validity)}</p>}

      {pay && (
        <button type="button" className="btn btn-lime cs-btn" onClick={onPay} disabled={Boolean(busy)}>
          {busy === 'pay' ? 'Please wait…' : <>{state === 'EXPIRED' ? 'Renew' : 'Buy'} · ₹{pay.priceInr.toLocaleString('en-IN')}</>} <span className="ar">→</span>
        </button>
      )}

      {task && state === 'PENDING' && (
        <p className="cx-lock" role="status"><Icon name="clock" size={18} className="cs-ic" /><span><b>Task submitted.</b> Your access starts as soon as it is approved. You can close this page and come back.</span></p>
      )}
      {task && state !== 'PENDING' && (
        <div className="cx-act-task">
          {pay && <span className="cx-act-or">or complete the task</span>}
          <strong>{task.title}</strong>
          {task.description && <p>{task.description}</p>}
          <button type="button" className={`btn cs-btn ${pay ? 'btn-dark' : 'btn-lime'}`} onClick={onTask} disabled={Boolean(busy)}>
            {busy === 'task' ? 'Submitting…' : state === 'REJECTED' ? 'Submit again' : 'Mark as completed'} <span className="ar">→</span>
          </button>
        </div>
      )}
      {msg && <p className="cx-lock" role="alert"><Icon name="alert" size={18} className="cs-ic" /><span>{msg}</span></p>}
    </div>
  );
}
