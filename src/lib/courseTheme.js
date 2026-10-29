// Visual identity per market. Purely presentational: the API has no "asset" field, so it is inferred from the
// course title / slug. Anything unrecognised gets the house lime "general" theme.
export const ASSET_THEMES = {
  gold:   { key: 'gold',   label: 'Gold',     sym: 'XAU', color: '#e8b923', rgb: '232,185,35',  tag: 'Commodities' },
  silver: { key: 'silver', label: 'Silver',   sym: 'XAG', color: '#c4ccd8', rgb: '196,204,216', tag: 'Commodities' },
  btc:    { key: 'btc',    label: 'Bitcoin',  sym: 'BTC', color: '#f7931a', rgb: '247,147,26',  tag: 'Crypto' },
  eth:    { key: 'eth',    label: 'Ethereum', sym: 'ETH', color: '#38d6e8', rgb: '56,214,232',  tag: 'Crypto' },
  sol:    { key: 'sol',    label: 'Solana',   sym: 'SOL', color: '#a66bff', rgb: '166,107,255', tag: 'Crypto' },
  forex:  { key: 'forex',  label: 'Forex',    sym: 'FX',  color: '#4f9dff', rgb: '79,157,255',  tag: 'Currencies' },
  gen:    { key: 'gen',    label: 'Trading',  sym: 'TB',  color: '#b8d83d', rgb: '184,216,61',  tag: 'Core skills' },
};

const RULES = [
  ['gold', /\b(gold|xau)/i], ['silver', /\b(silver|xag)/i], ['btc', /\b(bitcoin|btc)/i],
  ['eth', /\b(ethereum|eth)\b/i], ['sol', /\b(solana|sol)\b/i], ['forex', /\b(forex|fx|currenc|eurusd|gbpusd|usd)/i],
];

export function assetOf(course) {
  const text = `${course?.title || ''} ${course?.slug || ''}`;
  const hit = RULES.find(([, re]) => re.test(text));
  return ASSET_THEMES[hit ? hit[0] : 'gen'];
}

export const themeStyle = (t) => ({ '--ac': t.color, '--ac-rgb': t.rgb });

export const SITE_URL = 'https://www.tradebitindia.com';
export const ORG = { '@type': 'Organization', name: 'TradeBit India', url: SITE_URL, areaServed: ['IN', 'Worldwide'] };

/** 754 -> "PT12M34S" (ISO 8601 for schema.org durations). */
export function isoDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${r || (!h && !m) ? `${r}S` : ''}`;
}

const HERO_ORDER = ['gold', 'btc', 'eth', 'sol', 'forex', 'silver'];
const hash = (t) => [...String(t)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);

/**
 * The market whose illustration + accent colour a course uses. A recognised market (gold, BTC, ...) wins; any other course
 * gets one of the six by a stable hash of its slug, so the choice never changes between visits and the admin needs to do nothing.
 */
export function visualOf(course) {
  const t = assetOf(course);
  if (t.key !== 'gen') return t;
  const seed = course?.slug || course?.title || course?.id || '';
  return ASSET_THEMES[HERO_ORDER[hash(seed) % HERO_ORDER.length]];
}
