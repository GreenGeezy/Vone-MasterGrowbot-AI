import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle, AlertTriangle, Info, TrendingUp } from 'lucide-react';

interface ScanResultsProps {
  result: any; // ExtendedDiagnosisResult from geminiService
  imageDataUrl: string;
  onNext: () => void;
}

const SeverityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Mild Issue' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Moderate Issue' },
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Severe Issue' },
};

const ScanResults: React.FC<ScanResultsProps> = ({ result, imageDataUrl, onNext }) => {
  const [shownSteps, setShownSteps] = useState(0);

  useEffect(() => {
    const steps = result?.fixSteps?.length || 0;
    if (steps === 0) return;
    const interval = setInterval(() => {
      setShownSteps(prev => {
        if (prev >= steps) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [result]);

  const severity = result?.severity || 'low';
  const sev = SeverityConfig[severity] || SeverityConfig.low;

  // If healthScore is 80+, treat as "healthy"
  const isHealthy = (result?.healthScore || 0) >= 80 && severity === 'low';
  const displaySev = isHealthy
    ? { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Healthy' }
    : sev;

  const healthScore = result?.healthScore ? Math.floor(result.healthScore) : null;

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col font-sans">
      {/* Image header */}
      <div className="relative h-64 flex-shrink-0">
        <img src={imageDataUrl} className="w-full h-full object-cover" alt="Scanned plant" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/40 to-transparent" />

        {/* Severity badge */}
        <div className={`absolute top-12 left-6 ${displaySev.bg} ${displaySev.border} border backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2`}>
          {isHealthy ? (
            <CheckCircle size={14} className={displaySev.color} />
          ) : (
            <AlertTriangle size={14} className={displaySev.color} />
          )}
          <span className={`text-xs font-black ${displaySev.color} uppercase tracking-wider`}>{displaySev.label}</span>
        </div>

        {/* Success label */}
        <div className="absolute bottom-4 left-6 right-6">
          <div className="bg-[#059669] text-white text-[10px] font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-2 shadow-lg shadow-[#059669]/40">
            <CheckCircle size={10} />
            AI SCAN COMPLETE
          </div>
          <h2 className="text-2xl font-black text-white leading-tight">
            {result?.diagnosis || 'Analysis Complete'}
          </h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 my-5">
          {healthScore !== null && (
            <div className={`${displaySev.bg} border ${displaySev.border} rounded-2xl p-3 text-center`}>
              <div className={`text-2xl font-black ${displaySev.color}`}>{healthScore}</div>
              <div className="text-white/40 text-[10px] font-bold uppercase mt-0.5">Health Score</div>
            </div>
          )}
          {result?.harvestWindow && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-white font-black text-sm leading-tight">{result.harvestWindow}</div>
              <div className="text-white/40 text-[10px] font-bold uppercase mt-0.5">Harvest</div>
            </div>
          )}
          {result?.nutrientTargets?.ec && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-white font-black text-sm leading-tight">{result.nutrientTargets.ec}</div>
              <div className="text-white/40 text-[10px] font-bold uppercase mt-0.5">EC Target</div>
            </div>
          )}
        </div>

        {/* Priority action */}
        {result?.topAction && (
          <div className={`${displaySev.bg} border ${displaySev.border} rounded-2xl p-4 mb-5`}>
            <div className={`text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${displaySev.color}`}>
              <TrendingUp size={12} /> Priority Action
            </div>
            <p className="text-white font-semibold text-sm leading-relaxed">{result.topAction}</p>
          </div>
        )}

        {/* Fix steps */}
        {result?.fixSteps?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-white/60 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle size={12} className="text-[#059669]" /> Fix Steps
            </h3>
            <div className="space-y-2">
              {result.fixSteps.map((step: string, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3 transition-all duration-500 ${
                    i < shownSteps ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#059669]/20 border border-[#059669]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#059669] text-[9px] font-black">{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prevention tips */}
        {result?.preventionTips?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-white/60 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info size={12} className="text-blue-400" /> Prevention Tips
            </h3>
            <div className="space-y-2">
              {result.preventionTips.slice(0, 3).map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <p className="text-white/60 text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#0A1628] via-[#0A1628] to-transparent">
        <button
          onClick={onNext}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-2xl shadow-[#059669]/40"
        >
          Amazing! What's Next? <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default ScanResults;
