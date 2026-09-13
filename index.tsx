import './styles.css';
// GOOGLE AI STUDIO REAL FILE WRITE ACTIVE - CHECKMARK TEST PASSED
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Render errors are handled by ErrorBoundary. A rejected background operation
// must never replace the React root or expose raw provider text as HTML.
window.addEventListener('error', event => console.error('App error', event.error));
window.addEventListener('unhandledrejection', event => {
  event.preventDefault();
  console.error('Background operation failed', event.reason);
  window.dispatchEvent(new Event('app-operation-error'));
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
