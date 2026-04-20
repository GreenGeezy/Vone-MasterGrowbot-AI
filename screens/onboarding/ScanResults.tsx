import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle, AlertTriangle, Info, TrendingUp } from 'lucide-react';

interface ScanResultsProps {
  result: any; // ExtendedDiagnosisResult from geminiService
  imageDataUrl: string;
  onNext: () => void;
}

const SeverityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  low:    { color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', label: 'Mild Issue' },
  medium: { color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   label: 'Moderate Issue' },
  high:   { color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     label: 'Severe Issue' },
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

  const isHealthy = (result?.healthScore || 0) >= 80 && severity === 'low';
  const displaySev = isHealthy
    ? { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Healthy' }
    : sev;

  const healthScore = result?.healthScore ? Math.floor(result.healthScore) : null;

  // Never show bare "N/A" to the user — translate stage into an actionable
  // harvest-timing hint so the card always carries useful info.
  const getHarvestDisplay = (): string => {
    const raw: string = (result?.harvestWindow || '').toString().trim();
    const stage: string = (result?.growthStage || '').toString();
    const lower = raw.toLowerCase();
    if (raw && lower !== 'n/a' && !lower.includes('insufficient')) return raw;
    switch (stage) {
      case 'Seedling':    return 'Veg First';
      case 'Vegetative':  return 'In Veg Stage';
      case 'Early Flower': return '6–8 Weeks';
      case 'Late Flower': return '1–3 Weeks';
      case 'Harvest':     return 'Ready Now';
      default:            return 'Check Buds';
    }
  };
  const harvestDisplay = getHarvestDisplay();

  // Nutrient Strength (EC) card — "EC" alone confuses new growers. Show a
  // beginner-friendly qualitative label plus the numeric EC value.
  const getNutrientStrengthLabel = (ecRaw: string): string => {
    const ec = parseFloat(ecRaw);
    if (isNaN(ec)) return ecRaw;
    if (ec < 1.0) return 'Light';
    if (ec < 1.6) return 'Medium';
    if (ec < 2.2) return 'Strong';
    return 'Max';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Image header */}
      <div className="relative h-64 flex-shrink-0">
        <img src={imageDataUrl} className="w-full h-full object-cover" alt="Scanned plant" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />

        {/* Severity badge */}
        <div className={`absolute top-12 left-6 ${displaySev.bg} ${displaySev.border} border backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm`}>
          {isHealthy ? (
            <CheckCircle size={14} className={displaySev.color} />
          ) : (
            <AlertTriangle size={14} className={displaySev.color} />
          )}
          <span className={`text-xs font-black ${displaySev.color} uppercase tracking-wider`}>{displaySev.label}</span>
        </div>

        <div className="absolute bottom-4 left-6 right-6">
          <div className="bg-[#059669] text-white text-[10px] font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-2 shadow-lg shadow-[#059669]/30">
            <CheckCircle size={10} />
            AI SCAN COMPLETE
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {result?.diagnosis || 'Analysis Complete'}
          </h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 my-5">
          {healthScore !== null && (
            <div className={`${displaySev.bg} border ${displaySev.border} rounded-2xl p-3 text-center shadow-sm`}>
              <div className={`text-2xl font-black ${displaySev.color}`}>{healthScore}</div>
              <div className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Health Score</div>
            </div>
          )}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-3 text-center">
            <div className="text-slate-900 font-black text-sm leading-tight">{harvestDisplay}</div>
            <div className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Optimal Harvest Time</div>
          </div>
          {result?.nutrientTargets?.ec && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-3 text-center">
              <div className="text-slate-900 font-black text-sm leading-tight">
                {getNutrientStrengthLabel(result.nutrientTargets.ec)}
              </div>
              <div className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">
                Nutrient Strength
              </div>
              <div className="text-slate-400 text-[9px] font-bold mt-0.5">
                EC {result.nutrientTargets.ec}
              </div>
            </div>
          )}
        </div>

        {/* Priority action */}
        {result?.topAction && (
          <div className={`${displaySev.bg} border ${displaySev.border} rounded-2xl p-4 mb-5 shadow-sm`}>
            <div className={`text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${displaySev.color}`}>
              <TrendingUp size={12} /> Priority Action
            </div>
            <p className="text-slate-800 font-semibold text-sm leading-relaxed">{result.topAction}</p>
          </div>
        )}

        {/* Fix steps */}
        {result?.fixSteps?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-slate-600 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle size={12} className="text-[#059669]" /> Fix Steps
            </h3>
            <div className="space-y-2">
              {result.fixSteps.map((step: string, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 bg-white border border-slate-200 shadow-sm rounded-xl p-3 transition-all duration-500 ${
                    i < shownSteps ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#ECFDF5] border border-[#059669]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#059669] text-[9px] font-black">{i + 1}</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prevention tips */}
        {result?.preventionTips?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-slate-600 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info size={12} className="text-blue-500" /> Prevention Tips
            </h3>
            <div className="space-y-2">
              {result.preventionTips.slice(0, 3).map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <p className="text-slate-700 text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={onNext}
          className="w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-[#059669]/30"
        >
          Amazing! What's Next? <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default ScanResults;
