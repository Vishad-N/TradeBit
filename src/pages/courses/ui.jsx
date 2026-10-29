import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useReducedMotion, useSpring } from 'motion/react';
import { coursesApi } from '../../services/coursesApi.js';
import Icon from '../../components/courses/Icons.jsx';
import { assetOf, themeStyle } from '../../lib/courseTheme.js';
import HeroArt from '../../components/courses/fx/HeroArt.jsx';
import '../../styles/courses-fx.css';

/** Page shell: dark trading-terminal canvas, themed by the asset in `theme` (CSS vars --ac / --ac-rgb). */
export function Shell({ theme, children, className = '' }) {
  return (
    <motion.div className={`cx ${className}`} style={themeStyle(theme)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

export function Crumbs({ items }) {
  return (
    <nav className="cx-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map(([label, to], i) => (
          <li key={label}>{to && i < items.length - 1 ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}{i < items.length - 1 && <Icon name="arrowRight" size={12} />}</li>
        ))}
      </ol>
    </nav>
  );
}

/** Lifts and tilts toward the pointer (mouse only; touch gets a plain press state). */
export function Tilt({ children, className = '', max = 7 }) {
  const calm = useReducedMotion();
  const rx = useSpring(0, { stiffness: 220, damping: 20 });
  const ry = useSpring(0, { stiffness: 220, damping: 20 });
  const gx = useSpring(50, { stiffness: 220, damping: 30 });
  const gy = useSpring(50, { stiffness: 220, damping: 30 });
  const glow = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgba(var(--ac-rgb),.22), transparent 55%)`;
  const move = (e) => {
    if (calm || e.pointerType !== 'mouse') return;
    const b = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    ry.set((x - 0.5) * max * 2);
    rx.set(-(y - 0.5) * max * 2);
    gx.set(x * 100);
    gy.set(y * 100);
  };
  const leave = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div className={`cx-tilt ${className}`} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} onPointerMove={move} onPointerLeave={leave}
      whileHover={calm ? undefined : { y: -6 }} whileTap={{ scale: 0.985 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
      <motion.span className="cx-tilt-glow" style={{ background: glow }} aria-hidden="true" />
      {children}
    </motion.div>
  );
}

/** Thumbnail: the uploaded image when there is one, otherwise a glowing asset medallion. `alt` describes the course. */
export function AssetThumb({ course, theme, flags }) {
  const src = coursesApi.thumbnailUrl(course.thumbnail);
  return (
    <div className="cx-thumb">
      {src ? <img src={src} alt={`${course.title} course cover`} loading="lazy" decoding="async" width="640" height="400" />
        : (
          <HeroArt kind={theme.key} className="cx-thumb-art" />
        )}
      <span className="cx-thumb-shade" aria-hidden="true" />
      <span className="cx-asset-tag">{assetOf(course).label}</span>
      {flags && <span className="cx-flag">{flags}</span>}
    </div>
  );
}

export function Faq({ items, title = 'Frequently asked questions' }) {
  return (
    <section className="cx-faq" aria-labelledby="cx-faq-h">
      <h2 id="cx-faq-h" className="cx-h2">{title}</h2>
      <div className="cx-faq-list">
        {items.map(([q, a]) => (
          <details key={q}>
            <summary><h3>{q}</h3><Icon name="chevronDown" size={18} /></summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export const faqLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
