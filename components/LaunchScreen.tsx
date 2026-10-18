import React from 'react';

/** Shown during the initial paint. No artificial loading delay or network dependency. */
export default function LaunchScreen() {
  return <div className="app-launch" role="status" aria-label="Opening MasterGrowbot">
    <img className="app-launch-art" src="/assets/V13MasterGrowbotWelcome.png" width="1536" height="1024" alt="A smiling grower high-fiving Growbot in a bright grow studio"/>
    <p className="app-launch-brand">MasterGrowbot <span>AI</span></p>
    <h1>Grow with confidence.</h1>
    <p>Your grow coach for plant checks and clear next steps.</p>
  </div>;
}
