// GOOGLE AI STUDIO REAL FILE WRITE ACTIVE - CHECKMARK TEST PASSED
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles.css';
import './styles/journey-polish.css';
import './styles/mobile-layout.css';

window.addEventListener('unhandledrejection', event => { event.preventDefault(); console.error(event.reason); window.dispatchEvent(new Event('app-operation-error')); });
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
