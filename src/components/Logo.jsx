import React from 'react';

// Vector identity; keep the export name compatible with existing integrations.
export const AmkoLogo = ({ size = 'md', showTagline = true, variant = 'light' }) => {
  const widths = { sm: 160, md: 208, lg: 280, xl: 340 };
  const ink = variant === 'dark' ? '#F5F1E8' : '#102332';
  return (
    <svg viewBox="0 0 420 112" width={widths[size] || widths.md} role="img"
      aria-label="PETROLEUM PRODUCTS TRADING" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
      <rect x="2" y="12" width="84" height="84" rx="22" fill="#102332" stroke="#B99A55" strokeWidth="1.5" />
      <path d="M44 25C39 35 25 47 25 60a19 19 0 0 0 38 0C63 47 49 35 44 25Z" fill="#B99A55" />
      <path d="M32 64L43 53l8 6 12-14M53 45h10v10" fill="none" stroke="#102332" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="104" y="43" fill={ink} fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="28" letterSpacing="2">PETROLEUM</text>
      <text x="104" y="72" fill={ink} fontFamily="Arial, Helvetica, sans-serif" fontWeight="500" fontSize="25" letterSpacing="4.3">PRODUCTS</text>
      {showTagline && <text x="105" y="96" fill={variant === 'dark' ? '#D5BE87' : '#806328'} fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="600" letterSpacing="7.8">TRADING</text>}
    </svg>
  );
};
