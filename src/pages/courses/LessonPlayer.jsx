import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion } from 'motion/react';
import { coursesApi } from '../../services/coursesApi.js';
import { fmtClock } from '../../lib/courses.js';
import { ORG, SITE_URL, assetOf, isoDuration, visualOf } from '../../lib/courseTheme.js';
import { crumbs, useSeo } from '../../lib/seo.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/courses/Icons.jsx';
import VimeoPlayer from '../../components/courses/VimeoPlayer.jsx';
import AssetBackdrop from '../../components/courses/fx/AssetBackdrop.jsx';
import LazyScene from '../../components/courses/fx/LazyScene.jsx';
import ProgressRing from '../../components/courses/fx/ProgressRing.jsx';
import { StateCard, useLoad } from './shared.jsx';
import { Crumbs, Shell } from './ui.jsx';

const SAVE_EVERY_MS = 10000;
const NEAR_END = 0.9;
const EASE = [0.16, 1, 0.3, 1];

// What the video area shows when the lesson cannot be played.
function Gate({ icon, title, children, action }) {
  return (
    <div className="cx-gate" role="status">
      <span className="cx-gate-ic"><Icon name={icon} size={26} /></span>
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
    return <Gate icon="lock" title="This lesson is for enrolled students" action={<Link className="btn btn-lime cs-btn" to="/contact">Ask about enrolment <span className="ar">→</span></Link>}>Free preview lessons in this course are open to everyone.</Gate>;
  }
  return <Gate icon="alert" title="This lesson is not available" />;
}

