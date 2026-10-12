// The site-wide disclaimer. Use <Disclaimer /> wherever content, charts, results or paid programmes appear.
export const DISCLAIMER_TEXT =
  'TradeBit India is an educational platform only. We are not SEBI registered advisors or analysts. All content, charts, and analysis are for educational purposes. Trading involves significant financial risk.';

// `tone="dark"` is for charcoal sections. Extra classes / inline style pass straight through.
export default function Disclaimer({ tone, className = '', style }) {
  return (
    <p className={`disclaimer${tone === 'dark' ? ' on-dark' : ''}${className ? ` ${className}` : ''}`} style={style}>
      <strong>Disclaimer:</strong> {DISCLAIMER_TEXT}
    </p>
  );
}
