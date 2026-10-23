import { Link } from 'react-router-dom';
import { coursesApi } from '../../services/coursesApi.js';
import { fmtDuration } from '../../lib/courses.js';
import Icon from '../../components/courses/Icons.jsx';
import { AccessChip, CourseThumb, StateCard, useLoad } from './shared.jsx';

// The course catalog. Public: anyone can browse; a logged-in student also sees their progress.
function CourseCard({ course }) {
  const pct = course.lessonCount ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
  const started = course.completedCount > 0;
  const dur = fmtDuration(course.durationSec);
  return (
    <li>
      <Link to={`/courses/${course.slug}`} className="cs-box cs-card" aria-label={`${course.title}. ${started ? `${pct}% complete` : 'Open course'}`}>
        <CourseThumb course={course} flags={<>{!course.published && <span className="cs-chip draft" style={{ background: 'var(--l)' }}>Draft</span>}</>} />
        <div className="cs-body">
          <AccessChipRow course={course} />
          <h2 className="cs-title">{course.title}</h2>
          {course.summary && <p className="cs-summary">{course.summary}</p>}
          <div className="cs-foot">
            <div className="cs-meta">
              <span><Icon name="layers" size={15} />{course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}</span>
              <span><Icon name="video" size={15} />{course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}</span>
              {dur && <span><Icon name="clock" size={15} />{dur}</span>}
            </div>
            {course.canAccess && course.lessonCount > 0 && (
              <div className="cs-bar acc" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress"><b style={{ width: `${pct}%` }} /></div>
            )}
            <span className="cs-cta">
              {course.canAccess ? (started ? `Continue · ${pct}%` : 'Start course') : course.previewCount > 0 ? 'View course · free previews' : 'View course'}
              <Icon name="arrowRight" size={16} />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function AccessChipRow({ course }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <AccessChip access={course.access} />
      {course.previewCount > 0 && !course.canAccess && <span className="cs-chip"><Icon name="play" size={11} />{course.previewCount} free preview{course.previewCount === 1 ? '' : 's'}</span>}
    </div>
  );
}

export default function Courses() {
  const { data, error, loading, reload } = useLoad(() => coursesApi.catalog());

  return (
    <section className="rd-section">
      <header className="cs-head">
        <span className="label">Courses</span>
        <h1 className="h-l rd-title">Learn the market, step by step.</h1>
        <p className="cs-sub">Structured video courses on market structure, price action and risk. Watch at your own pace; your place and progress are saved.</p>
      </header>

      {loading && !data ? <p role="status">Loading courses…</p>
        : error ? <StateCard title="We could not load the courses" action={<button type="button" className="btn btn-dark cs-btn" onClick={reload}>Try again</button>}>{error.message}</StateCard>
        : data.length === 0 ? <StateCard title="New courses are on the way">Nothing has been published yet. Check back soon.</StateCard>
        : <ul className="cs-grid">{data.map((c) => <CourseCard key={c.id} course={c} />)}</ul>}
    </section>
  );
}
