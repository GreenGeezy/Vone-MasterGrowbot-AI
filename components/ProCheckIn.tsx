import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { recordEvent } from '../services/conversionEvents';
import { buildGrowPlan, PLAN_MILESTONES } from '../services/growPlan';

const DONE_KEY = 'mg_grow_plan_done';
const DISMISS_KEY = 'mg_grow_plan_dismissed_v2';

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const min = Math.min(...scores) - 4, max = Math.max(...scores) + 4, span = Math.max(1, max - min);
  const points = scores.map((score, i) => `${(i / (scores.length - 1)) * 96 + 2},${38 - ((score - min) / span) * 34}`);
  const [lastX, lastY] = points[points.length - 1].split(',');
  return <svg className="grow-plan-spark" viewBox="0 0 100 42" aria-hidden="true"><polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx={lastX} cy={lastY} r="3.5" fill="currentColor" /></svg>;
}

/** 7-day grow plan: gives a new grower one clear reason to come back each day. In-app only, no notifications. */
export default function ProCheckIn({ plants, onAddPlant, onOpenJournal, onNavigateToPlant, onCheckPhoto }: any) {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; } });
  const plan = buildGrowPlan(plants);
  const done = plan.started ? plan.done : 0;
  useEffect(() => {
    try {
      const recorded = Number(localStorage.getItem(DONE_KEY)) || 0;
      if (done > recorded) { localStorage.setItem(DONE_KEY, String(done)); recordEvent('checklist_step', 'home', { step: String(done) }); }
    } catch { /* Analytics never blocks the plan. */ }
  }, [done]);
  const checkIn = () => (plants.length ? (onCheckPhoto || onOpenJournal) : onAddPlant)();
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* Hidden for this session. */ } setDismissed(true); };
  const track = <ol className="grow-plan-track" aria-label={`${done} of ${PLAN_MILESTONES.length} check-ins saved`}>
    {PLAN_MILESTONES.map((milestone, i) => <li key={milestone.day} className={i < done ? 'is-done' : i === done ? 'is-next' : ''}><span>{i < done ? <Check size={13} aria-hidden="true" /> : milestone.day}</span><small>Day {milestone.day}</small></li>)}
  </ol>;

  if (dismissed) return null;
  if (!plan.started) return <section className="grow-plan mb-5" data-testid="grow-plan" aria-label="7-day grow plan">
    <p className="grow-plan-eyebrow">7-DAY GROW PLAN</p>
    <h2>Follow one plant for 7 days.</h2>
    <p className="grow-plan-note">Five quick photo check-ins. Watch its health score change and know what to check next.</p>
    {track}
    <button type="button" className="grow-plan-action" onClick={checkIn}>Start with a photo check-in <ArrowRight size={17} aria-hidden="true" /></button>
  </section>;

  const first = plan.checks[0], last = plan.checks[plan.checks.length - 1];
  const TrendIcon = plan.trend === 'improving' ? TrendingUp : plan.trend === 'needs attention' ? TrendingDown : Minus;
  const heading = plan.complete ? 'Your 7-day progress report' : plan.checkedToday ? 'Done for today.' : plan.next!.title;
  return <section className="grow-plan mb-5" data-testid="grow-plan" aria-label="7-day grow plan">
    <div className="grow-plan-head">
      <div className="min-w-0"><p className="grow-plan-eyebrow">{plan.complete ? '7-DAY GROW PLAN · COMPLETE' : `7-DAY GROW PLAN · DAY ${Math.min(plan.day, 7)}`}</p><h2>{heading}</h2><p className="grow-plan-plant">{plan.plantName}</p></div>
      {plan.complete && <button aria-label="Hide grow plan" className="grow-plan-close" onClick={dismiss}>×</button>}
    </div>
    <div className={`grow-plan-score ${plan.trend === 'needs attention' ? 'is-down' : ''}`}>
      <div><strong>{last.score}</strong><small>/100 health score</small></div>
      {plan.done > 1
        ? <p><TrendIcon size={16} aria-hidden="true" /> {plan.delta > 0 ? '+' : ''}{plan.delta} since day 1 · {plan.trend}</p>
        : <p>Your starting score. Re-check to see it move.</p>}
      <Sparkline scores={plan.checks.map(check => check.score)} />
    </div>
    {track}
    {plan.complete
      ? <><div className="grow-plan-compare">{[first, last].map((check, i) => <figure key={i}>{check.image ? <img src={check.image} alt={i ? 'Latest check-in photo' : 'First check-in photo'} /> : <div aria-hidden="true" />}<figcaption>{i ? 'Latest' : 'Day 1'} · {check.score}/100</figcaption></figure>)}</div>
        <p className="grow-plan-note">Five check-ins saved. Keep checking in every few days to follow this plant to harvest.</p>
        <button type="button" className="grow-plan-action" onClick={checkIn}>Check in again <ArrowRight size={17} aria-hidden="true" /></button></>
      : plan.checkedToday
        ? <><p className="grow-plan-note"><strong>Tomorrow: {plan.next!.title}</strong> {plan.next!.detail}</p>
          {last.topAction && <p className="grow-plan-today"><span>DO TODAY</span>{last.topAction}</p>}
          <button type="button" className="grow-plan-secondary" onClick={() => { recordEvent('followup_visit', 'home'); onNavigateToPlant ? onNavigateToPlant(plan.plantId) : onOpenJournal(); }}>Open this plant's journal</button></>
        : <><p className="grow-plan-note">{plan.next!.detail}</p>
          <button type="button" className="grow-plan-action" onClick={() => { recordEvent('followup_visit', 'home'); checkIn(); }}>Check in now <ArrowRight size={17} aria-hidden="true" /></button></>}
  </section>;
}
