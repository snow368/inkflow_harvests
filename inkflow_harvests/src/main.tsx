import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary';
import './index.css';

// Global error listener for JSON SyntaxErrors
window.addEventListener('error', (event) => {
  if (event.error instanceof SyntaxError && event.error.message.includes('JSON')) {
    console.group('🚨 UNCAUGHT JSON ERROR DETECTED');
    console.error('Message:', event.error.message);
    console.error('Stack:', event.error.stack);
    console.groupEnd();
  }
});

// Catch async (unhandled promise) rejections so they don't fail silently.
window.addEventListener('unhandledrejection', (event) => {
  console.group('🚨 UNHANDLED PROMISE REJECTION');
  console.error('Reason:', event.reason);
  console.groupEnd();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
