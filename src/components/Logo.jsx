import React from 'react';

export const AmkoLogo = ({ size = 'md', showTagline = true, variant = 'light' }) => {
  const heights = { sm: 32, md: 48, lg: 72, xl: 96 };
  const h = heights[size] || heights.md;
  const w = h * 2.4;

  return (
    <svg viewBox="0 0 480 200" width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="amkoDrop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FFD93D" />
          <stop offset="35%"  stopColor="#FFA726" />
          <stop offset="70%"  stopColor="#FB8C00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="amkoGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#7CB342" />
          <stop offset="100%" stopColor="#558B2F" />
        </linearGradient>
        <radialGradient id="amkoSphere" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#AED581" />
          <stop offset="60%"  stopColor="#7CB342" />
          <stop offset="100%" stopColor="#33691E" />
        </radialGradient>
      </defs>

      {/* A */}
      <path d="M 30 130 L 70 30 L 95 30 L 135 130 L 110 130 L 102 108 L 63 108 L 55 130 Z M 72 88 L 93 88 L 82.5 58 Z"
        fill="url(#amkoGreen)" />
      {/* M */}
      <path d="M 150 130 L 150 30 L 178 30 L 200 80 L 222 30 L 250 30 L 250 130 L 228 130 L 228 70 L 210 110 L 190 110 L 172 70 L 172 130 Z"
        fill="url(#amkoGreen)" />
      {/* K */}
      <path d="M 268 130 L 268 30 L 290 30 L 290 70 L 325 30 L 354 30 L 312 76 L 358 130 L 327 130 L 290 86 L 290 130 Z"
        fill="url(#amkoGreen)" />

      {/* Drop O */}
      <path d="M 410 25 C 410 25, 380 60, 372 90 C 366 112, 372 138, 392 152 C 412 166, 438 162, 450 144 C 462 126, 458 102, 448 82 C 438 62, 425 42, 410 25 Z"
        fill="url(#amkoDrop)" />
      <circle cx="408" cy="105" r="28" fill="url(#amkoSphere)" opacity="0.95" />
      <path d="M 392 95 Q 398 92 405 96 Q 412 100 418 95 M 388 108 Q 395 112 405 110 Q 415 108 422 113 M 394 122 Q 402 124 410 121"
        stroke="#33691E" strokeWidth="1.8" fill="none" opacity="0.6" strokeLinecap="round" />
      <ellipse cx="438" cy="55" rx="8" ry="14" fill="#FFFFFF" opacity="0.5" transform="rotate(-25 438 55)" />

      <text x="190" y="172" textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="26" letterSpacing="6"
        fill={variant === 'dark' ? '#FFFFFF' : '#9E9E9E'}>
        {showTagline ? 'TRADING' : ''}
      </text>
      {showTagline && (
        <line x1="100" y1="185" x2="280" y2="185"
          stroke={variant === 'dark' ? '#FFFFFF' : '#BDBDBD'} strokeWidth="1.5" opacity="0.6" />
      )}
    </svg>
  );
};
