import React from 'react';

/** Shown during the initial paint: app logo and brand text, no artificial delay or network dependency. */
export default function LaunchScreen() {
  return <div className="app-launch" role="status" aria-label="Opening MasterGrowbot">
    <img className="app-launch-logo" src="/assets/app-logo.png" width="120" height="120" alt=""/>
    <p className="app-launch-brand">MasterGrowbot <span>AI</span></p>
    <h1>Grow with confidence.</h1>
    <p>Your grow coach for plant checks and clear next steps.</p>
  </div>;
}
