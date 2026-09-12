import React from 'react';
import { Activity, Eye, Scale, Wind, Save, Share2, RefreshCw } from 'lucide-react';
import type { VideoVisualResult } from '../services/videoVisualResult';

interface Props {
  result: VideoVisualResult;
  thumbnail: string | null;
  onSave: () => void;
  onShare: () => void;
  onNew: () => void;
}

/** Presentation only: preserves the existing validated video observations. */
export default function VideoHealthReport({ result, thumbnail, onSave, onShare, onNew }: Props) {
  const tone = result.severity === 'high' ? 'text-red-600' : result.severity === 'medium' ? 'text-amber-700' : 'text-emerald-700';
  return <article className="max-w-lg mx-auto space-y-5 text-slate-800" data-testid="video-result">
    <header>
      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800"><Activity size={15} /> Video health report</p>
      <h3 className={`text-3xl font-black leading-tight mt-3 ${tone}`}>{result.healthLabel}</h3>
    </header>
    {thumbnail && <img src={thumbnail} alt="Your analyzed video frame" className="w-full max-h-64 object-contain rounded-3xl bg-slate-950 shadow-sm" />}
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-white border border-purple-100 p-4 text-center shadow-sm"><Scale className="text-purple-500 mx-auto mb-2" size={22} /><p className="text-xs font-bold uppercase text-slate-500">Plant score</p><p className="text-2xl font-black mt-1">{Math.round(result.healthScore)}<span className="text-sm text-slate-500"> / 100</span></p><p className="text-xs text-slate-500 mt-1">AI visual estimate</p></div>
      <div className="rounded-2xl bg-white border border-emerald-100 p-4 text-center shadow-sm"><Eye className="text-emerald-600 mx-auto mb-2" size={22} /><p className="text-xs font-bold uppercase text-slate-500">Visible condition</p><p className="text-sm font-bold mt-2">{result.healthLabel}</p></div>
    </div>
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100"><h4 className="font-black mb-3">Summary</h4><p className="text-sm leading-relaxed">{result.visualSummary}</p></section>
    <section className="rounded-3xl bg-emerald-700 text-white p-5 shadow-sm"><h4 className="text-xs uppercase tracking-wide font-black mb-3">Next visual check</h4><p className="font-semibold leading-relaxed">{result.recommendedVerification}</p></section>
    {[
      ['Visible observations', result.visibleSigns],
      ['Possible explanations', result.possibleInterpretations],
      ['Areas to review', result.areasToInspect],
    ].map(([title, items]) => <section key={title as string} className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm"><h4 className="font-black mb-3">{title as string}</h4><ul className="space-y-3">{(items as string[]).map((item, index) => <li key={index} className="flex gap-3 text-sm leading-relaxed"><span className="text-emerald-600" aria-hidden="true">•</span>{item}</li>)}</ul>{!(items as string[]).length && <p className="text-sm text-slate-500">No specific observations returned.</p>}</section>)}
    <section className="rounded-3xl bg-white p-5 border border-emerald-100 shadow-sm"><h4 className="flex gap-2 items-center font-black mb-3"><Wind size={20} className="text-emerald-600" /> Environment overview</h4><p className="text-sm leading-relaxed">{result.environmentSummary}</p><p className="text-xs text-slate-500 mt-3">Visible context only. Temperature, humidity and other measurements are not inferred from video.</p></section>
    <div className="grid grid-cols-2 gap-3"><button onClick={onSave} className="rounded-2xl bg-slate-900 text-white py-4 font-bold text-sm"><Save size={18} className="inline mr-2" />Save to Journal</button><button onClick={onShare} className="rounded-2xl bg-emerald-100 text-emerald-900 py-4 font-bold text-sm"><Share2 size={18} className="inline mr-2" />Share Analysis</button></div>
    <button onClick={onNew} className="w-full rounded-2xl border border-slate-200 bg-white py-4 font-bold text-sm"><RefreshCw size={16} className="inline mr-2" />Analyze another video</button>
  </article>;
}
