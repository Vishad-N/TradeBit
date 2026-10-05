import { useEffect, useState } from 'react';

// Wrapper component for animation
function FloatingAsset({ children, className = '' }) {
  return (
    <div className={`bg-asset ${className}`} aria-hidden="true">
      <div className="bg-asset-inner">
        {children}
      </div>
    </div>
  );
}

export function BitcoinAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-btc ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer glowing rings */}
        <circle cx="50" cy="50" r="48" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="44" strokeDasharray="2 4" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="38" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
        
        {/* Crosshairs / decorative techno lines */}
        <line x1="50" y1="0" x2="50" y2="10" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="90" x2="50" y2="100" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="10" y2="50" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
        <line x1="90" y1="50" x2="100" y2="50" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />

        {/* The Bitcoin 'B' Structure */}
        {/* Main vertical spine */}
        <path d="M38 28 L38 72" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        
        {/* Loops */}
        <path d="M38 32 L58 32 C65 32 70 35 70 42 C70 49 65 52 58 52 L38 52" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M38 52 L62 52 C70 52 75 56 75 64 C75 72 70 76 62 76 L38 76" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        
        {/* Through-stems */}
        <path d="M48 20 L48 80 M56 20 L56 80" strokeOpacity="0.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        
        {/* Geometric intersections (blueprint nodes) */}
        <circle cx="48" cy="32" r="1" fill="currentColor" stroke="none" />
        <circle cx="56" cy="32" r="1" fill="currentColor" stroke="none" />
        <circle cx="48" cy="52" r="1" fill="currentColor" stroke="none" />
        <circle cx="56" cy="52" r="1" fill="currentColor" stroke="none" />
        <circle cx="48" cy="76" r="1" fill="currentColor" stroke="none" />
        <circle cx="56" cy="76" r="1" fill="currentColor" stroke="none" />
      </svg>
    </FloatingAsset>
  );
}

export function EthereumAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-eth ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Radar / HUD elements */}
        <circle cx="50" cy="50" r="45" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="30" strokeDasharray="1 6" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="15" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
        
        {/* Technical Alignment Lines */}
        <line x1="15" y1="50" x2="85" y2="50" strokeOpacity="0.15" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="10" x2="50" y2="90" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />

        {/* Ethereum Top Diamond */}
        <path d="M50 15 L72 50 L50 60 L28 50 Z" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M50 15 L50 60" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> {/* Center spine */}
        
        {/* Ethereum Bottom Pyramid */}
        <path d="M28 55 L50 90 L72 55 L50 65 Z" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M50 65 L50 90" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> {/* Bottom spine */}

        {/* Nodes */}
        <circle cx="50" cy="15" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="28" cy="50" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="72" cy="50" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="50" cy="60" r="1.5" fill="currentColor" stroke="none" />
        
        <circle cx="28" cy="55" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="72" cy="55" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="50" cy="65" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="50" cy="90" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </FloatingAsset>
  );
}

export function SolanaAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-sol ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer tech rings */}
        <rect x="15" y="15" width="70" height="70" rx="35" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
        <rect x="25" y="25" width="50" height="50" rx="25" strokeDasharray="4 6" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
        
        {/* Grid lines */}
        <path d="M20 35 L80 35 M20 65 L80 65" strokeOpacity="0.15" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />

        {/* Solana Ribbons */}
        <path d="M35 30 H 75 L 65 40 H 25 Z" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M25 45 H 65 L 75 55 H 35 Z" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M35 60 H 75 L 65 70 H 25 Z" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        
        {/* Connector lines (blueprint aesthetic) */}
        <line x1="35" y1="30" x2="35" y2="60" strokeOpacity="0.3" strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
        <line x1="65" y1="40" x2="65" y2="70" strokeOpacity="0.3" strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
        
        {/* Vertex Nodes */}
        <circle cx="35" cy="30" r="1" fill="currentColor" stroke="none" />
        <circle cx="75" cy="30" r="1" fill="currentColor" stroke="none" />
        <circle cx="65" cy="40" r="1" fill="currentColor" stroke="none" />
        <circle cx="25" cy="40" r="1" fill="currentColor" stroke="none" />
        
        <circle cx="25" cy="45" r="1" fill="currentColor" stroke="none" />
        <circle cx="65" cy="45" r="1" fill="currentColor" stroke="none" />
        <circle cx="75" cy="55" r="1" fill="currentColor" stroke="none" />
        <circle cx="35" cy="55" r="1" fill="currentColor" stroke="none" />

        <circle cx="35" cy="60" r="1" fill="currentColor" stroke="none" />
        <circle cx="75" cy="60" r="1" fill="currentColor" stroke="none" />
        <circle cx="65" cy="70" r="1" fill="currentColor" stroke="none" />
        <circle cx="25" cy="70" r="1" fill="currentColor" stroke="none" />
      </svg>
    </FloatingAsset>
  );
}

