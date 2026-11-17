import { typeToConfirm } from '../../lib/confirmDelete.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { coursesAdminApi } from '../../services/coursesApi.js';
import { ACCESS_HELP, ACCESS_LABEL, VALIDITY_UNIT_LABEL, fmtClock, fmtDate, fmtDuration, parseClock, parseVimeo } from '../../lib/courses.js';
import Icon from '../../components/courses/Icons.jsx';
import { CourseThumb } from '../courses/shared.jsx';
import CourseIconPicker, { iconPayload, iconValueOf } from '../../components/courses/CourseIconPicker.jsx';
import AdminGate from './AdminGate.jsx';

// ---------------------------------------------------------------- small pieces
function IconBtn({ icon, label, onClick, disabled, danger }) {
  return <button type="button" className={`ca-ib${danger ? ' danger' : ''}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}><Icon name={icon} size={16} /></button>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="rd-modal-back ca-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rd-modal rd-card"><h2 className="rd-h2">{title}</h2>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- module + lesson editors
function ModuleModal({ module, onClose, onSave }) {
  const [f, setF] = useState({ title: module?.title || '', description: module?.description || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await onSave({ title: f.title.trim(), description: f.description.trim() }); onClose(); } catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <Modal title={module ? 'Edit module' : 'New module'} onClose={onClose}>
      <form className="rd-form" style={{ maxWidth: 'none' }} onSubmit={submit}>
        <label className="rd-field"><span>Module title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={160} autoFocus /></label>
        <label className="rd-field"><span>Description (optional)</span><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={1000} /></label>
        {err && <p className="rd-error" role="alert">{err}</p>}
        <div className="rd-modal-actions">
          <button className="btn btn-lime cs-btn" type="submit" disabled={busy || !f.title.trim()}>{busy ? 'Saving…' : 'Save'} <span className="ar">→</span></button>
          <button className="btn btn-dark cs-btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function LessonModal({ lesson, onClose, onSave }) {
  const [f, setF] = useState({
    title: lesson?.title || '',
    video: lesson?.vimeoId ? `https://vimeo.com/${lesson.vimeoId}${lesson.vimeoHash ? `/${lesson.vimeoHash}` : ''}` : '',
    duration: lesson?.durationSec ? fmtClock(lesson.durationSec) : '',
    description: lesson?.description || '',
    isFreePreview: Boolean(lesson?.isFreePreview),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const v = parseVimeo(f.video);
  const secs = parseClock(f.duration);

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (v.error) return setErr('That does not look like a Vimeo link or video ID.');
    if (secs === null) return setErr('Duration looks like 12:30 (minutes:seconds) or just minutes.');
    setBusy(true);
    try {
      await onSave({ title: f.title.trim(), description: f.description.trim(), video: f.video.trim(), durationSec: secs, isFreePreview: f.isFreePreview });
      onClose();
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <Modal title={lesson ? 'Edit lesson' : 'New lesson'} onClose={onClose}>
      <form className="rd-form" style={{ maxWidth: 'none' }} onSubmit={submit}>
        <label className="rd-field"><span>Lesson title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={160} autoFocus /></label>
        <label className="rd-field"><span>Vimeo link or video ID</span>
          <input value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} placeholder="https://vimeo.com/123456789  or  123456789" maxLength={300} inputMode="url" />
          <span className={`ca-vimeo-hint ${v.error ? 'bad' : v.id ? 'ok' : ''}`}>
            {v.error ? 'Not a valid Vimeo link or ID.' : v.id ? `Video ID ${v.id}${v.hash ? ' · unlisted link detected' : ''}` : 'Leave empty to save the lesson now and add the video later. Students will see "Video coming soon".'}
          </span>
        </label>
        <div className="ca-grid2">
          <label className="rd-field"><span>Duration</span><input value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} placeholder="12:30" maxLength={9} inputMode="numeric" />
            <small>Optional. Minutes:seconds. If left empty, it is filled in from the video the first time a student plays it.</small></label>
          <label className="ca-check" style={{ alignSelf: 'center' }}>
            <input type="checkbox" checked={f.isFreePreview} onChange={(e) => setF({ ...f, isFreePreview: e.target.checked })} />
            <span><b>Free preview</b><small>Anyone can watch this lesson, even without access to the course.</small></span>
          </label>
        </div>
        <label className="rd-field"><span>Description (optional)</span><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={3000} /></label>
        {err && <p className="rd-error" role="alert">{err}</p>}
        <div className="rd-modal-actions">
          <button className="btn btn-lime cs-btn" type="submit" disabled={busy || !f.title.trim()}>{busy ? 'Saving…' : 'Save lesson'} <span className="ar">→</span></button>
          <button className="btn btn-dark cs-btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- curriculum
function ModuleCard({ mod, index, count, onMove, reload, fail }) {
  const [edit, setEdit] = useState(null); // { kind: 'module' } | { kind: 'lesson', lesson? }
  const run = async (fn) => { try { await fn(); await reload(); } catch (e) { fail(e.message); } };
  const moveLesson = (i, d) => run(() => {
    const ids = mod.lessons.map((l) => l.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    return coursesAdminApi.reorderLessons(mod.id, ids);
  });

  return (
    <section className="ca-mod" aria-label={`Module ${index + 1}: ${mod.title}`}>
      <div className="ca-mod-head">
        <strong>Module {index + 1} · {mod.title}<small>{mod.lessons.length} lesson{mod.lessons.length === 1 ? '' : 's'}</small></strong>
        <div className="ca-tools">
          <IconBtn icon="chevronUp" label="Move module up" onClick={() => onMove(index, -1)} disabled={index === 0} />
          <IconBtn icon="chevronDown" label="Move module down" onClick={() => onMove(index, 1)} disabled={index === count - 1} />
          <IconBtn icon="edit" label="Edit module" onClick={() => setEdit({ kind: 'module' })} />
          <IconBtn icon="trash" label="Delete module" danger onClick={() => {
            const typed = mod.lessons.length ? typeToConfirm(`Remove the module "${mod.title}" and its ${mod.lessons.length} lesson(s) from the course? Learner progress on them is kept.`, mod.title) : (window.confirm(`Delete the empty module "${mod.title}"?`) ? mod.title : null);
            if (typed) run(() => coursesAdminApi.removeModule(mod.id, typed));
          }} />
        </div>
      </div>
      {mod.lessons.length === 0 ? <p className="ca-empty">No lessons yet.</p> : (
        <ul className="ca-les">
          {mod.lessons.map((l, i) => (
            <li key={l.id}>
              <span className="n">{i + 1}</span>
              <div className="t">
                <strong>{l.title}</strong>
                <span className="chips">
                  {l.vimeoId ? <span className="cs-chip"><Icon name="video" size={12} />Vimeo {l.vimeoId}</span> : <span className="cs-chip warn"><Icon name="alert" size={12} />No video</span>}
                  {l.durationSec > 0 && <span className="cs-chip"><Icon name="clock" size={12} />{fmtClock(l.durationSec)}</span>}
                  {l.isFreePreview && <span className="cs-chip acc">Free preview</span>}
                </span>
              </div>
              <div className="ca-tools">
                <IconBtn icon="chevronUp" label="Move lesson up" onClick={() => moveLesson(i, -1)} disabled={i === 0} />
                <IconBtn icon="chevronDown" label="Move lesson down" onClick={() => moveLesson(i, 1)} disabled={i === mod.lessons.length - 1} />
                <IconBtn icon="edit" label="Edit lesson" onClick={() => setEdit({ kind: 'lesson', lesson: l })} />
                <IconBtn icon="trash" label="Delete lesson" danger onClick={() => { const typed = typeToConfirm(`Remove the lesson "${l.title}" from the course? Learner progress on it is kept.`, l.title); if (typed) run(() => coursesAdminApi.removeLesson(l.id, typed)); }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-12)' }}>
        <button type="button" className="rd-mini" onClick={() => setEdit({ kind: 'lesson' })}><Icon name="plus" size={12} /> Add lesson</button>
      </div>

      {edit?.kind === 'module' && <ModuleModal module={mod} onClose={() => setEdit(null)} onSave={async (d) => { await coursesAdminApi.updateModule(mod.id, d); await reload(); }} />}
      {edit?.kind === 'lesson' && (
        <LessonModal lesson={edit.lesson} onClose={() => setEdit(null)}
          onSave={async (d) => { await (edit.lesson ? coursesAdminApi.updateLesson(edit.lesson.id, d) : coursesAdminApi.addLesson(mod.id, d)); await reload(); }} />
      )}
    </section>
  );
}

const SOURCE_LABEL = { ADMIN: 'Assigned by admin', PAYMENT: 'Paid online', TASK: 'Task' };

/** Who has the course: free assignments, buyers and task requests, with each person's start and end date. */
function Enrollments({ course }) {
  const [rows, setRows] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { coursesAdminApi.enrollments(course.id).then(setRows).catch((e) => setErr(e.message)); }, [course.id]);

  const run = async (fn) => { setErr(''); try { setRows(await fn()); } catch (x) { setErr(x.message); } };
  async function add(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { setRows(await coursesAdminApi.enroll(course.id, email.trim())); setEmail(''); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  const status = (r) => (r.status === 'ACTIVE' ? (r.expired ? ['Expired', 'warn'] : ['Active', 'acc']) : r.status === 'PENDING' ? ['Waiting for approval', 'draft'] : r.status === 'REJECTED' ? ['Rejected', 'warn'] : ['Revoked', 'warn']);
  const dates = (r) => (r.status !== 'ACTIVE' ? `Requested ${fmtDate(r.requestedAt)}` : `${fmtDate(r.activatedAt)} → ${r.expiresAt ? `${fmtDate(r.expiresAt)}${r.expired ? '' : ` · ${Math.max(0, Math.ceil((new Date(r.expiresAt) - Date.now()) / 86400000))} days left`}` : 'Lifetime'}`);

  return (
    <div className="cs-box rd-form ca-card" style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
      <h2 className="rd-h2">Students &amp; access</h2>
      <p className="ca-hint">{course.access === 'PUBLIC' ? 'This course is open to every logged-in user, so activation is not needed. It matters if you switch it to 1% Club or Enrolled students.' : 'Assign a student for free (works whether or not payment or a task is switched on). Their validity starts now, using the length set above. Paid students and task requests appear here too.'}</p>
      <form className="ca-add" onSubmit={add}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" required maxLength={200} aria-label="Student email" />
        <button className="btn btn-dark cs-btn" type="submit" disabled={busy || !email.trim()}>{busy ? 'Assigning…' : 'Assign free access'}</button>
      </form>
      {err && <p className="rd-error" role="alert">{err}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p className="ca-hint">No one has this course yet.</p> : (
        <ul className="ca-enr">
          {rows.map((r) => {
            const [label, tone] = status(r);
            return (
              <li key={r.userId}>
                <div className="t">
                  <strong style={{ fontWeight: 500 }}>{r.name}</strong>
                  <small>{r.email}</small>
                  <small><span className={`cs-chip ${tone}`}>{label}</span> {SOURCE_LABEL[r.source]} · {dates(r)}</small>
                  {r.status === 'REJECTED' && r.rejectionReason && <small>Reason: {r.rejectionReason}</small>}
                  {r.payment && <small>Paid ₹{(r.payment.amountPaise / 100).toLocaleString('en-IN')}{r.payment.status === 'REFUNDED' ? ' · refunded' : ''} · {r.payment.razorpayPaymentId || 'no payment id'}{r.payment.paidAt ? ` · ${fmtDate(r.payment.paidAt)}` : ''}</small>}
                </div>
                <div className="ca-tools">
                  {r.status === 'PENDING' && <>
                    <button type="button" className="rd-mini rd-go" onClick={() => run(() => coursesAdminApi.approveEnrollment(course.id, r.userId))}>Approve</button>
                    <button type="button" className="rd-mini" onClick={() => { const reason = window.prompt('Reason for rejecting (optional):', ''); if (reason !== null) run(() => coursesAdminApi.rejectEnrollment(course.id, r.userId, reason)); }}>Reject</button>
                  </>}
                  {(r.status === 'REJECTED' || r.status === 'REVOKED' || r.expired) && (
                    <button type="button" className="rd-mini rd-go" onClick={() => run(() => coursesAdminApi.approveEnrollment(course.id, r.userId))}>{r.expired ? 'Renew' : 'Activate'}</button>
                  )}
                  {r.status === 'ACTIVE' && !r.expired && <button type="button" className="rd-mini" onClick={() => window.confirm(`Withdraw ${r.name}'s access?`) && run(() => coursesAdminApi.revokeEnrollment(course.id, r.userId))}>Revoke</button>}
                  <IconBtn icon="trash" label={`Remove ${r.name}`} danger onClick={() => window.confirm(`Remove ${r.name} from this course entirely?`) && run(() => coursesAdminApi.unenroll(course.id, r.userId))} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Validity length + the two ways a learner can switch the course on by themselves (payment, task). Free assignment is always available. */
function Activation({ course, onSaved, fail, ok }) {
  const [f, setF] = useState(() => ({
    unit: course.validityUnit || 'LIFETIME', value: String(course.validityValue || 1),
    allowPayment: Boolean(course.allowPayment), price: String(course.priceInr || ''),
    allowTask: Boolean(course.allowTask), taskTitle: course.taskTitle || '', taskDescription: course.taskDescription || '',
  }));
  const [busy, setBusy] = useState(false);
  const lifetime = f.unit === 'LIFETIME';
  const preview = lifetime ? 'Lifetime: never expires.' : `Each activation lasts ${f.value || '?'} ${VALIDITY_UNIT_LABEL[f.unit].toLowerCase()} from the moment it is activated.`;

  async function save(e) {
    e.preventDefault();
    const value = Number(f.value);
    const price = f.price === '' ? 0 : Number(f.price);
    if (!lifetime && (!Number.isInteger(value) || value < 1)) return fail('Validity must be a whole number of 1 or more.');
    if (f.allowPayment && (!Number.isInteger(price) || price < 1)) return fail('Enter a whole-rupee price of at least 1 to sell this course online.');
    if (!Number.isInteger(price) || price < 0) return fail('The price must be a whole number of rupees.');
    if (f.allowTask && !f.taskTitle.trim()) return fail('Give the task a title so learners know what to do.');
    setBusy(true);
    try {
      await coursesAdminApi.update(course.id, {
        validityUnit: f.unit, ...(lifetime ? {} : { validityValue: value }),
        allowPayment: f.allowPayment, priceInr: price,
        allowTask: f.allowTask, taskTitle: f.taskTitle.trim(), taskDescription: f.taskDescription.trim(),
      });
      await onSaved(); ok('Activation settings saved.');
    } catch (x) { fail(x.message); } finally { setBusy(false); }
  }

  return (
    <form className="cs-box rd-form ca-card" onSubmit={save} style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
      <h2 className="rd-h2">Validity &amp; activation</h2>
      <p className="ca-hint">{course.access === 'PUBLIC'
        ? 'This course is open to every logged-in member, so none of this applies yet. Switch “Who can watch” to 1% Club or Enrolled students to use it.'
        : 'Learners see the validity on the course. It is counted from the day their access is activated. Changing it affects future activations only; people already active keep their end date.'}</p>

      <div className="ca-grid2">
        <label className="rd-field"><span>Validity</span>
          <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            {Object.entries(VALIDITY_UNIT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {!lifetime && (
          <label className="rd-field"><span>How many {VALIDITY_UNIT_LABEL[f.unit].toLowerCase()}</span>
            <input type="number" min={1} step={1} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required />
          </label>
        )}
      </div>
      <small className="ca-hint">{preview}</small>

      <label className="ca-check">
        <input type="checkbox" checked={f.allowPayment} onChange={(e) => setF({ ...f, allowPayment: e.target.checked })} />
        <span><b>Activate by payment (Razorpay)</b><small>Learners can buy the course online. The amount is set by you; Razorpay keys are read from the server settings.</small></span>
      </label>
      {f.allowPayment && (
        <label className="rd-field"><span>Price (₹, whole rupees)</span>
          <input type="number" min={1} step={1} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="e.g. 4999" required />
        </label>
      )}

      <label className="ca-check">
        <input type="checkbox" checked={f.allowTask} onChange={(e) => setF({ ...f, allowTask: e.target.checked })} />
        <span><b>Activate by completing a task</b><small>Learners hand in the task; access starts when you approve it under Students &amp; access.</small></span>
      </label>
      {f.allowTask && (
        <>
          <label className="rd-field"><span>Task title</span><input value={f.taskTitle} onChange={(e) => setF({ ...f, taskTitle: e.target.value })} maxLength={160} required /></label>
          <label className="rd-field"><span>What the learner must do</span><textarea rows={4} value={f.taskDescription} onChange={(e) => setF({ ...f, taskDescription: e.target.value })} maxLength={3000} /></label>
        </>
      )}
      <p className="ca-hint">Assigning a student for free is always available below, with or without these two options.</p>
      <button className="btn btn-lime cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save activation settings'} <span className="ar">→</span></button>
    </form>
  );
}

// ---------------------------------------------------------------- page
function Editor({ id }) {
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [missing, setMissing] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const c = await coursesAdminApi.get(id);
      setCourse(c);
      setForm((f) => f || { title: c.title, slug: c.slug, summary: c.summary, description: c.description, access: c.access, icon: iconValueOf(c) });
    } catch (e) { if (e.status === 404) setMissing(true); else setError(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (missing) return <section className="rd-section rd-narrow"><Link className="cs-back" to="/admin/courses"><Icon name="arrowLeft" size={16} />All courses</Link><div className="rd-card"><p>That course no longer exists.</p></div></section>;
  if (!course || !form) return <section className="rd-section"><p role="status">{error || 'Loading…'}</p></section>;

  const fail = (m) => { setMsg(''); setError(m); };
  const ok = (m) => { setError(''); setMsg(m); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const total = course.modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.durationSec, 0), 0);
  const noVideo = course.modules.reduce((n, m) => n + m.lessons.filter((l) => !l.vimeoId).length, 0);

  async function saveDetails(e) {
    e.preventDefault(); setBusy(true); setError(''); setMsg('');
    try {
      const updated = await coursesAdminApi.update(id, { title: form.title.trim(), slug: form.slug.trim(), summary: form.summary.trim(), description: form.description.trim(), access: form.access, ...iconPayload(form.icon) });
      setForm((f) => ({ ...f, slug: updated.slug }));
      await load(); ok('Details saved.');
    } catch (x) { fail(x.message); } finally { setBusy(false); }
  }
  async function togglePublish() {
    setBusy(true);
    try { await coursesAdminApi.update(id, { published: !course.published }); await load(); ok(course.published ? 'Unpublished. Students can no longer see it.' : 'Published. Students can now see it.'); } catch (x) { fail(x.message); } finally { setBusy(false); }
  }
  async function uploadThumb() {
    const file = fileRef.current?.files?.[0];
    if (!file) return fail('Choose an image first.');
    const fd = new FormData(); fd.append('image', file);
    setBusy(true);
    try { await coursesAdminApi.setThumbnail(id, fd); fileRef.current.value = ''; await load(); ok('Thumbnail updated.'); } catch (x) { fail(x.message); } finally { setBusy(false); }
  }
  async function removeThumb() {
    setBusy(true);
    try { await coursesAdminApi.clearThumbnail(id); await load(); ok('Thumbnail removed.'); } catch (x) { fail(x.message); } finally { setBusy(false); }
  }
  async function deleteCourse() {
    const typed = typeToConfirm(`Remove the course "${course.title}" from the site? Its modules, lessons and records are kept. (A course with learners or payments cannot be removed: unpublish it instead.)`, course.title);
    if (!typed) return;
    try { await coursesAdminApi.remove(id, typed); navigate('/admin/courses'); } catch (x) { fail(x.message); }
  }
  async function addModule(e) {
    e.preventDefault();
    try { await coursesAdminApi.addModule(id, { title: newModule.trim() }); setNewModule(''); await load(); } catch (x) { fail(x.message); }
  }
  async function moveModule(i, d) {
    const ids = course.modules.map((m) => m.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try { await coursesAdminApi.reorderModules(id, ids); await load(); } catch (x) { fail(x.message); }
  }

  return (
    <section className="rd-section">
      <Link className="cs-back" to="/admin/courses"><Icon name="arrowLeft" size={16} />All courses</Link>
      <div className="ca-top">
        <div>
          <span className="label">Admin · Course</span>
          <h1 className="h-l rd-title" style={{ marginBottom: 8 }}>{course.title}</h1>
          <div className="cs-meta">
            <span className={`cs-chip ${course.published ? 'acc' : 'draft'}`}>{course.published ? 'Published' : 'Draft'}</span>
            <span><Icon name="layers" size={15} />{course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>
            <span><Icon name="video" size={15} />{lessonCount} lesson{lessonCount === 1 ? '' : 's'}</span>
            {total > 0 && <span><Icon name="clock" size={15} />{fmtDuration(total)}</span>}
            {noVideo > 0 && <span className="cs-chip warn"><Icon name="alert" size={12} />{noVideo} without video</span>}
          </div>
        </div>
        <div className="rd-actions">
          <Link className="btn btn-dark cs-btn" to={`/courses/${course.slug}`}>View as student</Link>
          <button type="button" className={`btn cs-btn ${course.published ? 'btn-dark' : 'btn-lime'}`} onClick={togglePublish} disabled={busy}>{course.published ? 'Unpublish' : 'Publish course'}</button>
        </div>
      </div>
      {error && <p className="rd-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      {msg && <p className="rd-ok" role="status" style={{ marginTop: 12 }}>{msg}</p>}

      <div className="ca-edit">
        <div>
          <form className="cs-box rd-form ca-card" onSubmit={saveDetails} style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
            <h2 className="rd-h2">Course details</h2>
            <label className="rd-field"><span>Title</span><input value={form.title} onChange={set('title')} required maxLength={160} /></label>
            <label className="rd-field"><span>Web address</span><input value={form.slug} onChange={set('slug')} required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase letters, numbers and dashes" />
              <small>/courses/{form.slug || '…'}</small></label>
            <label className="rd-field"><span>Short summary</span><input value={form.summary} onChange={set('summary')} maxLength={400} /><small>Shown on the course card.</small></label>
            <label className="rd-field"><span>About this course</span><textarea rows={6} value={form.description} onChange={set('description')} maxLength={6000} /></label>
            <label className="rd-field"><span>Who can watch</span>
              <select value={form.access} onChange={set('access')}>{Object.entries(ACCESS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <small>{ACCESS_HELP[form.access]} Lessons marked “Free preview” are always open to everyone.</small>
            </label>
            <CourseIconPicker value={form.icon} courseId={course.id} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />
            <button className="btn btn-lime cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'} <span className="ar">→</span></button>
          </form>

          <div className="cs-box rd-form ca-card" style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
            <h2 className="rd-h2">Thumbnail</h2>
            <div className="ca-thumb-row">
              <CourseThumb course={course} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 200 }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} aria-label="Thumbnail image" />
                <span className="ca-hint">JPG, PNG or WEBP, up to 3MB. Landscape (16:10) works best.</span>
                <div className="rd-actions">
                  <button type="button" className="rd-mini rd-go" onClick={uploadThumb} disabled={busy}>Upload</button>
                  {course.thumbnail && <button type="button" className="rd-mini" onClick={removeThumb} disabled={busy}>Remove</button>}
                </div>
              </div>
            </div>
          </div>

          <Activation course={course} onSaved={load} fail={fail} ok={ok} />

          <Enrollments course={course} />

          <div className="cs-box rd-form ca-card" style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
            <h2 className="rd-h2">Delete course</h2>
            <p className="ca-hint">Removes the course, its modules and lessons, and every student's progress. This cannot be undone.</p>
            <div><button type="button" className="rd-mini rd-danger" onClick={deleteCourse}>Delete this course</button></div>
          </div>
        </div>

        <div>
          <div className="cs-box rd-form ca-card" style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
            <h2 className="rd-h2">Curriculum</h2>
            <p className="ca-hint">Use the arrows to reorder. Only the Vimeo video ID is stored. Set the video on Vimeo to “Unlisted” or limit it to your domain so it cannot be shared outside this site.</p>
            <div className="ca-mods">
              {course.modules.length === 0 && <p className="ca-empty" style={{ padding: 0 }}>No modules yet. Add the first one below.</p>}
              {course.modules.map((m, i) => <ModuleCard key={m.id} mod={m} index={i} count={course.modules.length} onMove={moveModule} reload={load} fail={fail} />)}
            </div>
            <form className="ca-add" onSubmit={addModule}>
              <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="New module title" maxLength={160} aria-label="New module title" />
              <button className="btn btn-lime cs-btn" type="submit" disabled={!newModule.trim()}>Add module</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminCourseEdit() {
  const { id } = useParams();
  return <AdminGate title="Course"><Editor key={id} id={id} /></AdminGate>;
}
