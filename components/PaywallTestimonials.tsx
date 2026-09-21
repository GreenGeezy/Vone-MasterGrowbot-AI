import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';

// Existing onboarding and summary quotes, reproduced without adding claims.
const quotes = [
  { name: 'Jake M.', text: 'Caught a magnesium deficiency before it wrecked my whole crop.' },
  { name: 'Sarah K.', text: 'As a first-time grower I was totally lost. MasterGrowbot walked me through everything.' },
  { name: 'Tom R.', text: 'My best harvests have been since using this app. The AI is spot-on.' },
  { name: 'Alex D.', text: 'Helped me diagnose an issue in seconds that would have taken me days to figure out.' },
  { name: 'Jake M.', text: 'Caught a magnesium deficiency before it wrecked my whole crop. The AI diagnosis was spot-on.' },
  { name: 'Sarah K.', text: 'As a first-time grower I was totally lost. MasterGrowbot walked me through everything step by step.' },
  { name: 'Tom R.', text: 'The daily reminders and grow journal keep me on track. My best harvests have been since using this app.' },
];

export default function PaywallTestimonials({ dark = false }: { dark?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (paused || interacting || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex(value => (value + 1) % quotes.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reducedMotion]);
  const move = (direction: number) => { setPaused(true); setIndex(value => (value + direction + quotes.length) % quotes.length); };
  return <section aria-label="MasterGrowbot user testimonials" aria-roledescription="carousel"
    className={`mt-4 rounded-2xl border p-3 ${dark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setInteracting(false); }}
    onTouchStart={event => { touch.current = event.touches[0].clientX; }}
    onTouchEnd={event => { if (touch.current !== null) { const delta = event.changedTouches[0].clientX - touch.current; if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1); } touch.current = null; }}>
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className={`text-[10px] font-bold tracking-wide ${dark ? 'text-slate-300' : 'text-slate-500'}`}>MASTERGROWBOT USER FEEDBACK</p>
      <span className="flex text-amber-500" aria-label="5 stars">{[0,1,2,3,4].map(i => <Star key={i} size={11} fill="currentColor" aria-hidden="true" />)}</span>
    </div>
    <blockquote className="h-20 overflow-y-auto text-xs leading-5" aria-live="off">“{quotes[index].text}”</blockquote>
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold">{quotes[index].name} <span className="font-normal opacity-70">· {index + 1}/{quotes.length}</span></p>
      <div className="flex">
        <button type="button" aria-label="Previous testimonial" className="min-w-11 min-h-11 flex items-center justify-center" onClick={() => move(-1)}><ChevronLeft size={17}/></button>
        {!reducedMotion && <button type="button" aria-label={paused ? 'Resume testimonials' : 'Pause testimonials'} className="min-w-11 min-h-11 flex items-center justify-center" onClick={() => setPaused(value => !value)}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>}
        <button type="button" aria-label="Next testimonial" className="min-w-11 min-h-11 flex items-center justify-center" onClick={() => move(1)}><ChevronRight size={17}/></button>
      </div>
    </div>
    {dark && <p className="text-[10px] text-slate-400">Feedback about MasterGrowbot, not specifically Premium.</p>}
  </section>;
}
