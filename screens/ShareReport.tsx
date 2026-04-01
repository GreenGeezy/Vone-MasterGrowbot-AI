import React, { useState, useEffect } from 'react';
import { Activity, Zap, Droplet, Calendar, Scale, Wind, ShieldAlert, CheckCircle } from 'lucide-react';
import { getPublicReport } from '../services/dbService';

const ShareReport: React.FC = () => {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const parts = window.location.pathname.split('/');
    const shareToken = parts[2];

    if (!shareToken) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    getPublicReport(shareToken).then((data) => {
      if (!data) {
        setNotFound(true);
      } else {
        // Check expiry
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setNotFound(true);
        } else {
          setReport(data);
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[300] bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-500">Loading report...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Report Not Found</h1>
        <p className="text-gray-500 font-medium mb-8">This report may have expired or the link is incorrect.</p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-transform"
        >
          Analyze your own plants at mastergrowbotai.com
        </button>
      </div>
    );
  }

  const result = report.diagnosis_data;
  const imageUrls: string[] = report.image_urls || [];

  const isCritical = result.severity === 'high';
  const themeColor = isCritical ? 'text-red-500' : result.severity === 'medium' ? 'text-orange-500' : 'text-green-500';
  const bgTheme = isCritical ? 'bg-red-500' : result.severity === 'medium' ? 'bg-orange-500' : 'bg-green-600';

  return (
    <div className="fixed inset-0 z-[300] bg-gray-50 overflow-y-auto font-sans">
      {/* Brand header */}
      <div className="bg-gray-900 px-6 py-4 text-center">
        <p className="text-green-400 font-black text-xl tracking-tight">🌿 MasterGrowbot AI</p>
        <p className="text-gray-400 text-xs font-medium mt-0.5">Shared Plant Health Report</p>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto pb-24">
        {/* Severity + diagnosis */}
        <div className="animate-in fade-in slide-in-from-top-4">
          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white ${bgTheme}`}>
            {result.severity} Severity • {result.confidence}% Confidence
          </span>
          <h1 className={`text-3xl font-black leading-tight ${themeColor}`}>{result.diagnosis}</h1>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Detected in {result.growthStage}</p>
        </div>

        {/* Priority action */}
        <div className={`${bgTheme} text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden`}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Zap size={16} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-widest">Priority Action</span>
            </div>
            <p className="text-lg font-bold leading-snug">{result.topAction}</p>
          </div>
          <Activity size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
        </div>

        {/* Images */}
        {imageUrls.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {imageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                className="w-32 h-32 rounded-2xl object-cover flex-shrink-0 border-2 border-white shadow-md"
                alt={`Plant photo ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-purple-100 shadow-sm flex flex-col items-center text-center">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-full mb-1"><Scale size={16} /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Health Score</span>
            <span className="text-sm font-black text-gray-800">{Math.floor(result.healthScore)}</span>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full ${result.healthScore >= 75 ? 'bg-green-500' : result.healthScore >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${result.healthScore}%` }}
              />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-green-100 shadow-sm flex flex-col items-center text-center">
            <div className="p-2 bg-green-50 text-green-600 rounded-full mb-1"><Calendar size={16} /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harvest Window</span>
            <span className="text-sm font-black text-gray-800 leading-tight">{result.harvestWindow || '--'}</span>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center text-center">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-1"><Droplet size={16} /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nutrients</span>
            <span className="text-sm font-black text-gray-800 leading-tight">{result.nutrientTargets?.ec || '--'}</span>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-cyan-100 shadow-sm flex flex-col items-center text-center">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-full mb-1"><Wind size={16} /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Environment</span>
            <span className="text-sm font-black text-gray-800 leading-tight">{result.environmentSummary || result.environmentTargets?.vpd || '--'}</span>
          </div>
        </div>

        {/* Recovery steps (read-only) */}
        {result.fixSteps && result.fixSteps.length > 0 && (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2">
              <CheckCircle size={18} className={themeColor} />
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Recovery Steps</h3>
            </div>
            <ul className="space-y-2">
              {result.fixSteps.map((step: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs font-medium text-gray-700 leading-relaxed">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCritical ? 'bg-red-400' : result.severity === 'medium' ? 'bg-orange-400' : 'bg-green-400'}`} />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prevention tips */}
        {result.preventionTips && result.preventionTips.length > 0 && (
          <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={18} className="text-orange-500" />
              <h3 className="text-xs font-black text-orange-700 uppercase tracking-widest">Prevention & Risks</h3>
            </div>
            <ul className="space-y-2">
              {result.preventionTips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs font-medium text-orange-800/80 leading-relaxed">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-300 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer CTA */}
        <div className="bg-gray-900 rounded-[2rem] p-6 text-center">
          <p className="text-white font-black text-lg mb-1">Analyze YOUR plants with AI</p>
          <p className="text-green-400 font-bold text-sm mb-4">→ www.mastergrowbotai.com</p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-8 py-3 bg-green-500 text-white rounded-xl font-black text-sm shadow-lg shadow-green-900/40 active:scale-95 transition-transform"
          >
            Try it free →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareReport;
