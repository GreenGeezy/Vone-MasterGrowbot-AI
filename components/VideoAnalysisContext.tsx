import React, { useState } from 'react';
import { STRAIN_DATABASE } from '../data/strains';

type GrowMethod = 'Indoor' | 'Outdoor' | 'Greenhouse';

interface Props {
  strain: string;
  onStrainChange: (strain: string) => void;
  growMethod: GrowMethod;
  onGrowMethodChange: (method: GrowMethod) => void;
}

const VideoAnalysisContext: React.FC<Props> = ({ strain, onStrainChange, growMethod, onGrowMethodChange }) => {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const isKnown = strain === 'Generic' || STRAIN_DATABASE.some(item => item.name === strain);

  return (
    <section data-testid="video-analysis-context" className="max-w-md mx-auto mb-5 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Personalize your report</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">Add your setup and strain so the analysis can prioritize more relevant visual patterns and next steps.</p>
      </div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Growing environment</label>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1" data-testid="video-grow-method">
        {(['Indoor', 'Outdoor', 'Greenhouse'] as const).map(environment => (
          <button key={environment} type="button" onClick={() => onGrowMethodChange(environment)} aria-pressed={growMethod === environment}
            className={`min-h-10 rounded-lg px-1 text-[10px] font-black uppercase transition-all ${growMethod === environment ? 'bg-emerald-400 text-slate-950 shadow-sm' : 'text-slate-400'}`}>
            {environment}
          </button>
        ))}
      </div>
      <label htmlFor="video-strain" className="mt-4 block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Strain</label>
      <select id="video-strain" data-testid="video-strain-select" value={customMode ? '__custom__' : strain}
        onChange={event => {
          if (event.target.value === '__custom__') {
            setCustomMode(true);
            setCustomName(isKnown ? '' : strain);
            onStrainChange('');
          } else {
            setCustomMode(false);
            onStrainChange(event.target.value);
          }
        }}
        className="w-full min-h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-bold text-white outline-none focus:border-emerald-400">
        <option value="Generic">Generic / not specified</option>
        {!isKnown && strain && <option value={strain}>{strain}</option>}
        {STRAIN_DATABASE.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
        <option value="__custom__">Add a custom strain…</option>
      </select>
      {customMode && (
        <div className="mt-3 flex gap-2">
          <input value={customName} onChange={event => setCustomName(event.target.value.slice(0, 80))}
            placeholder="Custom strain name" aria-label="Custom strain name"
            className="min-w-0 min-h-12 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-400" />
          <button type="button" disabled={!customName.trim()} onClick={() => { onStrainChange(customName.trim()); setCustomMode(false); }}
            className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40">Use</button>
        </div>
      )}
    </section>
  );
};

export default VideoAnalysisContext;
