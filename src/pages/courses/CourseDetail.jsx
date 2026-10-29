import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { coursesApi } from '../../services/coursesApi.js';
import { fmtClock, fmtDuration, ACCESS_LABEL } from '../../lib/courses.js';
import { ORG, SITE_URL, assetOf, isoDuration, visualOf } from '../../lib/courseTheme.js';
import { crumbs, useSeo } from '../../lib/seo.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/courses/Icons.jsx';
import EnrollButton from '../../components/EnrollButton.jsx';
import AssetBackdrop from '../../components/courses/fx/AssetBackdrop.jsx';
import HeroArt from '../../components/courses/fx/HeroArt.jsx';
import ProgressRing from '../../components/courses/fx/ProgressRing.jsx';
import { StateCard, useLoad } from './shared.jsx';
import { AssetThumb, Crumbs, Faq, Shell, faqLd } from './ui.jsx';

// What to tell a viewer who cannot open the course's full content.
function LockNote({ course }) {
  const here = encodeURIComponent(useLocation().pathname);
  if (course.lockReason === 'LOGIN') {
    return (
      <>
        <p className="cx-lock"><Icon name="lock" size={18} className="cs-ic" /><span>Log in to start this course and save your progress.</span></p>
        <Link className="btn btn-lime cs-btn" to={`/login?next=${here}`}>Log in to continue <span className="ar">→</span></Link>
      </>
    );
  }
  if (course.lockReason === 'CLUB') {
    return (
      <>
        <p className="cx-lock"><Icon name="lock" size={18} className="cs-ic" /><span>This course is for 1% Club members. Free previews are open to everyone.</span></p>
        <Link className="btn btn-lime cs-btn" to="/1-percent-club">Join the 1% Club <span className="ar">→</span></Link>
      </>
    );
  }
  return (
    <>
      <p className="cx-lock"><Icon name="lock" size={18} className="cs-ic" /><span>This course is for enrolled students. Free previews are open to everyone.</span></p>
      <EnrollButton className="btn btn-lime cs-btn">Enrol to unlock</EnrollButton>
    </>
  );
}

