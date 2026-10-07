import { useState } from 'react';

const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// Reusable, data-driven card. `href` is where Sign Up goes: the official referral URL, reached through the
// site's /go/<slug> redirect (or the URL itself when the card comes from the static fallback list).
// A referral CODE is only ever shown and copied: it cannot be typed into another website's form.
export default function PlatformCard({ platform, href, index = 0 }) {
  const { name, logo, description, category, referralCode, ctaLabel, featured, hasReferralUrl = Boolean(href) } = platform;
  const [logoFailed, setLogoFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeOnly = Boolean(referralCode) && !hasReferralUrl;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      // Clipboard API blocked (http, older browser): select the code so the visitor can copy it by hand.
      const el = document.getElementById(`code-${platform.slug}`);
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const link = href && (
    <a className={`btn ${featured ? 'btn-lime' : 'btn-pale'} pc-cta`} href={href} target="_blank" rel="noopener noreferrer">
      {codeOnly ? 'Open Registration' : (ctaLabel || 'Sign Up')} <span className="ar">↗</span>
      <span className="sr-only"> (opens {name} in a new tab)</span>
    </a>
  );

  return (
    <article className={`pcard${featured ? ' is-featured' : ''}`} style={{ '--i': index }}>
      <svg className="pc-deco" viewBox="0 0 160 160" fill="none" aria-hidden="true">
        <circle cx="160" cy="0" r="150" stroke="#DCE8C0" strokeOpacity=".07" />
        <circle cx="160" cy="0" r="115" stroke="#DCE8C0" strokeOpacity=".07" />
        <circle cx="160" cy="0" r="80" stroke={featured ? '#B8D83D' : '#DCE8C0'} strokeOpacity={featured ? '.5' : '.07'} />
      </svg>

      <div className="pc-top">
        <div className="pc-logo">
          {logo && !logoFailed
            ? <img src={logo} alt={`${name} logo`} loading="lazy" decoding="async" onError={() => setLogoFailed(true)} />
            : <span aria-hidden="true">{initials(name)}</span>}
        </div>
        <div className="pc-tags">
          {featured && <span className="pc-flag">Featured</span>}
          {category && <span className="pc-cat">{category}</span>}
        </div>
      </div>

      <h3>{name}</h3>
      {description && <p className="pc-desc">{description}</p>}

      {referralCode && (
        <div className="pc-code">
          <span className="meta">Referral code</span>
          <b id={`code-${platform.slug}`}>{referralCode}</b>
          <button type="button" className="pc-copy" onClick={copyCode} aria-label={`Copy ${name} referral code`}>{copied ? 'Copied ✓' : 'Copy'}</button>
        </div>
      )}

      <div className="pc-actions">
        {codeOnly && <button type="button" className="btn btn-lime pc-cta" onClick={copyCode}>{copied ? 'Code Copied ✓' : 'Copy Referral Code'}</button>}
        {link}
      </div>
    </article>
  );
}
