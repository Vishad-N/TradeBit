import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { coursesApi } from '../../services/coursesApi.js';
import { ACCESS_LABEL } from '../../lib/courses.js';
import Icon from '../../components/courses/Icons.jsx';
import '../../styles/courses.css';

/** Loads once auth is known (so the first request already carries the token) and again when the user changes. */
export function useLoad(fetcher, deps = []) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetcher()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return undefined;
    return run();
  }, [run, authLoading, user?.id]);
  return { ...state, reload: run };
}

const monogram = (t) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Course thumbnail with a charcoal + lime monogram fallback; optional flags (access / draft) sit on top. */
export function CourseThumb({ course, flags }) {
  const src = coursesApi.thumbnailUrl(course.thumbnail);
  return (
    <div className="cs-thumb">
      {src ? <img src={src} alt="" loading="lazy" /> : <span className="cs-mono" aria-hidden="true">{monogram(course.title)}</span>}
      {flags && <span className="cs-flag">{flags}</span>}
    </div>
  );
}

export function AccessChip({ access }) {
  return <span className={`cs-chip ${access === 'PUBLIC' ? 'acc' : 'dark'}`}>{access !== 'PUBLIC' && <Icon name="lock" size={12} />}{ACCESS_LABEL[access]}</span>;
}

export function StateCard({ title, children, action }) {
  return (
    <div className="cs-box cs-state">
      <h2 className="rd-h2">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
