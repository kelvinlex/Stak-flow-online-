import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handlers to catch and log unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  // Ignore benign Vite HMR errors
  if (event.reason?.message?.includes('WebSocket')) return;
  console.error('Unhandled Rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
