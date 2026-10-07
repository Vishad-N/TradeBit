import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { readingApi } from '../../services/readingApi.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const SAVE_DELAY_MS = 1200;
const WATERMARK_MOVE_MS = 15000;

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A tiled, rotated, user-specific watermark as an inline SVG data URL.
function watermarkImage(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="180" y="110" text-anchor="middle" transform="rotate(-24 180 110)" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#151814">${esc(text)}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function BookReader({ book, startPage, onAccessLost }) {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState(startPage || 1);
  const [src, setSrc] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null); // { kind, message }
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [shielded, setShielded] = useState(false);
  const [wmPos, setWmPos] = useState({ x: 0, y: 0 });
  const [retry, setRetry] = useState(0);

  const rootRef = useRef(null);
  const cache = useRef(new Map()); // pageNumber -> blob URL
  const pageRef = useRef(page);
  const sessionRef = useRef(null);
  const dirty = useRef(false);
  const touchX = useRef(null);
  const total = session?.pageCount || book.pageCount;

  // ---------- start a reading session ----------
  const start = useCallback(async () => {
    setError(null);
    try {
      const s = await readingApi.startSession(book.id);
      sessionRef.current = s;
      setSession(s);
      setPage(s.currentPage);
      pageRef.current = s.currentPage;
    } catch (e) {
      if (e.status === 403 || e.status === 404) onAccessLost?.();
      setError({ kind: 'fatal', message: e.message });
    }
  }, [book.id, onAccessLost]);

  useEffect(() => { start(); }, [start]);

  // ---------- page loading (+ prefetch next, free pages far away) ----------
  const fetchPage = useCallback(async n => {
    if (cache.current.has(n)) return cache.current.get(n);
    const url = await readingApi.page(book.id, n, sessionRef.current.sessionToken);
    cache.current.set(n, url);
    return url;
  }, [book.id]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setPageLoading(true);
    fetchPage(page)
      .then(url => {
        if (!alive) return;
        setSrc(url);
        setPageLoading(false);
        setError(null);
        // Prefetch is best-effort, except that it is also the first place a taken-over session shows up.
        if (page < total) {
          fetchPage(page + 1).catch(e => {
            if (alive && e.code === 'SESSION_REPLACED') setError({ kind: 'replaced', message: 'This book was opened in another window or device. Only one reading session can be active at a time.' });
          });
        }
      })
      .catch(e => {
        if (!alive) return;
        setPageLoading(false);
        if (e.code === 'SESSION_REPLACED') setError({ kind: 'replaced', message: 'This book was opened in another window or device. Only one reading session can be active at a time.' });
        else if (e.status === 403) { onAccessLost?.(); setError({ kind: 'fatal', message: e.message }); }
        else setError({ kind: 'page', message: e.message });
      });
    for (const [n, url] of cache.current) {
      if (Math.abs(n - page) > 2) { URL.revokeObjectURL(url); cache.current.delete(n); }
    }
    return () => { alive = false; };
  }, [session, page, total, retry, fetchPage, onAccessLost]);

  useEffect(() => () => { cache.current.forEach(u => URL.revokeObjectURL(u)); cache.current.clear(); }, []);

  // ---------- progress: debounced save, flushed on leave ----------
  useEffect(() => {
    pageRef.current = page;
    if (!session) return;
    dirty.current = true;
    const t = setTimeout(() => {
      readingApi.saveProgress(book.id, page).then(() => { dirty.current = false; }).catch(() => {});
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [page, session, book.id]);

  useEffect(() => () => {
    if (dirty.current && sessionRef.current) readingApi.saveProgress(book.id, pageRef.current, { keepalive: true }).catch(() => {});
  }, [book.id]);

  // ---------- navigation ----------
  const go = useCallback(n => setPage(p => Math.min(Math.max(typeof n === 'function' ? n(p) : n, 1), total)), [total]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(p => p + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(p => p - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // ---------- deterrents (these raise the effort of casual copying; they cannot stop screenshots) ----------
  useEffect(() => {
    const blockKeys = e => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'p', 's', 'u', 'a', 'x'].includes(k)) e.preventDefault();
      if (k === 'printscreen') shield(e);
    };
    const shield = () => {
      setShielded(true);
      try { navigator.clipboard?.writeText(''); } catch { /* clipboard unavailable */ }
      setTimeout(() => setShielded(false), 2500);
    };
    window.addEventListener('keydown', blockKeys);
    window.addEventListener('keyup', blockKeys);
    window.addEventListener('beforeprint', shield);
    return () => {
      window.removeEventListener('keydown', blockKeys);
      window.removeEventListener('keyup', blockKeys);
      window.removeEventListener('beforeprint', shield);
    };
  }, []);

  const stop = e => e.preventDefault();

  // ---------- watermark drifts so cropping one corner is not enough ----------
  useEffect(() => {
    const t = setInterval(() => setWmPos({ x: Math.round(Math.random() * 160), y: Math.round(Math.random() * 110) }), WATERMARK_MOVE_MS);
    return () => clearInterval(t);
  }, []);
  const wmImage = useMemo(() => (session ? watermarkImage(session.watermark) : 'none'), [session]);

  // ---------- fullscreen ----------
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  const progress = Math.round((page / total) * 100);

  if (error?.kind === 'fatal' && !session) {
    return (
      <section className="rd-section rd-narrow">
        <div className="rd-card"><p className="rd-error" role="alert">{error.message}</p><button className="btn btn-dark" onClick={start}>Try again</button></div>
      </section>
    );
  }

  return (
    <section className="rd-reader-wrap">
      <div className={`rd-reader${fullscreen ? ' is-full' : ''}`} ref={rootRef} onContextMenu={stop} onDragStart={stop} onCopy={stop} onCut={stop}>
        <div className="rd-bar">
          <Link to="/" className="rd-bar-back" aria-label="Back to home">← Home</Link>
          <strong className="rd-bar-title">{book.title}</strong>
          <span className="rd-bar-count" aria-live="polite">{page} / {total}</span>
          <div className="rd-bar-tools">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)))} disabled={zoom <= MIN_ZOOM}>−</button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))} disabled={zoom >= MAX_ZOOM}>+</button>
            <button type="button" aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>{fullscreen ? '✕' : '⛶'}</button>
          </div>
        </div>

        <div
          className="rd-stage"
          onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchX.current == null || zoom > 1) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) go(p => p + (dx < 0 ? 1 : -1));
          }}
        >
          {error && error.kind !== 'fatal' ? (
            <div className="rd-stage-msg" role="alert">
              <p>{error.message}</p>
              {error.kind === 'replaced'
                ? <button className="btn btn-lime" onClick={() => { cache.current.clear(); start(); }}>Continue reading here</button>
                : <button className="btn btn-lime" onClick={() => setRetry(r => r + 1)}>Try again</button>}
            </div>
          ) : (
            <div className={`rd-page${shielded ? ' is-shielded' : ''}`} style={{ width: `${zoom * 100}%` }}>
              {src && <img src={src} alt={`Page ${page} of ${total}`} draggable={false} className={pageLoading ? 'is-loading' : undefined} />}
              {pageLoading && <div className="rd-spinner" role="status" aria-label="Loading page" />}
              <div className="rd-wm" aria-hidden="true" style={{ backgroundImage: wmImage, backgroundPosition: `${wmPos.x}px ${wmPos.y}px` }} />
              <div className="rd-guard" />
            </div>
          )}
        </div>

        <div className="rd-foot">
          <button type="button" className="btn btn-dark" onClick={() => go(p => p - 1)} disabled={page <= 1}>← Previous</button>
          <div className="rd-progress" aria-label={`Reading progress ${progress}%`}>
            <div className="rd-progress-track"><i style={{ width: `${progress}%` }} /></div>
            <span>Reading progress: {progress}%</span>
          </div>
          <button type="button" className="btn btn-lime" onClick={() => go(p => p + 1)} disabled={page >= total}>Next →</button>
        </div>
      </div>
    </section>
  );
}
