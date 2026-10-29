import { useEffect } from 'react';
import { SITE_URL } from './courseTheme.js';

const SET = 'data-seo';

function put(name, attr, content) {
  const el = document.createElement('meta');
  el.setAttribute(attr, name);
  el.setAttribute('content', content);
  el.setAttribute(SET, '');
  document.head.appendChild(el);
  return el;
}

/**
 * Per-route head tags for the SPA: title, description, canonical, Open Graph / Twitter and JSON-LD.
 * Everything it adds is removed (and the old title restored) when the page changes.
 * `jsonLd` may be an object or an array; pass a memoised / stable value or accept one re-write per render.
 */
export function useSeo({ title, description, path, image, noindex = false, jsonLd }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const prevTitle = document.title;
    const url = `${SITE_URL}${path || window.location.pathname}`;
    const made = [];
    // index.html ships a default description (and may ship others): take those out while this page owns the tags.
    const displaced = [...document.head.querySelectorAll(`meta[name="description"],meta[name="robots"],link[rel="canonical"]`)].filter((n) => !n.hasAttribute(SET));
    displaced.forEach((n) => n.remove());
    document.title = title;
    made.push(put('description', 'name', description));
    made.push(put('robots', 'name', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'));
    made.push(put('og:type', 'property', 'website'), put('og:site_name', 'property', 'TradeBit India'));
    made.push(put('og:title', 'property', title), put('og:description', 'property', description), put('og:url', 'property', url));
    made.push(put('twitter:card', 'name', image ? 'summary_large_image' : 'summary'));
    made.push(put('twitter:title', 'name', title), put('twitter:description', 'name', description));
    if (image) made.push(put('og:image', 'property', image), put('twitter:image', 'name', image));
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    link.setAttribute(SET, '');
    document.head.appendChild(link);
    made.push(link);
    if (ld) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute(SET, '');
      s.textContent = ld;
      document.head.appendChild(s);
      made.push(s);
    }
    return () => { document.title = prevTitle; made.forEach((n) => n.remove()); displaced.forEach((n) => document.head.appendChild(n)); };
  }, [title, description, path, image, noindex, ld]);
}

export const crumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${path}` })),
});
