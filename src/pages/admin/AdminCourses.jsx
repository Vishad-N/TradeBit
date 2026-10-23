import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { coursesAdminApi } from '../../services/coursesApi.js';
import { ACCESS_HELP, ACCESS_LABEL, fmtDuration } from '../../lib/courses.js';
import Icon from '../../components/courses/Icons.jsx';
import { CourseThumb } from '../courses/shared.jsx';
import AdminGate from './AdminGate.jsx';

function CourseRow({ course, onChanged, onError }) {
  const [busy, setBusy] = useState(false);
  const dur = fmtDuration(course.durationSec);

  const togglePublish = async () => {
    setBusy(true);
    try { await coursesAdminApi.update(course.id, { published: !course.published }); onChanged(); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${course.title}"? Its modules, lessons and every student's progress will be removed. This cannot be undone.`)) return;
    setBusy(true);
    try { await coursesAdminApi.remove(course.id); onChanged(); } catch (e) { onError(e.message); setBusy(false); }
  };

  return (
    <li className="cs-box ca-row">
      <CourseThumb course={course} />
      <div className="ca-row-main">
        <div className="ca-row-title">
          <strong>{course.title}</strong>
          <span className={`cs-chip ${course.published ? 'acc' : 'draft'}`}>{course.published ? 'Published' : 'Draft'}</span>
          <span className="cs-chip">{ACCESS_LABEL[course.access]}</span>
          {course.missingVideo > 0 && <span className="cs-chip warn"><Icon name="alert" size={12} />{course.missingVideo} without video</span>}
        </div>
        <div className="cs-meta">
          <span><Icon name="layers" size={15} />{course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}</span>
          <span><Icon name="video" size={15} />{course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}</span>
          {dur && <span><Icon name="clock" size={15} />{dur}</span>}
          {course.access !== 'PUBLIC' && <span><Icon name="users" size={15} />{course.enrolled} enrolled</span>}
        </div>
      </div>
      <div className="ca-row-actions">
        <Link className="rd-mini rd-go" to={`/admin/courses/${course.id}`}>Edit</Link>
        <Link className="rd-mini" to={`/courses/${course.slug}`}>View</Link>
        <button type="button" className="rd-mini" onClick={togglePublish} disabled={busy}>{course.published ? 'Unpublish' : 'Publish'}</button>
        <button type="button" className="rd-mini rd-danger" onClick={remove} disabled={busy}>Delete</button>
      </div>
    </li>
  );
}

export default function AdminCourses() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', summary: '', access: 'PUBLIC' });

  const load = useCallback(async () => {
    try { setCourses(await coursesAdminApi.list()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const c = await coursesAdminApi.create({ title: form.title.trim(), summary: form.summary.trim(), access: form.access });
      navigate(`/admin/courses/${c.id}`);
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AdminGate title="Courses">
      <section className="rd-section">
        <span className="label">Admin</span>
        <h1 className="h-l rd-title">Courses</h1>
        <p className="ca-links">
          <Link className="rd-link" to="/admin/reading" style={{ margin: 0 }}>← Reading admin</Link>
          <Link className="rd-link" to="/courses" style={{ margin: 0 }}>View student catalog →</Link>
          <button type="button" className="rd-link rd-logout" onClick={logout} style={{ margin: 0 }}>Log out</button>
        </p>

        <form className="cs-box rd-form ca-card ca-new" onSubmit={create} style={{ padding: 'clamp(18px,2.4vw,28px)' }}>
          <label className="rd-field"><span>New course title</span><input value={form.title} onChange={set('title')} required maxLength={160} placeholder="e.g. Price Action Foundations" /></label>
          <label className="rd-field"><span>Short summary</span><input value={form.summary} onChange={set('summary')} maxLength={400} placeholder="One line shown on the course card" /></label>
          <label className="rd-field"><span>Who can watch</span>
            <select value={form.access} onChange={set('access')}>{Object.entries(ACCESS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <button className="btn btn-lime cs-btn" type="submit" disabled={busy || !form.title.trim()}>{busy ? 'Creating…' : 'Create course'} <span className="ar">→</span></button>
          <p className="ca-hint" style={{ gridColumn: '1 / -1' }}>{ACCESS_HELP[form.access]} The course starts as a draft; add modules and lessons, then publish it.</p>
        </form>
        {error && <p className="rd-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}

        <h2 className="rd-h2 rd-gap">All courses</h2>
        {!courses ? <p role="status">Loading…</p> : courses.length === 0 ? <p>No courses yet. Create the first one above.</p> : (
          <ul className="ca-list">{courses.map((c) => <CourseRow key={c.id} course={c} onChanged={load} onError={setError} />)}</ul>
        )}
      </section>
    </AdminGate>
  );
}
