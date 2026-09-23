export default function BrandMark(props) {
  return (
    <a href="#top" className="brand" {...props}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" stroke="currentColor" strokeOpacity=".35"/><path d="M7 22h4v-5h4v-4h4V9h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="25" cy="9" r="2.4" fill="#B8D83D"/></svg>
      <span>STRATA<small>TRADING INTELLIGENCE</small></span>
    </a>
  );
}
