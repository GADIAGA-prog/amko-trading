import React from 'react';

// Logo officiel AMKO TRADING — reproduction SVG :
// « AMK » vert pomme (jambe gauche du A en dégradé flamme), le « O » est une
// flamme orange/jaune contenant une sphère verte à bulles, « TRADING » gris.
export const AmkoLogo = ({ size = 'md', showTagline = true, variant = 'light' }) => {
  const heights = { sm: 32, md: 48, lg: 72, xl: 96 };
  const h = heights[size] || heights.md;
  const w = h * 2.4;

  return (
    <svg viewBox="0 0 480 200" width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="amkoFlame" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="#FDB913" />
          <stop offset="45%"  stopColor="#F7941D" />
          <stop offset="100%" stopColor="#F26522" />
        </linearGradient>
        <linearGradient id="amkoAStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#FDB913" />
          <stop offset="100%" stopColor="#F26522" />
        </linearGradient>
        <linearGradient id="amkoGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#97CE3E" />
          <stop offset="100%" stopColor="#7CBB33" />
        </linearGradient>
        <radialGradient id="amkoSphere" cx="35%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#C5E86C" />
          <stop offset="55%"  stopColor="#8DC63F" />
          <stop offset="100%" stopColor="#4E7D1E" />
        </radialGradient>
      </defs>

      {/* A — corps vert */}
      <path d="M 30 130 L 70 30 L 95 30 L 135 130 L 110 130 L 102 108 L 63 108 L 55 130 Z M 72 88 L 93 88 L 82.5 58 Z"
        fill="url(#amkoGreen)" />
      {/* A — jambe gauche en dégradé flamme (signature du logo) */}
      <path d="M 30 130 L 70 30 L 84 30 L 48 130 Z" fill="url(#amkoAStroke)" />

      {/* M */}
      <path d="M 150 130 L 150 30 L 178 30 L 200 80 L 222 30 L 250 30 L 250 130 L 228 130 L 228 70 L 210 110 L 190 110 L 172 70 L 172 130 Z"
        fill="url(#amkoGreen)" />
      {/* K */}
      <path d="M 268 130 L 268 30 L 290 30 L 290 70 L 325 30 L 354 30 L 312 76 L 358 130 L 327 130 L 290 86 L 290 130 Z"
        fill="url(#amkoGreen)" />

      {/* O — flamme (pointe recourbée en haut à droite) */}
      <path d="M 414 14
               C 402 44 374 68 368 98
               C 362 128 378 154 407 158
               C 436 162 458 142 458 115
               C 458 99 450 88 452 70
               C 458 74 462 80 464 88
               C 468 62 452 48 440 40
               C 432 32 422 24 414 14 Z"
        fill="url(#amkoFlame)" />
      {/* Sphère verte à bulles */}
      <circle cx="409" cy="113" r="30" fill="url(#amkoSphere)" />
      <circle cx="400" cy="103" r="7"  fill="#D9F09A" opacity="0.9" />
      <circle cx="417" cy="119" r="9"  fill="#A9D65C" opacity="0.85" />
      <circle cx="403" cy="124" r="4.5" fill="#C5E86C" opacity="0.9" />
      <ellipse cx="398" cy="98" rx="10" ry="6" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 398 98)" />
      {/* Reflet sur la flamme */}
      <ellipse cx="440" cy="60" rx="6" ry="12" fill="#FFFFFF" opacity="0.4" transform="rotate(-22 440 60)" />

      {/* TRADING */}
      {showTagline && (
        <text x="195" y="172" textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="27" letterSpacing="9"
          fill={variant === 'dark' ? '#E2E8F0' : '#939598'}>
          TRADING
        </text>
      )}
    </svg>
  );
};
