import { useEffect, useState } from 'react';

// Wrapper component for parallax scrolling and animation
function FloatingAsset({ children, className = '', speed = 0.2 }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setOffset(window.scrollY * speed);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div className={`bg-asset ${className}`} style={{ transform: `translateY(-${offset}px)` }} aria-hidden="true">
      <div className="bg-asset-inner">
        {children}
      </div>
    </div>
  );
}

export function BitcoinAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-btc ${className}`} speed={0.15}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 2v20M15.5 2v20" vectorEffect="non-scaling-stroke" />
        <path d="M7.5 4h6a4 4 0 0 1 0 8h-6z" vectorEffect="non-scaling-stroke" />
        <path d="M7.5 12h7.5a4.5 4.5 0 0 1 0 9h-7.5z" vectorEffect="non-scaling-stroke" />
        <circle cx="12" cy="12" r="10" vectorEffect="non-scaling-stroke" />
      </svg>
    </FloatingAsset>
  );
}

export function EthereumAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-eth ${className}`} speed={0.25}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 12l8 4 8-4-8-10z" vectorEffect="non-scaling-stroke" />
        <path d="M4 12l8 8 8-8" vectorEffect="non-scaling-stroke" />
        <path d="M12 2v14" vectorEffect="non-scaling-stroke" />
        <path d="M4 12h16" vectorEffect="non-scaling-stroke" />
      </svg>
    </FloatingAsset>
  );
}

export function SolanaAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-sol ${className}`} speed={0.3}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15h13l3-3H7l-3 3z" vectorEffect="non-scaling-stroke" />
        <path d="M4 9h13l3-3H7L4 9z" vectorEffect="non-scaling-stroke" />
        <path d="M7 21h13l3-3H10l-3 3z" vectorEffect="non-scaling-stroke" />
      </svg>
    </FloatingAsset>
  );
}

export function GoldAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-gold ${className}`} speed={0.2}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11l4-4h8l4 4" vectorEffect="non-scaling-stroke" />
        <path d="M4 11v5l4 4h8l4-4v-5" vectorEffect="non-scaling-stroke" />
        <path d="M4 11h16" vectorEffect="non-scaling-stroke" />
        <path d="M8 7v13" vectorEffect="non-scaling-stroke" />
        <path d="M16 7v13" vectorEffect="non-scaling-stroke" />
      </svg>
    </FloatingAsset>
  );
}

export function AltcoinsAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-alt ${className}`} speed={0.1}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="20,20 40,20 50,40 30,50" className="fade-shape s1" vectorEffect="non-scaling-stroke" />
        <polygon points="70,30 90,40 80,60 60,50" className="fade-shape s2" vectorEffect="non-scaling-stroke" />
        <circle cx="25" cy="80" r="12" className="fade-shape s3" vectorEffect="non-scaling-stroke" />
        <rect x="70" y="70" width="18" height="18" rx="2" className="fade-shape s4" vectorEffect="non-scaling-stroke" />
      </svg>
    </FloatingAsset>
  );
}
