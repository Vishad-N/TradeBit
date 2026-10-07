import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../services/api.js';
import { PLATFORMS_FALLBACK } from '../config/platforms.js';
import PlatformCard from './PlatformCard.jsx';
import '../styles/platforms.css';

// Cards come from the API (managed by the client in the admin area). If the API cannot be reached, the static
// list in src/config/platforms.js is used instead. With neither, the section is not rendered at all.
function usePlatforms() {
  const [state, setState] = useState({ loading: true, items: [] });
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${API_URL}/platforms`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(list => setState({
        loading: false,
        items: list.map(p => ({
          ...p,
          // API logos can be relative ("/platforms/<slug>/logo"); sign-up always goes through the /go redirect.
          logo: p.logo && p.logo.startsWith('/') ? `${API_URL}${p.logo}` : p.logo,
          href: p.canSignUp ? `${API_URL}/go/${encodeURIComponent(p.slug)}` : '',
        })),
      }))
      .catch(() => setState({
        loading: false,
        items: PLATFORMS_FALLBACK.map(p => ({ ...p, hasReferralUrl: Boolean(p.referralUrl), href: p.referralUrl || p.websiteUrl || '' })),
      }))
      .finally(() => clearTimeout(timer));
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, []);
  return state;
}

export default function TradingPlatforms() {
  const { loading, items } = usePlatforms();
  const [filter, setFilter] = useState('All');
  const root = useRef(null);

  const categories = useMemo(() => [...new Set(items.map(p => p.category).filter(Boolean))], [items]);
  const showFilters = categories.length >= 2; // only when the data actually has categories to filter by
  const visible = filter === 'All' ? items : items.filter(p => p.category === filter);
  const hasContent = loading || items.length > 0;

  // The page-wide reveal runs once at load, before these elements exist, so reveal them here.
  useEffect(() => {
    const el = root.current;
    if (!el || loading) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
    el.querySelectorAll('.rv, .split').forEach(n => io.observe(n));
    return () => io.disconnect();
  }, [loading, items.length]);

  if (!hasContent) return null;

  return (
    <section className="plats" id="trading-platforms" aria-labelledby="plats-t" ref={root} aria-busy={loading || undefined}>
      <div className="plats-rings" aria-hidden="true">{[1, 2, 3, 4, 5].map(k => <i key={k} style={{ width: `calc(${k} * 18vw + 40px)`, height: `calc(${k} * 18vw + 40px)` }} />)}</div>
      <div className="wrap">
        <div className="plats-head">
          <span className="label rv">Trading Platforms</span>
          <h2 id="plats-t" className="h-l split"><span className="ln"><span>Where You</span></span><span className="ln"><span>Can <span className="hl">Trade.</span></span></span></h2>
          <p className="plats-lead rv d1">Open an account with one of our platform partners using the sign-up links below.</p>
        </div>

        {showFilters && (
          <div className="plats-filters rv d2" role="group" aria-label="Filter platforms by category">
            {['All', ...categories].map(c => (
              <button key={c} type="button" className="chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
        )}

        <div className="plats-grid" role="list">
          {loading
            ? [0, 1, 2].map(i => <div key={i} className="pcard is-skeleton" aria-hidden="true" />)
            : visible.map((p, i) => <div role="listitem" key={p.slug} className="plats-item"><PlatformCard platform={p} href={p.href} index={i} /></div>)}
        </div>

        <p className="plats-note rv d3">These are referral links. If you open an account through them we may earn a commission, at no extra cost to you.</p>
      </div>
    </section>
  );
}
