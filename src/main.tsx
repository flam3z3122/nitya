import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { InstallBanner } from '@/components/InstallBanner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstallBanner />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