export function GoldAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-gold ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Radar / HUD elements */}
        <circle cx="50" cy="50" r="46" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="38" strokeOpacity="0.2" strokeDasharray="8 4" vectorEffect="non-scaling-stroke" />
        
        {/* Outer Hexagon (Geometric Structure) */}
        <path d="M50 14 L81.18 32 L81.18 68 L50 86 L18.82 68 L18.82 32 Z" strokeWidth="1" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
        
        {/* Inner Isometric Gold Bar/Cube */}
        <path d="M50 26 L74 40 L74 68 L50 82 L26 68 L26 40 Z" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M50 54 L74 40 M50 54 L26 40 M50 54 L50 82" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

        {/* Blueprint connection lines */}
        <line x1="50" y1="14" x2="50" y2="26" strokeOpacity="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <line x1="81.18" y1="32" x2="74" y2="40" strokeOpacity="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <line x1="18.82" y1="32" x2="26" y2="40" strokeOpacity="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />

        {/* Data Nodes */}
        <circle cx="50" cy="26" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="74" cy="40" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="74" cy="68" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="50" cy="82" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="26" cy="68" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="26" cy="40" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="50" cy="54" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </FloatingAsset>
  );
}

export function AltcoinsAsset({ className = '' }) {
  return (
    <FloatingAsset className={`asset-alt ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Expanding network ripples */}
        <circle cx="50" cy="50" r="15" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="30" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="45" strokeOpacity="0.1" strokeDasharray="2 8" vectorEffect="non-scaling-stroke" />

        {/* Main Network Edges */}
        <line x1="50" y1="50" x2="25" y2="25" strokeWidth="1.2" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="50" x2="75" y2="30" strokeWidth="1.2" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="50" x2="80" y2="70" strokeWidth="1.2" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="50" x2="30" y2="75" strokeWidth="1.2" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />

        {/* Peripheral Network Connections */}
        <line x1="25" y1="25" x2="75" y2="30" strokeOpacity="0.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1="75" y1="30" x2="80" y2="70" strokeOpacity="0.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1="80" y1="70" x2="30" y2="75" strokeOpacity="0.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1="30" y1="75" x2="25" y2="25" strokeOpacity="0.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />

        {/* Nodes (Blockchains) */}
        <circle cx="50" cy="50" r="4" fill="currentColor" stroke="none" />
        
        {/* Altcoin Nodes */}
        <circle cx="25" cy="25" r="3" fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <circle cx="75" cy="30" r="3" fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <circle cx="80" cy="70" r="3" fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <circle cx="30" cy="75" r="3" fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

        {/* Inner dots */}
        <circle cx="25" cy="25" r="1" fill="currentColor" stroke="none" />
        <circle cx="75" cy="30" r="1" fill="currentColor" stroke="none" />
        <circle cx="80" cy="70" r="1" fill="currentColor" stroke="none" />
        <circle cx="30" cy="75" r="1" fill="currentColor" stroke="none" />
      </svg>
    </FloatingAsset>
  );
}