function LessonRow({ course, lesson, n }) {
  const open = !lesson.locked && lesson.hasVideo;
  const state = lesson.completed ? 'done' : lesson.locked ? 'locked' : !lesson.hasVideo ? 'soon' : '';
  const icon = lesson.completed ? 'check' : lesson.locked ? 'lock' : lesson.hasVideo ? 'play' : 'clock';
  const body = (
    <>
      <span className="cx-les-ic"><Icon name={icon} size={15} /></span>
      <span className="cx-les-t">
        <strong><i>{String(n).padStart(2, '0')}</i>{lesson.title}</strong>
        {lesson.description && <small>{lesson.description}</small>}
      </span>
      <span className="cx-les-r">
        {lesson.isFreePreview && <span className="cx-chip gain">Free preview</span>}
        {!lesson.hasVideo && !lesson.locked && <span className="cx-chip">Coming soon</span>}
        {lesson.durationSec > 0 && <span className="dur">{fmtClock(lesson.durationSec)}</span>}
      </span>
    </>
  );
  return open
    ? <li><Link className={`cx-lesson ${state}`} to={`/courses/${course.slug}/lesson/${lesson.id}`}>{body}</Link></li>
    : <li><div className={`cx-lesson ${state}`} aria-disabled="true">{body}</div></li>;
}

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: course, error, loading, reload } = useLoad(() => coursesApi.course(slug), [slug]);
  const asset = assetOf(course || { slug });
  const theme = visualOf(course || { slug });

  const faq = useMemo(() => {
    if (!course) return [];
    const mods = course.modules.map((m) => m.title).join(', ');
    return [
      [`What does the ${course.title} course cover?`, course.summary || `${course.title} is a structured video course by TradeBit India with ${course.lessonCount} lessons across ${course.modules.length} modules.${mods ? ` Modules: ${mods}.` : ''}`],
      [`Who can watch ${course.title}?`, course.access === 'PUBLIC' ? 'Any logged-in member can watch every lesson, and free previews are open to everyone.' : course.access === 'CLUB' ? '1% Club members and enrolled students can watch every lesson. Free previews are open to everyone.' : 'Enrolled students can watch every lesson. Free previews are open to everyone.'],
      ['Does the course save my progress?', 'Yes. When you are logged in, your position in each lesson and the lessons you complete are saved, so you can resume on any device.'],
    ];
  }, [course]);

  const dur = course ? fmtDuration(course.durationSec) : '';
  const ld = useMemo(() => {
    if (!course) return null;
    const url = `${SITE_URL}/courses/${course.slug}`;
    return [
      crumbs([['Home', '/'], ['Courses', '/courses'], [course.title, `/courses/${course.slug}`]]),
      faqLd(faq),
      {
        '@context': 'https://schema.org', '@type': 'Course', name: course.title,
        description: course.summary || course.description?.slice(0, 300) || `${course.title}: video trading course by TradeBit India.`,
        url, provider: ORG, inLanguage: 'en', educationalLevel: 'Beginner to advanced', teaches: asset.label === 'Trading' ? 'Trading, price action and risk management' : `${asset.label} trading`,
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: course.durationSec ? isoDuration(course.durationSec) : undefined },
        ...(course.access === 'PUBLIC' ? { offers: { '@type': 'Offer', category: 'Free', price: 0, priceCurrency: 'INR', url } } : {}),
      },
    ];
  }, [course, faq, asset.label]);

  useSeo(course ? {
    title: `${course.title}: ${asset.label === 'Trading' ? 'Trading' : `${asset.label} Trading`} Course | TradeBit India`,
    description: (course.summary || course.description || `${course.title} video course on price action, market structure and risk management.`).replace(/\s+/g, ' ').slice(0, 158),
    path: `/courses/${course.slug}`, noindex: !course.published, jsonLd: ld,
    image: course.thumbnail ? coursesApi.thumbnailUrl(course.thumbnail) : undefined,
  } : { title: 'Trading course | TradeBit India', description: 'Trading course by TradeBit India.', path: `/courses/${slug}`, noindex: true });

  if (loading && !course) return <Shell theme={theme}><div className="cx-wrap"><p role="status" className="cx-status">Loading course…</p></div></Shell>;
  if (error) {
    const missing = error.status === 404;
    return (
      <Shell theme={theme}>
        <div className="cx-wrap cx-narrow">
          <Link className="cx-back" to="/courses"><Icon name="arrowLeft" size={16} />All courses</Link>
          <StateCard title={missing ? 'Course not found' : 'We could not load this course'} action={missing ? <Link className="btn btn-lime cs-btn" to="/courses">Browse courses</Link> : <button type="button" className="btn btn-lime cs-btn" onClick={reload}>Try again</button>}>
            {missing ? 'It may have been unpublished or the link is wrong.' : error.message}
          </StateCard>
        </div>
      </Shell>
    );
  }

  const pct = course.lessonCount ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
  const previewLesson = course.modules.flatMap((m) => m.lessons).find((l) => l.isFreePreview && l.hasVideo && !l.locked);
  const resumeTo = course.resumeLessonId ? `/courses/${course.slug}/lesson/${course.resumeLessonId}` : null;
  let counter = 0;

  return (
    <Shell theme={theme}>
      <header className="cx-hero cx-hero-sm">
        <AssetBackdrop seed={theme.key} />
        <HeroArt kind={theme.key} className="cx-hero-art" />
        <div className="cx-hero-in">
          <Crumbs items={[['Home', '/'], ['Courses', '/courses'], [course.title]]} />
          {!course.published && <div className="cx-notice" role="status"><Icon name="alert" size={18} className="cs-ic" /><span>This course is a draft. Only admins can see it.</span></div>}
          <div className="cx-chips">
            <span className="cx-chip asset">{asset.sym} · {asset.label}</span>
            <span className={`cx-chip ${course.access === 'PUBLIC' ? 'gain' : ''}`}>{course.access !== 'PUBLIC' && <Icon name="lock" size={11} />}{ACCESS_LABEL[course.access]}</span>
          </div>
          <h1 className="cx-h1 sm">{course.title}</h1>
          {course.summary && <p className="cx-lead">{course.summary}</p>}
          <div className="cx-meta">
            <span><Icon name="layers" size={15} />{course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>
            <span><Icon name="video" size={15} />{course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}</span>
            {dur && <span><Icon name="clock" size={15} />{dur}</span>}
          </div>
        </div>
      </header>

      <div className="cx-wrap cx-detail">
        <div className="cx-detail-main">
          {course.description && <section aria-labelledby="cx-about"><h2 id="cx-about" className="cx-h2">About this course</h2><p className="cx-about">{course.description}</p></section>}

          <section aria-labelledby="cx-cur">
            <h2 id="cx-cur" className="cx-h2">Curriculum</h2>
            {course.modules.length === 0 ? <StateCard title="Lessons are being added">Check back soon.</StateCard> : (
              <div className="cx-mods">
                {course.modules.map((m, i) => {
                  const done = m.lessons.filter((l) => l.completed).length;
                  return (
                    <motion.section key={m.id} className="cx-mod" aria-labelledby={`m-${m.id}`} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                      <div className="cx-mod-head">
                        <span className="cx-mod-n">Module {i + 1}</span>
                        <h3 id={`m-${m.id}`} className="cx-mod-title">{m.title}</h3>
                        <span className="cx-mod-count">{user ? `${done}/${m.lessons.length} done` : `${m.lessons.length} lesson${m.lessons.length === 1 ? '' : 's'}`}</span>
                      </div>
                      {user && m.lessons.length > 0 && <div className="cx-line"><motion.b initial={{ scaleX: 0 }} whileInView={{ scaleX: done / m.lessons.length }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} /></div>}
                      {m.description && <p className="cx-mod-desc">{m.description}</p>}
                      {m.lessons.length === 0 ? <p className="cx-mod-desc">No lessons in this module yet.</p> : (
                        <ul className="cx-lessons">{m.lessons.map((l) => <LessonRow key={l.id} course={course} lesson={l} n={++counter} />)}</ul>
                      )}
                    </motion.section>
                  );
                })}
              </div>
            )}
          </section>

          <Faq items={faq} title="Course FAQ" />
        </div>

        <motion.aside className="cx-aside" aria-label="Course summary" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <AssetThumb course={course} theme={theme} />
          <div className="cx-aside-body">
            {course.canAccess && course.lessonCount > 0 && (
              <div className="cx-prog">
                <ProgressRing value={pct} size={92} label="Course progress" />
                <span><strong>{course.completedCount} of {course.lessonCount}</strong> lessons complete</span>
              </div>
            )}
            {course.canAccess ? (
              resumeTo
                ? <Link className="btn btn-lime cs-btn" to={resumeTo}>{course.resumeStarted ? 'Continue learning' : 'Start course'} <span className="ar">→</span></Link>
                : <p className="cx-lock"><Icon name="clock" size={18} className="cs-ic" /><span>Videos are being added. Check back soon.</span></p>
            ) : (
              <>
                <LockNote course={course} />
                {previewLesson && (
                  <Link className="cx-ghost" to={`/courses/${course.slug}/lesson/${previewLesson.id}`}><Icon name="play" size={14} />Watch a free preview</Link>
                )}
              </>
            )}
          </div>
        </motion.aside>
      </div>
    </Shell>
  );
}
