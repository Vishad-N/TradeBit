import BookLoader from '../../components/BookLoader.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { readingApi } from '../../services/readingApi.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
const SAVE_DELAY_MS = 1200;
const WATERMARK_MOVE_MS = 15000;
const IDLE_MS = 3000;

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A tiled, rotated, user-specific watermark as an inline SVG data URL.
function watermarkImage(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="180" y="110" text-anchor="middle" transform="rotate(-24 180 110)" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#151814">${esc(text)}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const IconMinus = () => <Icon d="M5 12h14" />;
const IconPlus = () => <Icon d="M12 5v14M5 12h14" />;
const IconLeft = () => <Icon d="M15 18l-6-6 6-6" />;
const IconRight = () => <Icon d="M9 18l6-6-6-6" />;
const IconExpand = () => <Icon d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />;
const IconCompress = () => <Icon d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />;

export default function BookReader({ book, startPage, onAccessLost, onBack }) {
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
  const [jump, setJump] = useState(String(startPage || 1));
  const [ratio, setRatio] = useState(null); // natural height / width of the last page, so the frame does not jump
  const [resumed, setResumed] = useState((startPage || 1) > 1);
  const [idle, setIdle] = useState(false);

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const idleTimer = useRef(null);
  const cache = useRef(new Map()); // pageNumber -> blob URL
  const inflight = useRef(new Map()); // pageNumber -> pending request, so prefetch and navigation share one download
  const mounted = useRef(true);
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
  const clearCache = useCallback(() => {
    cache.current.forEach(u => URL.revokeObjectURL(u));
    cache.current.clear();
    inflight.current.clear();
  }, []);

  const fetchPage = useCallback(n => {
    if (cache.current.has(n)) return Promise.resolve(cache.current.get(n));
    let pending = inflight.current.get(n);
    if (!pending) {
      pending = readingApi.page(book.id, n, sessionRef.current.sessionToken)
        .then(url => {
          if (!mounted.current) { URL.revokeObjectURL(url); return url; } // left the reader while it downloaded
          cache.current.set(n, url);
          return url;
        })
        .finally(() => inflight.current.delete(n));
      inflight.current.set(n, pending);
    }
    return pending;
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

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearCache(); };
  }, [clearCache]);

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
  const zoomBy = useCallback(d => setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + d).toFixed(2)))), []);

  // ---------- fullscreen ----------
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  // In full screen the bars step aside after a few quiet seconds and come back on any movement.
  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    if (document.fullscreenElement) idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);
  useEffect(() => { wake(); }, [fullscreen, wake]);
  useEffect(() => () => clearTimeout(idleTimer.current), []);

  useEffect(() => {
    const onKey = e => {
      if (e.target instanceof HTMLElement && e.target.matches('input,textarea,select')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(p => p + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(p => p - 1);
      else if (e.key === 'Home') go(1);
      else if (e.key === 'End') go(total);
      else if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP);
      else if (e.key === '-') zoomBy(-ZOOM_STEP);
      else if (e.key === '0') setZoom(1);
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, total, zoomBy, toggleFullscreen]);

  // A new page always starts at its top, and the jump box follows the page.
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0, left: 0 });
    setJump(String(page));
  }, [page]);

  // The "welcome back" hint fades by itself.
  useEffect(() => {
    if (!resumed) return;
    const t = setTimeout(() => setResumed(false), 4500);
    return () => clearTimeout(t);
  }, [resumed]);

  const commitJump = () => {
    const n = parseInt(jump, 10);
    if (Number.isFinite(n)) go(n);
    else setJump(String(page));
  };

  // ---------- deterrents (these raise the effort of casual copying; they cannot stop screenshots) ----------
  useEffect(() => {
    const shield = () => {
      setShielded(true);
      setTimeout(() => setShielded(false), 2500);
    };
    const blockKeys = e => {
      const k = e.key.toLowerCase();
      // Not inside the "go to page" box: there copy / select-all must keep working.
      const typing = e.target instanceof HTMLElement && e.target.matches('input,textarea,select');
      if (!typing && (e.ctrlKey || e.metaKey) && ['c', 'p', 's', 'u', 'a', 'x'].includes(k)) e.preventDefault();
      if (k === 'printscreen') shield();
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

  const progress = Math.round((page / total) * 100);
  const zoomPct = Math.round(zoom * 100);

  if (error?.kind === 'fatal' && !session) {
    return (
      <section className="rd-section rd-narrow">
        <div className="rd-card"><p className="rd-error" role="alert">{error.message}</p><button className="btn btn-dark" onClick={start}>Try again</button></div>
      </section>
    );
  }

  return (
    <section className="rd-reader-wrap">
      <div
        className={`rd-reader${fullscreen ? ' is-full' : ''}${idle ? ' is-idle' : ''}`}
        ref={rootRef}
        onContextMenu={stop}
        onDragStart={stop}
        onCopy={stop}
        onCut={stop}
        onPointerMove={wake}
      >
        <div className="rd-bar">
          {onBack
            ? <button type="button" className="rd-bar-back" aria-label="Back to all books" onClick={onBack}><IconLeft /><span>Library</span></button>
            : <Link to="/" className="rd-bar-back" aria-label="Back to home"><IconLeft /><span>Home</span></Link>}
          <strong className="rd-bar-title" title={book.title}>{book.title}</strong>

          <label className="rd-jump">
            <span className="rd-sr">Go to page</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={jump}
              onChange={e => setJump(e.target.value.replace(/\D/g, '').slice(0, 5))}
              onBlur={commitJump}
              onFocus={e => e.currentTarget.select()}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') { setJump(String(page)); e.currentTarget.blur(); }
              }}
              aria-label={`Page number, of ${total}`}
            />
            <span className="rd-jump-of" aria-live="polite">/ {total}</span>
          </label>

          <div className="rd-bar-tools" role="group" aria-label="View controls">
            <button type="button" title="Zoom out (-)" aria-label="Zoom out" onClick={() => zoomBy(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}><IconMinus /></button>
            <button type="button" className="rd-zoom" title="Reset to fit width (0)" aria-label={`Zoom ${zoomPct}%, reset to fit width`} onClick={() => setZoom(1)} disabled={zoom === 1}>{zoomPct}%</button>
            <button type="button" title="Zoom in (+)" aria-label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}><IconPlus /></button>
            <button type="button" title={fullscreen ? 'Exit full screen (F)' : 'Full screen (F)'} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
              {fullscreen ? <IconCompress /> : <IconExpand />}
            </button>
          </div>
        </div>

        <div className="rd-body">
          <button type="button" className="rd-edge rd-edge-prev" aria-label="Previous page" title="Previous page (←)" onClick={() => go(p => p - 1)} disabled={page <= 1}><IconLeft /></button>
          <button type="button" className="rd-edge rd-edge-next" aria-label="Next page" title="Next page (→)" onClick={() => go(p => p + 1)} disabled={page >= total}><IconRight /></button>

          <div
            className="rd-stage"
            ref={stageRef}
            onDoubleClick={() => setZoom(z => (z > 1 ? 1 : 1.75))}
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
                  ? <button className="btn btn-lime" onClick={() => { clearCache(); start(); }}>Continue reading here</button>
                  : <button className="btn btn-lime" onClick={() => setRetry(r => r + 1)}>Try again</button>}
              </div>
            ) : pageLoading && !src && !error ? (
              <div className="rd-stage-msg"><BookLoader /></div>
            ) : (
              <div
                className={`rd-page${shielded ? ' is-shielded' : ''}${src ? '' : ' is-empty'}`}
                style={{ width: `${zoom * 100}%`, aspectRatio: src ? undefined : `1 / ${ratio || 1.41}` }}
              >
                {src && (
                  <img
                    src={src}
                    alt={`Page ${page} of ${total}`}
                    draggable={false}
                    className={pageLoading ? 'is-loading' : undefined}
                    onLoad={e => { const { naturalWidth: w, naturalHeight: h } = e.currentTarget; if (w) setRatio(h / w); }}
                  />
                )}
                {pageLoading && <div className="rd-spinner" role="status" aria-label="Loading page" />}
                <div className="rd-wm" aria-hidden="true" style={{ backgroundImage: wmImage, backgroundPosition: `${wmPos.x}px ${wmPos.y}px` }} />
                <div className="rd-guard" />
                {shielded && <div className="rd-shield-msg" role="status">Page hidden. Screen capture and printing are disabled for this book.</div>}
              </div>
            )}
          </div>

          {resumed && <div className="rd-toast" role="status">Welcome back. Continuing from page {startPage}.</div>}
        </div>

        <div className="rd-foot">
          <button type="button" className="rd-nav-btn" onClick={() => go(p => p - 1)} disabled={page <= 1}><IconLeft /><span>Previous</span></button>
          <div className="rd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Reading progress">
            <div className="rd-progress-track"><i style={{ width: `${progress}%` }} /></div>
            <span>Page {page} of {total} &middot; {progress}% read</span>
          </div>
          <button type="button" className="rd-nav-btn is-next" onClick={() => go(p => p + 1)} disabled={page >= total}><span>Next</span><IconRight /></button>
        </div>
      </div>
    </section>
  );
}
