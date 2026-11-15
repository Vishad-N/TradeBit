import { useEffect, useId, useMemo, useRef, useState } from 'react';
import HeroArt from './fx/HeroArt.jsx';
import { ICON_PRESETS, iconMode, presetById, randomPresetFor, sanitizeSvg } from '../../lib/courseIcons.js';
import '../../styles/courses-fx.css'; // the .ha-* animation rules
import '../../styles/course-icon-picker.css';

/** Form value <-> course fields. mode: 'random' | 'custom' | a preset id. */
export const iconValueOf = (course) => ({ mode: iconMode(course), svg: course?.customSvg || '' });
export const iconPayload = ({ mode, svg }) => ({
  svgPresetId: presetById(mode) ? mode : null,
  customSvg: mode === 'custom' ? svg.trim() : null,
});

const MAX_SVG = 20000;

/** A dark tile with the glow colour of the icon, like the real course card thumbnail. */
function Tile({ children, color, rgb, small }) {
  return <span className={`ci-tile${small ? ' sm' : ''}`} style={{ '--ac': color, '--ac-rgb': rgb }}>{children}</span>;
}
const ShuffleGlyph = () => (
  <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="#e9edf3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h3c3 0 4 10 8 10h5M3 17h3c1.5 0 2.5-2 3.5-4M14 7h5M17 4l3 3-3 3M17 14l3 3-3 3" /></svg>
);
const CodeGlyph = () => (
  <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="#e9edf3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14" /></svg>
);

function Preview({ mode, svg, courseId }) {
  const uid = useId().replace(/:/g, '');
  const safe = useMemo(() => (mode === 'custom' ? sanitizeSvg(svg, `pv${uid}`) : null), [mode, svg, uid]);
  if (mode === 'custom') {
    return <Tile color="#b8d83d" rgb="184,216,61">{safe ? <span className="ci-art" dangerouslySetInnerHTML={{ __html: safe }} /> : <CodeGlyph />}</Tile>;
  }
  const p = presetById(mode) || (courseId ? randomPresetFor(courseId) : null);
  if (!p) return <Tile color="#b8d83d" rgb="184,216,61"><ShuffleGlyph /></Tile>;
  return <Tile color={p.color} rgb={p.rgb}><HeroArt kind={p.kind} className="ci-art" /></Tile>;
}

/**
 * "Course icon" field for the admin course forms: a dropdown whose rows preview every animated preset, plus
 * "Random from presets" (the default) and "Custom SVG" (paste markup or load a .svg file).
 * value = { mode, svg }; use iconPayload(value) to get the fields to send to the API.
 */
export default function CourseIconPicker({ value, onChange, courseId, id = 'course-icon' }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const root = useRef(null);
  const fileRef = useRef(null);
  const listId = `${id}-list`;

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && (setOpen(false), root.current?.querySelector('button')?.focus());
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const options = [
    { mode: 'random', label: 'Random from presets', note: 'A gold/crypto icon picked automatically' },
    ...ICON_PRESETS.map((p) => ({ mode: p.id, label: p.label, note: p.sym })),
    { mode: 'custom', label: 'Custom SVG', note: 'Paste markup or upload a .svg file' },
  ];
  const current = options.find((o) => o.mode === value.mode) || options[0];
  const pick = (mode) => { setOpen(false); setErr(''); onChange({ ...value, mode }); };

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SVG) { setErr('That file is over 20 KB. Simplify the SVG and try again.'); e.target.value = ''; return; }
    const r = new FileReader();
    r.onload = () => { setErr(''); onChange({ mode: 'custom', svg: String(r.result || '') }); };
    r.onerror = () => setErr('Could not read that file.');
    r.readAsText(f);
    e.target.value = '';
  }
  const svgBad = value.mode === 'custom' && value.svg.trim() && !sanitizeSvg(value.svg, 'chk');

  return (
    <div className="ci-field" ref={root}>
      <span className="ci-label" id={`${id}-label`}>Course icon</span>
      <button type="button" id={id} className="ci-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-labelledby={`${id}-label ${id}`} onClick={() => setOpen((o) => !o)}>
        <Preview mode={value.mode} svg={value.svg} courseId={courseId} />
        <span className="ci-trigger-text"><b>{current.label}</b><small>{current.note}</small></span>
        <span className="ci-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="ci-list" role="listbox" id={listId} aria-labelledby={`${id}-label`}>
          {options.map((o) => (
            <li key={o.mode} role="option" aria-selected={o.mode === value.mode}>
              <button type="button" className={`ci-opt${o.mode === value.mode ? ' on' : ''}`} onClick={() => pick(o.mode)}>
                {o.mode === 'random' ? <Tile small color="#b8d83d" rgb="184,216,61"><ShuffleGlyph /></Tile>
                  : o.mode === 'custom' ? <Tile small color="#b8d83d" rgb="184,216,61"><CodeGlyph /></Tile>
                  : <Preview mode={o.mode} />}
                <span><b>{o.label}</b><small>{o.note}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <small className="ci-help">New courses automatically get a random gold/crypto animated icon from the 10 gold/crypto presets. The ICT, setup and order-flow icons are concept diagrams you pick by hand. You can change it anytime.</small>

      {value.mode === 'custom' && (
        <div className="ci-custom">
          <label className="rd-field"><span>SVG markup</span>
            <textarea rows={6} value={value.svg} onChange={(e) => onChange({ ...value, svg: e.target.value })} spellCheck={false} maxLength={MAX_SVG}
              placeholder={'<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">…</svg>'} />
            <small>One &lt;svg&gt; with a viewBox (400×400 matches the presets). Scripts, event handlers and external links are removed. Reuse the classes <code>ha-float</code>, <code>ha-pulse</code>, <code>ha-spin-slow</code>, <code>ha-twinkle</code> to animate.</small>
          </label>
          <div className="ci-actions">
            <input ref={fileRef} type="file" accept=".svg,image/svg+xml" onChange={onFile} aria-label="Upload an SVG file" />
          </div>
          {svgBad && <p className="rd-error" role="alert">That is not a valid SVG, so the course will use a random preset until it is fixed.</p>}
          {value.mode === 'custom' && !value.svg.trim() && <p className="ci-help">Leave this empty to go back to a random preset.</p>}
        </div>
      )}
      {err && <p className="rd-error" role="alert">{err}</p>}
    </div>
  );
}
