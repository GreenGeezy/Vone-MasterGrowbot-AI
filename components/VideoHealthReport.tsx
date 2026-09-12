import React from 'react';
import {
  Activity, CalendarPlus, Eye, Gauge, Leaf, ListChecks, RefreshCw,
  Save, ScanSearch, Share2, Sprout, Wind,
} from 'lucide-react';
import type { VideoVisualResult } from '../services/videoVisualResult';

interface Props {
  result: VideoVisualResult;
  thumbnail: string | null;
  onSave: () => void;
  onShare: () => void;
  onNew: () => void;
  onAddTask?: (task: string) => void;
}

const BulletList = ({ items }: { items: string[] }) => items.length ? (
  <ul className="space-y-3">
    {items.map((item, index) => (
      <li key={index} className="flex gap-3 text-sm leading-relaxed">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
) : <p className="text-sm text-slate-500">No specific observations returned.</p>;

export default function VideoHealthReport({ result, thumbnail, onSave, onShare, onNew, onAddTask }: Props) {
  const tone = result.severity === 'high' ? 'text-red-600' : result.severity === 'medium' ? 'text-amber-700' : 'text-emerald-700';

  return (
    <article className="max-w-lg mx-auto space-y-5 text-slate-800" data-testid="video-result">
      <header>
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
          <Activity size={15} /> Video plant health report
        </p>
        <h3 className={`text-3xl font-black leading-tight mt-3 ${tone}`}>{result.healthLabel}</h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Visible stage: {result.growthStage}</p>
      </header>

      {thumbnail && <img src={thumbnail} alt="Frame from your analyzed plant video" className="w-full max-h-64 object-contain rounded-3xl bg-slate-950 shadow-sm" />}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-purple-100 p-4 text-center shadow-sm">
          <Leaf className="text-purple-500 mx-auto mb-2" size={22} />
          <p className="text-xs font-bold uppercase text-slate-500">Plant score</p>
          <p className="text-2xl font-black mt-1">{Math.round(result.healthScore)}<span className="text-sm text-slate-500"> / 100</span></p>
          <p className="text-xs text-slate-500 mt-1">AI visual estimate</p>
        </div>
        <div className="rounded-2xl bg-white border border-cyan-100 p-4 text-center shadow-sm">
          <Gauge className="text-cyan-600 mx-auto mb-2" size={22} />
          <p className="text-xs font-bold uppercase text-slate-500">Confidence</p>
          <p className="text-2xl font-black mt-1">{Math.round(result.confidence)}<span className="text-sm text-slate-500">%</span></p>
          <p className="text-xs text-slate-500 mt-1">Based on video clarity</p>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <h4 className="flex items-center gap-2 font-black mb-3"><Eye size={19} className="text-emerald-600" /> Overall visual condition</h4>
        <p className="text-sm leading-relaxed">{result.visualSummary}</p>
      </section>

      <section className="rounded-3xl bg-emerald-700 text-white p-5 shadow-sm" data-testid="video-priority-action">
        <p className="text-xs uppercase tracking-widest font-black text-emerald-100">Priority action</p>
        <p className="font-bold leading-relaxed mt-3">{result.priorityAction}</p>
        {onAddTask && (
          <button onClick={() => onAddTask(result.priorityAction)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-800">
            <CalendarPlus size={16} /> Add to today's plan
          </button>
        )}
      </section>

      <section className="rounded-3xl bg-emerald-50 p-5 border border-emerald-100 shadow-sm" data-testid="video-care-plan">
        <h4 className="flex items-center gap-2 font-black mb-1"><ListChecks size={20} className="text-emerald-700" /> Plant care and quality checks</h4>
        <p className="text-xs text-slate-500 mb-4">Practical follow-ups based on visible evidence. Add any step to your journal plan.</p>
        <div className="space-y-3">
          {result.careRecommendations.map((item, index) => (
            <div key={index} className="rounded-2xl bg-white border border-emerald-100 p-3 flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              <p className="flex-1 text-sm font-semibold leading-relaxed">{item}</p>
              {onAddTask && <button onClick={() => onAddTask(item)} aria-label={`Add recommendation to today's plan: ${item}`} className="shrink-0 rounded-lg bg-emerald-100 p-2 text-emerald-800"><CalendarPlus size={15} /></button>}
            </div>
          ))}
        </div>
      </section>

      {[
        ['Key visible observations', result.visibleSigns],
        ['Possible interpretations', result.possibleInterpretations],
        ['Areas to inspect more closely', result.areasToInspect],
      ].map(([title, items]) => (
        <section key={title as string} className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
          <h4 className="font-black mb-3">{title as string}</h4>
          <BulletList items={items as string[]} />
        </section>
      ))}

      <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm" data-testid="video-grow-overview">
        <h4 className="flex items-center gap-2 font-black mb-3"><Sprout size={20} className="text-emerald-300" /> Grow-wide overview</h4>
        <p className="text-sm leading-relaxed text-slate-100">{result.growOverview}</p>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-300">Canopy and room checks</p>
          <BulletList items={result.growWideChecks} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 border border-emerald-100 shadow-sm">
        <h4 className="flex gap-2 items-center font-black mb-3"><Wind size={20} className="text-emerald-600" /> Environment visible in video</h4>
        <p className="text-sm leading-relaxed">{result.environmentSummary}</p>
        <p className="text-xs text-slate-500 mt-3">Visible context only. Temperature, humidity, airflow, and other measurements are not inferred without sensor data.</p>
      </section>

      <section className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
        <h4 className="flex gap-2 items-center font-black mb-3"><ScanSearch size={20} className="text-slate-500" /> Media quality and next check</h4>
        <p className="text-sm leading-relaxed">{result.mediaQuality}</p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Suggested next visual check</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">{result.recommendedVerification}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onSave} className="rounded-2xl bg-slate-900 text-white py-4 font-bold text-sm"><Save size={18} className="inline mr-2" />Save to Journal</button>
        <button onClick={onShare} className="rounded-2xl bg-emerald-100 text-emerald-900 py-4 font-bold text-sm"><Share2 size={18} className="inline mr-2" />Share Analysis</button>
      </div>
      <button onClick={onNew} className="w-full rounded-2xl border border-slate-200 bg-white py-4 font-bold text-sm"><RefreshCw size={16} className="inline mr-2" />Analyze another video</button>
    </article>
  );
}
