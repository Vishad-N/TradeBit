import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LINKS } from '../config/learn.js';
import { siteLinksApi } from '../services/readingApi.js';

// The site's social links: the built-in defaults, overridden by whatever an admin saved in Admin -> Social Links.
// Starts with the defaults so the page never waits on (or breaks without) the API.
const SiteLinksContext = createContext({ ...DEFAULT_LINKS, reload: () => {} });

export function SiteLinksProvider({ children }) {
  const [saved, setSaved] = useState({});

  const reload = useCallback(async () => {
    try { setSaved((await siteLinksApi.get()) || {}); } catch { /* keep the defaults */ }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const value = useMemo(() => {
    const merged = { ...DEFAULT_LINKS };
    for (const [k, v] of Object.entries(saved)) if (v) merged[k] = v;
    return { ...merged, reload };
  }, [saved, reload]);

  return <SiteLinksContext.Provider value={value}>{children}</SiteLinksContext.Provider>;
}

export const useSiteLinks = () => useContext(SiteLinksContext);
