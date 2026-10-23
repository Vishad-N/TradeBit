// One consistent icon set for the course pages: 24px grid, 1.8 stroke, round caps. No icon library.
const PATHS = {
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.3 2.4 2.4 4.6-4.9" /></>,
  circle: <circle cx="12" cy="12" r="8.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  layers: <><path d="m12 4 8.5 4.5L12 13 3.5 8.5z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" /></>,
  video: <><rect x="3.5" y="6" width="12.5" height="12" rx="2.5" /><path d="m16 10.5 4.5-2.5v8L16 13.5" /></>,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevronUp: <path d="m6 14.5 6-6 6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  edit: <><path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" /><path d="m14 7.5 3 3" /></>,
  trash: <><path d="M5 7h14" /><path d="M9.5 7V5h5v2" /><path d="M7 7l.8 12h8.4L17 7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  image: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3L16 12l4 4" /></>,
  users: <><circle cx="9.5" cy="8.5" r="3" /><path d="M3.5 19c.5-3.2 2.9-5 6-5s5.5 1.8 6 5" /><path d="M16 5.8a3 3 0 0 1 0 5.4M17.5 14.2c1.8.6 3 2.1 3.3 4.8" /></>,
  alert: <><path d="M12 4 3 19.5h18z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  star: <path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.8 5.4-.7z" />,
  external: <path d="M14 5h5v5M19 5l-8 8M18 14v4a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H10" />,
};

export default function Icon({ name, size = 18, className, strokeWidth = 1.8, title }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} aria-label={title}>
      {PATHS[name]}
    </svg>
  );
}
