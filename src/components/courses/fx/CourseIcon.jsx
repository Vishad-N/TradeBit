import { memo, useId, useMemo } from 'react';
import HeroArt from './HeroArt.jsx';
import { resolveIcon, sanitizeSvg } from '../../../lib/courseIcons.js';

/**
 * The animated icon for a course: its custom SVG, else its chosen preset, else a stable id-hash preset (rules in lib/courseIcons.js).
 * Renders inside whatever container it is given (`.cx-thumb` on cards, the hero on the detail page) with the same `.ha-*` CSS,
 * so tilt, glow and reduced-motion behaviour are unchanged. Falls back to `fallbackKind` while a course has no id yet,
 * or when a custom SVG fails sanitising.
 */
function CourseIcon({ course, fallbackKind = 'gold', className = '' }) {
  const uid = useId().replace(/:/g, '');
  const icon = resolveIcon(course);
  const safe = useMemo(() => (icon?.type === 'custom' ? sanitizeSvg(icon.svg, `ci${uid}`) : null), [icon?.type, icon?.svg, uid]);
  if (safe) return <span className={className} style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: safe }} />;
  const kind = icon?.type === 'preset' ? icon.preset.kind : fallbackKind;
  return <HeroArt kind={kind} className={className} />;
}
export default memo(CourseIcon);
