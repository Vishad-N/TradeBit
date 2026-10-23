import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { coursesApi } from '../../services/coursesApi.js';
import { fmtClock } from '../../lib/courses.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/courses/Icons.jsx';
import VimeoPlayer from '../../components/courses/VimeoPlayer.jsx';
import { StateCard, useLoad } from './shared.jsx';

const SAVE_EVERY_MS = 10000;
const NEAR_END = 0.9;

// What the video area shows when the lesson cannot be played.
function Gate({ icon, title, children, action }) {
  return (
    <div className="cs-gate" role="status">
      <span className="cs-gate-ic"><Icon name={icon} size={26} /></span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

function AccessGate({ reason, here }) {
  if (reason === 'LOGIN') {
    return <Gate icon="lock" title="Log in to watch this lesson" action={<Link className="btn btn-lime cs-btn" to={`/login?next=${here}`}>Log in <span className="ar">→</span></Link>}>Your progress is saved to your account, so you can pick up where you left off.</Gate>;
  }
  if (reason === 'CLUB') {
    return <Gate icon="lock" title="This lesson is for 1% Club members" action={<Link className="btn btn-lime cs-btn" to="/1-percent-club">Join the 1% Club <span className="ar">→</span></Link>}>Free preview lessons in this course are open to everyone.</Gate>;
  }
  if (reason === 'ENROLL') {
    return <Gate icon="lock" title="This lesson is for enrolled students" action={<Link className="btn btn-dark cs-btn" to="/contact">Ask about enrolment <span className="ar">→</span></Link>}>Free preview lessons in this course are open to everyone.</Gate>;
  }
  return <Gate icon="alert" title="This lesson is not available" />;
}

function Stage({ data, user, onCompletedChange }) {
  const { lesson, access, progress } = data;
  const here = encodeURIComponent(useLocation().pathname);
  const [ready, setReady] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [saveErr, setSaveErr] = useState(false);
  const [completed, setCompleted] = useState(progress.completed);
  const st = useRef({ pos: progress.positionSec, dur: lesson.durationSec, last: 0, completed: progress.completed, crossed: false });
  const canSave = Boolean(user) && access.allowed && lesson.hasVideo;
  const lessonId = lesson.id;

  const apply = useCallback((done) => {
    st.current.completed = done;
    setCompleted(done);
    onCompletedChange(lessonId, done);
  }, [lessonId, onCompletedChange]);

  const save = useCallback(async (extra, keepalive) => {
    if (!canSave) return;
    const body = { positionSec: Math.floor(st.current.pos), ...(st.current.dur ? { durationSec: Math.floor(st.current.dur) } : {}), ...extra };
    try {
      const r = await coursesApi.saveProgress(lessonId, body, keepalive ? { keepalive: true } : undefined);
      setSaveErr(false);
      if (r.completed !== st.current.completed) apply(r.completed);
    } catch {
      setSaveErr(true); // the next tick retries; the student can keep watching
    }
  }, [canSave, lessonId, apply]);

  // Save when the tab is hidden / closed or the student leaves the lesson.
  useEffect(() => {
    if (!canSave) return undefined;
    const flush = () => { if (st.current.pos > 0) save(undefined, true); };
    const onVis = () => { if (document.hidden) flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [canSave, save]);

  const onTime = ({ seconds, duration, percent }) => {
    st.current.pos = seconds;
    if (duration) st.current.dur = duration;
    if (!canSave) return;
    const now = Date.now();
    if (!st.current.crossed && !st.current.completed && percent >= NEAR_END) { st.current.crossed = true; st.current.last = now; save(); return; }
    if (now - st.current.last >= SAVE_EVERY_MS && seconds > 0) { st.current.last = now; save(); }
  };

  const toggle = async () => {
    const next = !completed;
    apply(next);
    try {
      const r = await coursesApi.saveProgress(lessonId, { completed: next, positionSec: Math.floor(st.current.pos) });
      setSaveErr(false);
      if (r.completed !== next) apply(r.completed);
    } catch {
      apply(!next);
      setSaveErr(true);
    }
  };

  const playable = access.allowed && lesson.hasVideo && lesson.vimeoId;
  return (
    <>
      <div className="cs-stage">
        <div className="cs-frame">
          {playable && !playerError && (
            <VimeoPlayer vimeoId={lesson.vimeoId} hash={lesson.vimeoHash} startAt={completed ? 0 : progress.positionSec}
              onReady={() => setReady(true)} onTime={onTime} onPause={() => save()} onEnded={() => { st.current.pos = st.current.dur || st.current.pos; save({ completed: true }); }}
              onError={(m) => setPlayerError(m)} />
          )}
          {playable && !playerError && !ready && <div className="cs-gate is-loading" role="status">Loading video…</div>}
          {playerError && <Gate icon="alert" title="This video could not be played" action={<button type="button" className="btn btn-lime cs-btn" onClick={() => { setPlayerError(''); setReady(false); }}>Try again</button>}>{playerError}</Gate>}
          {!access.allowed && <AccessGate reason={access.reason} here={here} />}
          {access.allowed && !lesson.hasVideo && <Gate icon="clock" title="Video coming soon">This lesson does not have its video yet. Check back shortly.</Gate>}
        </div>
      </div>

      <div className="cs-actions" style={{ marginTop: 16 }}>
        {access.allowed && lesson.hasVideo && user && (
          <button type="button" className={`cs-pbtn${completed ? ' on' : ''}`} onClick={toggle} aria-pressed={completed}>
            <Icon name={completed ? 'checkCircle' : 'circle'} size={16} />{completed ? 'Completed' : 'Mark as complete'}
          </button>
        )}
        {access.allowed && lesson.hasVideo && !user && (
          <span className="cs-save"><Icon name="alert" size={15} />This is a free preview. <Link className="rd-link" style={{ margin: 0 }} to={`/login?next=${here}`}>Log in</Link> to save your progress.</span>
        )}
        {saveErr && <span className="cs-save err" role="status"><Icon name="alert" size={15} />Progress could not be saved. We will retry.</span>}
      </div>
    </>
  );
}

function Outline({ data, done }) {
  const total = data.outline.reduce((n, m) => n + m.lessons.length, 0);
  const finished = data.outline.reduce((n, m) => n + m.lessons.filter((l) => done.has(l.id)).length, 0);
  const pct = total ? Math.round((finished / total) * 100) : 0;
  return (
    <aside className="cs-box cs-outline" aria-label="Course content">
      <h2>Course content</h2>
      <div className="cs-outline-meta">
        <span>{finished} of {total} lessons complete</span>
        <div className="cs-bar acc" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${pct}%` }} /></div>
      </div>
      {data.outline.map((m, i) => (
        <div className="cs-o-mod" key={m.id}>
          <h3>Module {i + 1} · {m.title}</h3>
          <ul className="cs-o-list">
            {m.lessons.map((l) => {
              const isDone = done.has(l.id);
              const cur = l.id === data.lesson.id;
              const open = !l.locked && l.hasVideo;
              const cls = `cs-o-item${cur ? ' cur' : ''}${isDone ? ' done' : ''}${l.locked ? ' locked' : ''}${!l.hasVideo && !l.locked ? ' soon' : ''}`;
              const icon = isDone ? 'checkCircle' : l.locked ? 'lock' : l.hasVideo ? 'play' : 'clock';
              const inner = <><Icon name={icon} size={16} /><span className="t">{l.title}</span>{l.durationSec > 0 && <small>{fmtClock(l.durationSec)}</small>}</>;
              return <li key={l.id}>{open ? <Link className={cls} to={`/courses/${data.course.slug}/lesson/${l.id}`} aria-current={cur ? 'true' : undefined}>{inner}</Link> : <div className={cls} aria-disabled="true">{inner}</div>}</li>;
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const { data: raw, error, loading, reload } = useLoad(() => coursesApi.lesson(lessonId), [lessonId]);
  const data = raw && raw.lesson.id === lessonId ? raw : null; // never show the previous lesson under a new URL
  const [done, setDone] = useState(() => new Set());

  useEffect(() => {
    if (data) setDone(new Set(data.outline.flatMap((m) => m.lessons.filter((l) => l.completed).map((l) => l.id))));
  }, [data]);
  const onCompletedChange = useCallback((id, isDone) => setDone((s) => { const n = new Set(s); if (isDone) n.add(id); else n.delete(id); return n; }), []);

  if (error) {
    const missing = error.status === 404;
    return (
      <section className="rd-section rd-narrow">
        <Link className="cs-back" to="/courses"><Icon name="arrowLeft" size={16} />All courses</Link>
        <StateCard title={missing ? 'Lesson not found' : 'We could not load this lesson'} action={missing ? <Link className="btn btn-dark cs-btn" to="/courses">Browse courses</Link> : <button type="button" className="btn btn-dark cs-btn" onClick={reload}>Try again</button>}>
          {missing ? 'It may have been removed or unpublished.' : error.message}
        </StateCard>
      </section>
    );
  }
  if (!data) return <section className="rd-section"><p role="status">{loading ? 'Loading lesson…' : ''}</p></section>;

  const { course, module: mod, lesson, prev, next } = data;
  const moduleNo = data.outline.findIndex((m) => m.id === mod.id) + 1;
  const NavBtn = ({ target, dir }) => {
    const icon = <Icon name={dir === 'prev' ? 'arrowLeft' : 'arrowRight'} size={16} />;
    const label = dir === 'prev' ? <>{icon}Previous</> : <>Next lesson{icon}</>;
    if (!target) return <span className="cs-pbtn" aria-disabled="true">{label}</span>;
    if (target.locked) return <span className="cs-pbtn" aria-disabled="true" title="Locked">{label}</span>;
    return <Link className="cs-pbtn" to={`/courses/${course.slug}/lesson/${target.id}`} title={target.title}>{label}</Link>;
  };

  return (
    <section className="rd-section">
      <Link className="cs-back" to={`/courses/${course.slug}`}><Icon name="arrowLeft" size={16} />{course.title}</Link>
      {!course.published && <div className="cs-notice" role="status" style={{ marginTop: 12 }}><Icon name="alert" size={18} className="cs-ic" /><span>This course is a draft. Only admins can see it.</span></div>}

      <div className="cs-learn">
        <div>
          <Stage key={lesson.id} data={data} user={user} onCompletedChange={onCompletedChange} />
          <div className="cs-lesson-info">
            <span className="cs-crumb">Module {moduleNo} · {mod.title}</span>
            <h1 className="cs-lesson-title">{lesson.title}</h1>
            {lesson.isFreePreview && <div><span className="cs-chip acc">Free preview</span></div>}
            {lesson.description && <p className="cs-lesson-desc">{lesson.description}</p>}
            <div className="cs-nav"><NavBtn target={prev} dir="prev" /><NavBtn target={next} dir="next" /></div>
          </div>
        </div>
        <Outline data={data} done={done} />
      </div>
    </section>
  );
}
