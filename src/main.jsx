import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TradingPlatform from './TradingPlatform.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TradingPlatform />
  </StrictMode>
);