// `playPct` is a motion value (0-1) written while the video plays; the side panels read it without re-rendering this tree.
function Stage({ data, user, onCompletedChange, playPct }) {
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

  // Start the ring where the student left off (or full when already completed).
  useEffect(() => {
    const d = lesson.durationSec;
    playPct.set(progress.completed ? 1 : d ? Math.min(1, progress.positionSec / d) : 0);
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTime = ({ seconds, duration, percent }) => {
    st.current.pos = seconds;
    if (duration) st.current.dur = duration;
    playPct.set(Math.max(0, Math.min(1, percent || 0)));
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
      <div className="cx-stage">
        <div className="cx-frame">
          {playable && !playerError && (
            <VimeoPlayer vimeoId={lesson.vimeoId} hash={lesson.vimeoHash} startAt={completed ? 0 : progress.positionSec}
              onReady={() => setReady(true)} onTime={onTime} onPause={() => save()} onEnded={() => { st.current.pos = st.current.dur || st.current.pos; playPct.set(1); save({ completed: true }); }}
              onError={(m) => setPlayerError(m)} />
          )}
          {playable && !playerError && !ready && <div className="cx-gate is-loading" role="status"><span className="cx-pulse" />Loading video…</div>}
          {playerError && <Gate icon="alert" title="This video could not be played" action={<button type="button" className="btn btn-lime cs-btn" onClick={() => { setPlayerError(''); setReady(false); }}>Try again</button>}>{playerError}</Gate>}
          {!access.allowed && <AccessGate reason={access.reason} here={here} />}
          {access.allowed && !lesson.hasVideo && <Gate icon="clock" title="Video coming soon">This lesson does not have its video yet. Check back shortly.</Gate>}
        </div>
        <div className="cx-playbar" aria-hidden="true"><motion.b style={{ scaleX: playPct }} /></div>
      </div>

      <div className="cx-actions">
        {access.allowed && lesson.hasVideo && user && (
          <button type="button" className={`cx-pbtn${completed ? ' on' : ''}`} onClick={toggle} aria-pressed={completed}>
            <Icon name={completed ? 'checkCircle' : 'circle'} size={16} />{completed ? 'Completed' : 'Mark as complete'}
          </button>
        )}
        {access.allowed && lesson.hasVideo && !user && (
          <span className="cx-save"><Icon name="alert" size={15} />This is a free preview. <Link className="cx-link" to={`/login?next=${here}`}>Log in</Link> to save your progress.</span>
        )}
        {saveErr && <span className="cx-save err" role="status"><Icon name="alert" size={15} />Progress could not be saved. We will retry.</span>}
      </div>
    </>
  );
}

function Outline({ data, done }) {
  const total = data.outline.reduce((n, m) => n + m.lessons.length, 0);
  const finished = data.outline.reduce((n, m) => n + m.lessons.filter((l) => done.has(l.id)).length, 0);
  const pct = total ? Math.round((finished / total) * 100) : 0;
  return (
    <aside className="cx-glass cx-outline" aria-label="Course content">
      <h2>Course content</h2>
      <div className="cx-outline-meta">
        <span>{finished} of {total} lessons complete</span>
        <div className="cx-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress"><motion.b initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ duration: 0.8, ease: EASE }} /></div>
      </div>
      {data.outline.map((m, i) => (
        <div className="cx-o-mod" key={m.id}>
          <h3>Module {i + 1} · {m.title}</h3>
          <ul className="cx-o-list">
            {m.lessons.map((l) => {
              const isDone = done.has(l.id);
              const cur = l.id === data.lesson.id;
              const open = !l.locked && l.hasVideo;
              const cls = `cx-o-item${cur ? ' cur' : ''}${isDone ? ' done' : ''}${l.locked ? ' locked' : ''}${!l.hasVideo && !l.locked ? ' soon' : ''}`;
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

// Personal notes, kept only in this browser (no backend involved), one note per lesson.
function Notes({ lessonId }) {
  const key = `tb-note:${lessonId}`;
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setText(localStorage.getItem(key) || ''); } catch { setText(''); }
    setSaved(false);
  }, [key]);
  useEffect(() => {
    const t = setTimeout(() => {
      try { text ? localStorage.setItem(key, text) : localStorage.removeItem(key); setSaved(Boolean(text)); } catch { /* storage unavailable: the note simply is not kept */ }
    }, 500);
    return () => clearTimeout(t);
  }, [text, key]);
  return (
    <section className="cx-glass cx-notes" aria-labelledby="cx-notes-h">
      <h2 id="cx-notes-h" className="cx-panel-h"><Icon name="edit" size={15} />Notes <small>{saved ? 'Saved on this device' : 'Private to this device'}</small></h2>
      <label className="cx-sr" htmlFor="cx-note">Your notes for this lesson</label>
      <textarea id="cx-note" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} rows={5} placeholder="Levels, setups, things to review…" />
    </section>
  );
}

function ProgressPanel({ playPct, done, total, theme }) {
  const courseCount = done.size;
  const pct = total ? Math.round((courseCount / total) * 100) : 0;
  return (
    <section className="cx-glass cx-progress" aria-labelledby="cx-prog-h">
      <h2 id="cx-prog-h" className="cx-panel-h"><Icon name="layers" size={15} />Progress</h2>
      <div className="cx-prog-rings">
        <div><ProgressRing mv={playPct} size={96} label="This lesson watched" /><span>This lesson</span></div>
        <div><ProgressRing value={pct} size={96} label="Course complete" /><span>{courseCount}/{total} course</span></div>
      </div>
      <span className="cx-asset-pill">{theme.sym} · {theme.label}</span>
    </section>
  );
}

function NextCard({ target, slug }) {
  if (!target) return null;
  const open = !target.locked;
  const inner = (
    <>
      <span className="cx-next-k">Up next</span>
      <strong>{target.title}</strong>
      <span className="cx-next-go">{open ? 'Continue' : 'Locked'}<Icon name={open ? 'arrowRight' : 'lock'} size={15} /></span>
    </>
  );
  return open
    ? <Link className="cx-glass cx-next" to={`/courses/${slug}/lesson/${target.id}`}>{inner}</Link>
    : <div className="cx-glass cx-next is-locked" aria-disabled="true">{inner}</div>;
}

function NavBtn({ target, dir, slug }) {
  const icon = <Icon name={dir === 'prev' ? 'arrowLeft' : 'arrowRight'} size={16} />;
  const label = dir === 'prev' ? <>{icon}Previous</> : <>Next lesson{icon}</>;
  if (!target) return <span className="cx-pbtn" aria-disabled="true">{label}</span>;
  if (target.locked) return <span className="cx-pbtn" aria-disabled="true" title="Locked">{label}</span>;
  return <Link className="cx-pbtn" to={`/courses/${slug}/lesson/${target.id}`} title={target.title}>{label}</Link>;
}

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const calm = useReducedMotion();
  const playPct = useMotionValue(0);
  const { data: raw, error, loading, reload } = useLoad(() => coursesApi.lesson(lessonId), [lessonId]);
  const data = raw && raw.lesson.id === lessonId ? raw : null; // never show the previous lesson under a new URL
  const [done, setDone] = useState(() => new Set());
  const asset = assetOf(data?.course || {});
  const theme = visualOf(data?.course || {});

  useEffect(() => {
    if (data) setDone(new Set(data.outline.flatMap((m) => m.lessons.filter((l) => l.completed).map((l) => l.id))));
  }, [data]);
  const onCompletedChange = useCallback((id, isDone) => setDone((s) => { const n = new Set(s); if (isDone) n.add(id); else n.delete(id); return n; }), []);

  const ld = useMemo(() => {
    if (!data) return null;
    const { course, module: mod, lesson } = data;
    const crumb = crumbs([['Home', '/'], ['Courses', '/courses'], [course.title, `/courses/${course.slug}`], [lesson.title, `/courses/${course.slug}/lesson/${lesson.id}`]]);
    // Only free previews are described as public video; gated lessons are not advertised to crawlers.
    if (!lesson.isFreePreview || !lesson.vimeoId) return crumb;
    return [crumb, {
      '@context': 'https://schema.org', '@type': 'VideoObject', name: lesson.title,
      description: lesson.description || `${lesson.title}, a lesson in ${mod.title} from the ${course.title} trading course.`,
      embedUrl: `https://player.vimeo.com/video/${lesson.vimeoId}`, duration: lesson.durationSec ? isoDuration(lesson.durationSec) : undefined,
      isAccessibleForFree: true, inLanguage: 'en', publisher: ORG, url: `${SITE_URL}/courses/${course.slug}/lesson/${lesson.id}`,
      thumbnailUrl: course.thumbnail ? coursesApi.thumbnailUrl(course.thumbnail) : undefined,
    }];
  }, [data]);

  useSeo(data ? {
    title: `${data.lesson.title} | ${data.course.title} | TradeBit India`,
    description: (data.lesson.description || `Watch "${data.lesson.title}" from ${data.module.title} in the ${data.course.title} ${asset.label === 'Trading' ? 'trading' : `${asset.label} trading`} course.`).replace(/\s+/g, ' ').slice(0, 158),
    path: `/courses/${data.course.slug}/lesson/${data.lesson.id}`, noindex: !data.course.published, jsonLd: ld,
  } : { title: 'Lesson | TradeBit India', description: 'Trading course lesson by TradeBit India.', path: `/courses/lesson/${lessonId}`, noindex: true });

  if (error) {
    const missing = error.status === 404;
    return (
      <Shell theme={theme}>
        <div className="cx-wrap cx-narrow">
          <Link className="cx-back" to="/courses"><Icon name="arrowLeft" size={16} />All courses</Link>
          <StateCard title={missing ? 'Lesson not found' : 'We could not load this lesson'} action={missing ? <Link className="btn btn-lime cs-btn" to="/courses">Browse courses</Link> : <button type="button" className="btn btn-lime cs-btn" onClick={reload}>Try again</button>}>
            {missing ? 'It may have been removed or unpublished.' : error.message}
          </StateCard>
        </div>
      </Shell>
    );
  }
  if (!data) return <Shell theme={theme}><div className="cx-wrap"><p role="status" className="cx-status">{loading ? 'Loading lesson…' : ''}</p></div></Shell>;

  const { course, module: mod, lesson, prev, next } = data;
  const moduleNo = data.outline.findIndex((m) => m.id === mod.id) + 1;
  const total = data.outline.reduce((n, m) => n + m.lessons.length, 0);
  const panel = (i) => ({ initial: calm ? false : { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.15 + i * 0.1, duration: 0.6, ease: EASE } });

  return (
    <Shell theme={theme} className="cx-lesson-page">
      <div className="cx-ambient" aria-hidden="true">
        <AssetBackdrop seed={theme.key} line={false} className="cx-bd-dim" />
        <LazyScene color={theme.color} orb={false} count={380} className="cx-ambient-3d" />
      </div>
      <div className="cx-wrap cx-wrap-wide">
        <Crumbs items={[['Courses', '/courses'], [course.title, `/courses/${course.slug}`], [lesson.title]]} />
        {!course.published && <div className="cx-notice" role="status"><Icon name="alert" size={18} className="cs-ic" /><span>This course is a draft. Only admins can see it.</span></div>}

        <div className="cx-learn">
          <div className="cx-learn-main">
            <Stage key={lesson.id} data={data} user={user} onCompletedChange={onCompletedChange} playPct={playPct} />
            <article className="cx-lesson-info">
              <span className="cx-crumb">Module {moduleNo} · {mod.title}</span>
              <h1 className="cx-lesson-title">{lesson.title}</h1>
              {lesson.isFreePreview && <div><span className="cx-chip gain">Free preview</span></div>}
              {lesson.description && <p className="cx-lesson-desc">{lesson.description}</p>}
              <div className="cx-nav"><NavBtn target={prev} dir="prev" slug={course.slug} /><NavBtn target={next} dir="next" slug={course.slug} /></div>
            </article>
          </div>

          <div className="cx-side">
            <motion.div key={lesson.id} className="cx-side-in" {...panel(0)}>
              <ProgressPanel playPct={playPct} done={done} total={total} theme={asset} />
              <NextCard target={next} slug={course.slug} />
            </motion.div>
            <motion.div className="cx-side-in" {...panel(1)}><Notes lessonId={lesson.id} /></motion.div>
            <motion.div {...panel(2)}><Outline data={data} done={done} /></motion.div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
