import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.jsx';
import { coursesApi } from '../../services/coursesApi.js';
import { fmtDuration } from '../../lib/courses.js';
import { ASSET_THEMES, ORG, SITE_URL, assetOf, visualOf } from '../../lib/courseTheme.js';
import { crumbs, useSeo } from '../../lib/seo.js';
import Icon from '../../components/courses/Icons.jsx';
import AssetBackdrop from '../../components/courses/fx/AssetBackdrop.jsx';
import LazyScene from '../../components/courses/fx/LazyScene.jsx';
import ProgressRing from '../../components/courses/fx/ProgressRing.jsx';
import { StateCard, useLoad } from './shared.jsx';
import { AssetThumb, Faq, Shell, Tilt, faqLd } from './ui.jsx';

const FAQ = [
  ['What will I learn in these trading courses?', 'Structured video lessons on market structure, price action, liquidity and risk management, applied to gold, silver, forex, Bitcoin, Ethereum and Solana.'],
  ['Do I need trading experience to start?', 'No. Courses are organised into modules so you can begin with the basics and move on to more advanced setups at your own pace.'],
  ['Are any lessons free?', 'Many courses include free preview lessons that anyone can watch. Full courses are open to logged-in members, 1% Club members or enrolled students, depending on the course.'],
  ['Can I watch on my phone?', 'Yes. The course player works on phones, tablets and desktops, and your place in each lesson is saved to your account so you can resume anywhere.'],
  ['Is this financial advice?', 'No. The courses are educational. Trading gold, forex and crypto carries risk and you can lose money, so please read our risk disclosure before trading.'],
];

const reveal = (i = 0) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.96 }, transition: { duration: 0.5, delay: Math.min(i, 8) * 0.06, ease: [0.16, 1, 0.3, 1] } });

function CourseCard({ course, i }) {
  const theme = visualOf(course); // illustration + accent (a stable pick for courses with no recognisable market)
  const pct = course.lessonCount ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
  const started = course.completedCount > 0;
  const dur = fmtDuration(course.durationSec);
  const cta = course.canAccess ? (started ? `Continue · ${pct}%` : 'Start course') : course.previewCount > 0 ? 'View · free previews' : 'View course';
  return (
    <motion.li layout="position" {...reveal(i)} style={{ '--ac': theme.color, '--ac-rgb': theme.rgb }} className="cx-li">
      <Tilt>
        <Link to={`/courses/${course.slug}`} className="cx-card" aria-label={`${course.title}. ${started ? `${pct}% complete` : cta}`}>
          <AssetThumb course={course} theme={theme} flags={!course.published && <span className="cx-chip">Draft</span>} />
          <div className="cx-card-body">
            <div className="cx-chips">
              <span className={`cx-chip ${course.access === 'PUBLIC' ? 'gain' : ''}`}>{course.access !== 'PUBLIC' && <Icon name="lock" size={11} />}{course.access === 'PUBLIC' ? 'Free for members' : course.access === 'CLUB' ? '1% Club' : 'Enrolled'}</span>
              {course.previewCount > 0 && !course.canAccess && <span className="cx-chip"><Icon name="play" size={11} />{course.previewCount} free</span>}
            </div>
            <h2 className="cx-card-title">{course.title}</h2>
            {course.summary && <p className="cx-card-sum">{course.summary}</p>}
            <div className="cx-card-foot">
              <div className="cx-meta">
                <span><Icon name="layers" size={14} />{course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}</span>
                <span><Icon name="video" size={14} />{course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}</span>
                {dur && <span><Icon name="clock" size={14} />{dur}</span>}
              </div>
              <div className="cx-card-cta">
                <span>{cta}<Icon name="arrowRight" size={15} /></span>
                {course.canAccess && course.lessonCount > 0 && <ProgressRing value={pct} size={44} stroke={9} label={`${course.title} progress`} className="mini" />}
              </div>
            </div>
          </div>
        </Link>
      </Tilt>
    </motion.li>
  );
}

