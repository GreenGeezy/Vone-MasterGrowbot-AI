import React, { useEffect, useState } from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import sample from '../data/sampleReport.json';

/** Whole-plant example: every word shown comes from the existing sample report. */
export default function WelcomeHero({ onSeeReport }: { onSeeReport?: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setReady(true); return; }
    const timer = setTimeout(() => setReady(true), 2600);
    return () => clearTimeout(timer);
  }, []);
  return <section className="welcome-hero" aria-label="Example plant health report">
    <img src="/images/V5MasterGrowbotExamplePlant.jpg" alt="Flowering cannabis plant with yellowing fan leaves" />
    <span className="welcome-example">Example</span>
    {!ready && <><div className="sample-scan" aria-hidden="true" /><span className="welcome-status" role="status">Reviewing the example photo…</span></>}
    {ready && <button type="button" className="welcome-result" onClick={onSeeReport} aria-label="Open the full example report">
      <span className="welcome-score" aria-label={`AI health score ${sample.healthScore} out of 100`}><strong>{sample.healthScore}</strong><small>/100</small></span>
      <span className="welcome-result-copy">
        <strong>{sample.healthLabel} · {sample.growthStage}</strong>
        <span>{sample.diagnosis}</span>
        <em><Lightbulb size={13} aria-hidden="true" />{sample.fixSteps[0]}</em>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>}
  </section>;
}
