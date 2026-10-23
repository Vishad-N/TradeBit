import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { coursesAdminApi } from '../../services/coursesApi.js';
import { ACCESS_HELP, ACCESS_LABEL, fmtClock, fmtDuration, parseClock, parseVimeo } from '../../lib/courses.js';
import Icon from '../../components/courses/Icons.jsx';
import { CourseThumb } from '../courses/shared.jsx';
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
          <IconBtn icon="trash" label="Delete module" danger onClick={() => window.confirm(`Delete module "${mod.title}" and its ${mod.lessons.length} lesson(s)? Student progress on them is removed too.`) && run(() => coursesAdminApi.removeModule(mod.id))} />
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
                <IconBtn icon="trash" label="Delete lesson" danger onClick={() => window.confirm(`Delete lesson "${l.title}"?`) && run(() => coursesAdminApi.removeLesson(l.id))} />
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

function Enrollments({ course }) {
  const [rows, setRows] = useState(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { coursesAdminApi.enrollments(course.id).then(setRows).catch((e) => setErr(e.message)); }, [course.id]);

  async function add(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { setRows(await coursesAdminApi.enroll(course.id, email.trim())); setEmail(''); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="cs-box rd-form ca-card" style={{ padding: 'clamp(18px,2.4vw,28px)', maxWidth: 'none' }}>
      <h2 className="rd-h2">Enrolled students</h2>
      <p className="ca-hint">{course.access === 'PUBLIC' ? 'This course is open to every logged-in user, so enrolment is not needed. It matters if you switch it to 1% Club or Enrolled students.' : 'Students you add here can watch every lesson, whatever their other access.'}</p>
      <form className="ca-add" onSubmit={add}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" required maxLength={200} aria-label="Student email" />
        <button className="btn btn-dark cs-btn" type="submit" disabled={busy || !email.trim()}>{busy ? 'Adding…' : 'Enrol'}</button>
      </form>
      {err && <p className="rd-error" role="alert">{err}</p>}
      {!rows ? <p>Loading…</p> : rows.length === 0 ? <p className="ca-hint">No one enrolled yet.</p> : (
        <ul className="ca-enr">
          {rows.map((r) => (
            <li key={r.userId}>
              <div className="t"><strong style={{ fontWeight: 500 }}>{r.name}</strong><small>{r.email}</small></div>
              <IconBtn icon="trash" label={`Remove ${r.name}`} danger onClick={async () => { try { setRows(await coursesAdminApi.unenroll(course.id, r.userId)); } catch (x) { setErr(x.message); } }} />
            </li>
          ))}
        </ul>
      )}
    </div>
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
      setForm((f) => f || { title: c.title, slug: c.slug, summary: c.summary, description: c.description, access: c.access });
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
      const updated = await coursesAdminApi.update(id, { title: form.title.trim(), slug: form.slug.trim(), summary: form.summary.trim(), description: form.description.trim(), access: form.access });
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
    if (!window.confirm(`Delete "${course.title}"? Its modules, lessons and every student's progress will be removed. This cannot be undone.`)) return;
    try { await coursesAdminApi.remove(id); navigate('/admin/courses'); } catch (x) { fail(x.message); }
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
