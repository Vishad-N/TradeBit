import { Link, useLocation, useParams } from 'react-router-dom';
import { coursesApi } from '../../services/coursesApi.js';
import { fmtClock, fmtDuration } from '../../lib/courses.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/courses/Icons.jsx';
import { AccessChip, CourseThumb, StateCard, useLoad } from './shared.jsx';

// What to tell a viewer who cannot open the course's full content.
function LockNote({ course }) {
  const here = encodeURIComponent(useLocation().pathname);
  if (course.lockReason === 'LOGIN') {
    return (
      <>
        <p className="cs-lock-note"><Icon name="lock" size={18} className="cs-ic" /><span>Log in to start this course and save your progress.</span></p>
        <Link className="btn btn-lime cs-btn" to={`/login?next=${here}`}>Log in to continue <span className="ar">→</span></Link>
      </>
    );
  }
  if (course.lockReason === 'CLUB') {
    return (
      <>
        <p className="cs-lock-note"><Icon name="lock" size={18} className="cs-ic" /><span>This course is for 1% Club members. Free previews are open to everyone.</span></p>
        <Link className="btn btn-lime cs-btn" to="/1-percent-club">Join the 1% Club <span className="ar">→</span></Link>
      </>
    );
  }
  return (
    <>
      <p className="cs-lock-note"><Icon name="lock" size={18} className="cs-ic" /><span>This course is for enrolled students. Free previews are open to everyone.</span></p>
      <Link className="btn btn-dark cs-btn" to="/contact">Ask about enrolment <span className="ar">→</span></Link>
    </>
  );
}

function LessonRow({ course, lesson }) {
  const open = !lesson.locked && lesson.hasVideo;
  const state = lesson.completed ? 'done' : lesson.locked ? 'locked' : !lesson.hasVideo ? 'soon' : '';
  const icon = lesson.completed ? 'check' : lesson.locked ? 'lock' : lesson.hasVideo ? 'play' : 'clock';
  const body = (
    <>
      <span className="cs-les-ic"><Icon name={icon} size={16} /></span>
      <span className="cs-les-t">
        <strong>{lesson.title}</strong>
        {lesson.description && <small>{lesson.description}</small>}
      </span>
      <span className="cs-les-r">
        {lesson.isFreePreview && <span className="cs-chip acc">Free preview</span>}
        {!lesson.hasVideo && !lesson.locked && <span className="cs-chip">Coming soon</span>}
        {lesson.durationSec > 0 && <span className="dur">{fmtClock(lesson.durationSec)}</span>}
      </span>
    </>
  );
  return open
    ? <li><Link className={`cs-lesson ${state}`} to={`/courses/${course.slug}/lesson/${lesson.id}`}>{body}</Link></li>
    : <li><div className={`cs-lesson ${state}`} aria-disabled="true">{body}</div></li>;
}

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: course, error, loading, reload } = useLoad(() => coursesApi.course(slug), [slug]);

  if (loading && !course) return <section className="rd-section"><p role="status">Loading course…</p></section>;
  if (error) {
    const missing = error.status === 404;
    return (
      <section className="rd-section rd-narrow">
        <Link className="cs-back" to="/courses"><Icon name="arrowLeft" size={16} />All courses</Link>
        <StateCard title={missing ? 'Course not found' : 'We could not load this course'} action={missing ? <Link className="btn btn-dark cs-btn" to="/courses">Browse courses</Link> : <button type="button" className="btn btn-dark cs-btn" onClick={reload}>Try again</button>}>
          {missing ? 'It may have been unpublished or the link is wrong.' : error.message}
        </StateCard>
      </section>
    );
  }

  const pct = course.lessonCount ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
  const dur = fmtDuration(course.durationSec);
  const previewLesson = course.modules.flatMap((m) => m.lessons).find((l) => l.isFreePreview && l.hasVideo && !l.locked);
  const resumeTo = course.resumeLessonId ? `/courses/${course.slug}/lesson/${course.resumeLessonId}` : null;

  return (
    <section className="rd-section">
      <Link className="cs-back" to="/courses"><Icon name="arrowLeft" size={16} />All courses</Link>
      {!course.published && <div className="cs-notice" role="status" style={{ marginTop: 12 }}><Icon name="alert" size={18} className="cs-ic" /><span>This course is a draft. Only admins can see it.</span></div>}

      <div className="cs-detail">
        <div className="cs-detail-main">
          <header style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><AccessChip access={course.access} /></div>
            <h1 className="cs-h1">{course.title}</h1>
            {course.summary && <p className="cs-sub">{course.summary}</p>}
            <div className="cs-meta">
              <span><Icon name="layers" size={15} />{course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>
              <span><Icon name="video" size={15} />{course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}</span>
              {dur && <span><Icon name="clock" size={15} />{dur}</span>}
            </div>
          </header>

          {course.description && <div><h2 className="cs-h2">About this course</h2><p className="cs-about">{course.description}</p></div>}

          <div>
            <h2 className="cs-h2">Curriculum</h2>
            {course.modules.length === 0 ? <StateCard title="Lessons are being added">Check back soon.</StateCard> : (
              <div className="cs-mods">
                {course.modules.map((m, i) => {
                  const done = m.lessons.filter((l) => l.completed).length;
                  return (
                    <section key={m.id} className="cs-box cs-mod" aria-label={m.title}>
                      <div className="cs-mod-head">
                        <span className="cs-mod-n">Module {i + 1}</span>
                        <h3 className="cs-mod-title">{m.title}</h3>
                        <span className="cs-mod-count">{user ? `${done}/${m.lessons.length} done` : `${m.lessons.length} lesson${m.lessons.length === 1 ? '' : 's'}`}</span>
                      </div>
                      {m.description && <p className="cs-mod-desc">{m.description}</p>}
                      {m.lessons.length === 0 ? <p className="cs-mod-desc">No lessons in this module yet.</p> : (
                        <ul className="cs-lessons">{m.lessons.map((l) => <LessonRow key={l.id} course={course} lesson={l} />)}</ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="cs-box cs-aside cs-detail-aside" aria-label="Course summary">
          <CourseThumb course={course} />
          <div className="cs-aside-body">
            {course.canAccess && course.lessonCount > 0 && (
              <div className="cs-prog">
                <span><strong>{pct}%</strong> complete · {course.completedCount} of {course.lessonCount} lessons</span>
                <div className="cs-bar acc" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${pct}%` }} /></div>
              </div>
            )}
            {course.canAccess ? (
              resumeTo
                ? <Link className="btn btn-lime cs-btn" to={resumeTo}>{course.resumeStarted ? 'Continue learning' : 'Start course'} <span className="ar">→</span></Link>
                : <p className="cs-lock-note"><Icon name="clock" size={18} className="cs-ic" /><span>Videos are being added. Check back soon.</span></p>
            ) : (
              <>
                <LockNote course={course} />
                {previewLesson && (
                  <Link className="cs-pbtn" to={`/courses/${course.slug}/lesson/${previewLesson.id}`} style={{ justifyContent: 'center' }}>
                    <Icon name="play" size={14} />Watch a free preview
                  </Link>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
