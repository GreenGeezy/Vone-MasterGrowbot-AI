// GOOGLE AI STUDIO REAL FILE WRITE ACTIVE - CHECKMARK TEST PASSED
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Show any crash visibly on screen instead of silent blank page
window.addEventListener('error', (e) => {
  document.body.innerHTML = `<div style="padding:20px;font-family:monospace;background:#fee;color:#900;white-space:pre-wrap;font-size:13px"><b>CRASH:</b> ${e.message}<br/><br/>${e.filename}:${e.lineno}<br/><br/>${e.error?.stack || ''}</div>`;
});
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML = `<div style="padding:20px;font-family:monospace;background:#fee;color:#900;white-space:pre-wrap;font-size:13px"><b>UNHANDLED PROMISE REJECTION:</b><br/><br/>${e.reason?.stack || e.reason}</div>`;
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