export default function Courses() {
  const { data, error, loading, reload } = useLoad(() => coursesApi.catalog());
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState('all');
  const tabs = useMemo(() => {
    const seen = new Map();
    (data || []).forEach((c) => { const t = assetOf(c); seen.set(t.key, (seen.get(t.key) || 0) + 1); });
    return Object.values(ASSET_THEMES).filter((t) => seen.has(t.key)).map((t) => ({ ...t, n: seen.get(t.key) }));
  }, [data]);
  const shown = useMemo(() => (data || []).filter((c) => filter === 'all' || assetOf(c).key === filter), [data, filter]);
  const active = filter === 'all' ? ASSET_THEMES.gen : ASSET_THEMES[filter] || ASSET_THEMES.gen;

  const ld = useMemo(() => [
    crumbs([['Home', '/'], ['Courses', '/courses']]),
    faqLd(FAQ),
    {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'TradeBit India trading courses',
      itemListElement: (data || []).filter((c) => c.published).map((c, i) => ({
        '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/courses/${c.slug}`,
        item: { '@type': 'Course', name: c.title, description: c.summary || `${c.title} video course by TradeBit India.`, provider: ORG, url: `${SITE_URL}/courses/${c.slug}` },
      })),
    },
  ], [data]);
  useSeo({
    title: 'Trading Courses: Gold, Silver, Forex, Bitcoin, Ethereum & Solana | TradeBit India',
    description: 'Video trading courses on gold, silver, forex, Bitcoin, Ethereum and Solana. Learn price action, market structure, liquidity and risk management with free preview lessons.',
    path: '/courses', jsonLd: ld,
  });

  return (
    <Shell theme={active}>
      <header className="cx-hero">
        <AssetBackdrop key={active.key} seed={active.key} />
        <LazyScene kind="spheres" count={22} className="cx-hero-3d cx-burst" />
        <div className="cx-hero-in">
          <motion.span className="cx-kicker" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}><i className="cx-live" />Trading academy</motion.span>
          <h1 className="cx-h1">Trading courses for <em>gold, silver, forex</em> &amp; crypto</h1>
          <p className="cx-lead">Structured video lessons on price action, market structure and risk, across XAU, XAG, FX, Bitcoin, Ethereum and Solana. Your place and progress are saved.</p>
          {!authLoading && !user && (
            <motion.div className="cx-login" role="note" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <span className="cx-login-ic"><Icon name="lock" size={18} /></span>
              <p><strong>Log in to start learning.</strong> You can browse every course, but you need an account to watch lessons and save your progress.</p>
              <Link className="btn btn-lime cs-btn" to="/login?next=%2Fcourses">Log in <span className="ar">→</span></Link>
            </motion.div>
          )}
          <ul className="cx-ticker" aria-label="Markets covered">
            {['XAU', 'XAG', 'FX', 'BTC', 'ETH', 'SOL'].map((s, i) => {
              const t = Object.values(ASSET_THEMES).find((x) => x.sym === s);
              return <motion.li key={s} style={{ '--ac': t.color }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.07 }}><b>{s}</b><span>{t.label}</span></motion.li>;
            })}
          </ul>
        </div>
      </header>

      <section className="cx-wrap" aria-labelledby="cx-cat-h">
        <div className="cx-bar">
          <h2 id="cx-cat-h" className="cx-h2">Course catalog</h2>
          {tabs.length > 1 && (
            <>
              <div className="cx-filters" role="group" aria-label="Filter courses by market">
                {[{ key: 'all', label: 'All', n: data.length, color: ASSET_THEMES.gen.color }, ...tabs].map((t) => (
                  <button key={t.key} type="button" className={`cx-fbtn${filter === t.key ? ' on' : ''}`} aria-pressed={filter === t.key} onClick={() => setFilter(t.key)} style={{ '--ac': t.color }}>
                    <span>{t.label}<sup>{t.n}</sup></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {loading && !data ? (
          <ul className="cx-grid" aria-busy="true" aria-label="Loading courses">{[0, 1, 2].map((n) => <li key={n} className="cx-skel" />)}</ul>
        ) : error ? (
          <StateCard title="We could not load the courses" action={<button type="button" className="btn btn-lime cs-btn" onClick={reload}>Try again</button>}>{error.message}</StateCard>
        ) : data.length === 0 ? (
          <StateCard title="New courses are on the way">Nothing has been published yet. Check back soon.</StateCard>
        ) : (
          <motion.ul layout className="cx-grid"><AnimatePresence mode="popLayout">{shown.map((c, i) => <CourseCard key={c.id} course={c} i={i} />)}</AnimatePresence></motion.ul>
        )}

        <Faq items={FAQ} />
        <p className="cx-risk">Educational content only, not financial advice. Trading involves risk. <Link to="/risk-disclosure">Read the risk disclosure</Link>.</p>
      </section>
    </Shell>
  );
}
