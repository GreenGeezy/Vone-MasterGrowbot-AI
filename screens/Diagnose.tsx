import React, { useState, useEffect, useRef } from 'react';
import { Camera as CameraIcon, Upload, X, Zap, Activity, CheckSquare, Square, ChevronRight, Droplet, Calendar, Scale, ShieldAlert, Wind, CheckCircle, Share2, Save, RotateCcw, ScanLine, Film, Video, Crown, Eye, RefreshCw } from 'lucide-react';
import { diagnosePlant, ExtendedDiagnosisResult } from '../services/geminiService';
import { Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { STRAIN_DATABASE } from '../data/strains';
import { matchesStrainSearch } from '../utils/strainSearch';
import { mediaSelectionError } from '../services/mediaSelection';
import AnalysisShareDialog from '../components/AnalysisShareDialog';
import type { AnalysisShareSummary } from '../services/analysisShareCard';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { recordSuccessfulAnalysis, requestAnalysisReview, REVIEW_READING_DELAY_MS } from '../services/analysisReview';
import { formatMetricDisplay, formatDiagnosisReport } from '../utils/diagnosisFormatter';
import {proFirstRelease} from '../services/releaseFeatures';
import {recordEvent} from '../services/conversionEvents';

/**
 * Health Score Mapping help
 */
const getHealthRating = (score: number) => {
  if (score >= 90) return "Thriving";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 45) return "Average";
  if (score >= 30) return "Suboptimal";
  if (score >= 15) return "Poor";
  return "Struggling"; // 0-14
};

const MetricCard = ({ icon: Icon, label, value, subValue, color = "blue" }: any) => (
  <div className={`bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-${color}-100 shadow-sm flex flex-col items-center text-center h-full justify-between`}>
    <div className={`p-2 bg-${color}-50 text-${color}-600 rounded-full mb-1`}><Icon size={16} /></div>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-black text-gray-800 leading-tight">{value || "--"}</span>
    {subValue && <span className="text-[9px] text-gray-500 font-medium">{subValue}</span>}
  </div>
);

const PreventionSection = ({ tips }: { tips: string[] }) => (
  <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-5 mt-4">
    <div className="flex items-center gap-2 mb-3"><ShieldAlert size={18} className="text-orange-500" /><h3 className="text-xs font-black text-orange-700 uppercase tracking-widest">Prevention & Risks</h3></div>
    <ul className="space-y-2">{tips.map((tip, i) => (<li key={i} className="flex items-start gap-2 text-xs font-medium text-orange-800/80 leading-relaxed"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-300" />{tip}</li>))}</ul>
  </div>
);

interface DiagnoseProps {
  plant?: Plant;
  onBack?: () => void;
  onSaveToJournal?: (entry: any) => void | boolean | Promise<void | boolean>;
  onAddTask?: (title: string, date: string, source: 'ai_diagnosis' | 'user') => void | boolean | Promise<void | boolean>;
  defaultProfile?: UserProfile | null;
  onAddPlant?: (strain: any) => void;
  previewResult?: ExtendedDiagnosisResult;
  previewImage?: string;
}

const RecoveryChecklist = ({ steps, themeColor, onAddTask }: { steps: string[], themeColor: string, onAddTask?: (t: string) => void }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));
  return (
    <div className="space-y-2 mt-3">
      {steps.map((step, idx) => (
        <div key={idx} className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${checkedState[idx] ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}>
          <button type="button" role="checkbox" aria-checked={checkedState[idx]} onClick={() => { const updated = [...checkedState]; updated[idx] = !updated[idx]; setCheckedState(updated); }} className="flex gap-3 flex-1 min-h-11 text-left cursor-pointer">
            <div className={`mt-0.5 transition-colors ${checkedState[idx] ? 'text-gray-300' : themeColor}`}>{checkedState[idx] ? <CheckSquare size={18} /> : <Square size={18} />}</div>
            <p className={`text-xs sm:text-sm leading-snug transition-all ${checkedState[idx] ? 'text-gray-400 line-through' : 'text-gray-700 font-semibold'}`}>{step}</p>
          </button>
          {!checkedState[idx] && onAddTask && (
            <button
              onClick={() => onAddTask(step)}
              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-90 transition-transform"
              title="Add to Daily Tasks"
            >
              <Calendar size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

const LOADING_PHRASES = [
  "Processing Plant Genetics...",
  "Customizing to your growing goals...",
  "Analyzing with your growing environment...",
  "Checking leaf color and vibrancy...",
  "Scanning for hidden stress...",
  "Identifying nutrient needs...",
  "Building your custom care plan..."
];

const Diagnose: React.FC<DiagnoseProps> = ({ plant, onBack, onSaveToJournal, onAddTask, defaultProfile, onAddPlant, previewResult, previewImage: previewPhoto }) => {
  const mediaLock = useRef(false);
  const saveLock = useRef(false);
  const [pickingMedia, setPickingMedia] = useState<'camera' | 'photos' | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const isLocalReview=import.meta.env.DEV && location.pathname.startsWith('/review');
  const [image, setImage] = useState<string | null>(isLocalReview?previewPhoto||null:null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewEligible, setReviewEligible] = useState(false);
  const [result, setResult] = useState<ExtendedDiagnosisResult | null>(isLocalReview?previewResult||null:null);
  useEffect(() => {
    if (!result) return;
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelector('.app-content')?.scrollTo({top:0,left:0});
    window.scrollTo(0,0);
  }, [result]);
  const [shareSummary, setShareSummary] = useState<AnalysisShareSummary | null>(null);
  // LOCAL STATE OVERRIDES (Initialized from Global Defaults)
  const [strain, setStrain] = useState<string>(plant?.strain || 'Generic');
  // Initialize from defaultProfile, fallback to Indoor if undefined
  const [growMethod, setGrowMethod] = useState<'Indoor' | 'Outdoor' | 'Greenhouse'>(defaultProfile?.grow_mode || 'Indoor');
  const [growthStage, setGrowthStage] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');

  const [showStrainMenu, setShowStrainMenu] = useState(false);
  const [showCustomUi, setShowCustomUi] = useState(false); // Toggle for Custom UI
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Strain Form State
  const [customStrainName, setCustomStrainName] = useState('');
  const [customStrainType, setCustomStrainType] = useState<'Indica' | 'Sativa' | 'Hybrid'>('Hybrid');

  const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Loading Animation Loop
  useEffect(() => {
    let interval: any;
    if (loading) {
      let phraseIndex = 0;
      setLoadingText(LOADING_PHRASES[0]);

      const phraseInterval = setInterval(() => {
        phraseIndex = (phraseIndex + 1) % LOADING_PHRASES.length;
        setLoadingText(LOADING_PHRASES[phraseIndex]);
      }, 4000);

      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);

      return () => {
        clearInterval(phraseInterval);
        clearInterval(interval);
      };
    }
  }, [loading]);

  // Give the user time to read the report. Never cover loading, sharing or media flows.
  useEffect(() => {
    if (!reviewEligible || !result || loading || shareSummary || pickingMedia || savingReport) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      timer = setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        setReviewEligible(false);
        void requestAnalysisReview();
      }, REVIEW_READING_DELAY_MS);
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [reviewEligible, result, loading, shareSummary, pickingMedia, savingReport]);

  const processImage = async (dataUrl: string) => {
    setImage(dataUrl);
    setPreviewImage(null);
    setLoading(true);
    setReviewEligible(false);
    setResult(null);
    try {
      // Use LOCAL STATE `growMethod` for the analysis, preserving global default separately
      const diagnosis = await diagnosePlant(dataUrl, {
        strain: strain === 'Leave Blank' ? undefined : strain,
        growMethod,
        userProfile: defaultProfile || { experience: 'Novice' } as UserProfile // Fallback
      });
      setResult(diagnosis);
      recordEvent('analysis_complete','photo');

      setReviewEligible(recordSuccessfulAnalysis(diagnosis));

    } catch (e: any) {
      console.error("Full Diagnosis Error:", e);
      alert(`Analysis failed: ${e.message || JSON.stringify(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async (source: CameraSource) => {
    if (mediaLock.current) return;
    mediaLock.current = true;
    setPickingMedia(source === CameraSource.Camera ? 'camera' : 'photos');
    setMediaError(null);
    try {
      const photo = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.DataUrl, source });
      if (!photo.dataUrl) throw new Error('No photo returned');
      if (source === CameraSource.Camera) await processImage(photo.dataUrl);
      else setPreviewImage(photo.dataUrl);
    } catch (error) { setMediaError(mediaSelectionError(error)); }
    finally { mediaLock.current = false; setPickingMedia(null); }
  };
  const handleStartCamera = () => pickPhoto(CameraSource.Camera);
  const handleGalleryUpload = () => pickPhoto(CameraSource.Photos);

  const handleShare = () => {
    if (!result) return;
    setShareSummary({ kind: 'photo', headline: result.diagnosis, score: result.healthScore, imageUrl: image || undefined });
  };

  const handleSave = async () => {
    if (!onSaveToJournal || !result || !image || saveLock.current) return;
    saveLock.current = true;
    setSavingReport(true);
    try {
      const saved = await onSaveToJournal({
        id: Date.now().toString(), date: new Date().toLocaleDateString(), type: 'Health Check',
        notes: formatDiagnosisReport(result), image, diagnosisData: result,
      });
      if (saved === false) throw new Error('Not saved');
      if (result.healthScore < 70 && onAddTask) {
        try {
          if (await onAddTask(`Review Diagnosis: ${result.diagnosis}`, new Date().toISOString().split('T')[0], 'ai_diagnosis') === false) throw new Error();
        } catch { alert('Your report was saved. The follow-up task could not be added; you can add it in Journal.'); }
      }
    } catch { alert('Could not save your report. It is still here. Please try again.'); }
    finally { saveLock.current = false; setSavingReport(false); }
  };

  const filteredStrains = STRAIN_DATABASE.filter(strain => matchesStrainSearch(strain, searchQuery));

  // 1. Loading State
  if (loading) return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {image && <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
      <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-2 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,1)] animate-[scan_2s_ease-in-out_infinite] z-10"></div>
      <div className="relative z-20 text-center p-8 bg-black/60 rounded-3xl backdrop-blur-md border border-white/10 m-6 w-[80%]">
        <Growbot size="lg" mood="thinking" className="mb-4 mx-auto" />
        <h2 className="text-2xl font-black uppercase tracking-widest text-green-400 mb-2">Analyzing Photo</h2>
        <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-6 min-h-[3rem] flex items-center justify-center">{loadingText}</p>
        <div className="text-4xl font-mono text-white font-black">{elapsedSeconds}s elapsed</div>
      </div>
    </div>
  );

  // 2. Review Step
  if (previewImage) return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center h-screen w-screen overflow-hidden">
      <div className="flex-1 w-full bg-black flex items-center justify-center overflow-hidden relative">
        <img src={previewImage} className="max-w-full max-h-full object-contain" />
      </div>
      <div className="w-full bg-gray-900/90 backdrop-blur-md p-6 pb-12 flex items-center justify-between gap-4 shrink-0 absolute bottom-0 left-0 right-0 z-[110]">
        <button onClick={() => { setPreviewImage(null); }} className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><RotateCcw size={18} /> Cancel</button>
        <button onClick={() => processImage(previewImage)} className="flex-[2] py-4 bg-green-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-95 transition-transform"><ScanLine size={20} /> Analyze</button>
      </div>
    </div>
  );

  // 3. Result View
  if (result) {
    const isCritical = result.severity === 'high';
    const themeColor = isCritical ? 'text-red-500' : result.severity === 'medium' ? 'text-orange-500' : 'text-green-500';
    const bgTheme = isCritical ? 'bg-red-500' : result.severity === 'medium' ? 'bg-orange-500' : 'bg-green-600';

    // Adaptive Logic
    const isNovice = (defaultProfile?.experience || 'Novice') === 'Novice';
    const healthDisplay = formatMetricDisplay(result.healthScore, 'health', defaultProfile?.experience);

    return (
      <div className="health-report bg-gray-50 min-h-screen pb-[120px] font-sans">
        <div className="health-report-header sticky top-0 z-[60] bg-white/90 backdrop-blur px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2 text-gray-800 font-black uppercase text-xs tracking-widest"><Activity size={16} className={themeColor} /> Health Report</div>
          <button aria-label="Close report" onClick={() => { setResult(null); setImage(null); }} className="min-h-11 min-w-11 grid place-items-center bg-gray-100 rounded-full hover:bg-gray-200"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 max-w-lg mx-auto">
          {/* Header */}
          <div className="animate-in fade-in slide-in-from-top-4">
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white ${bgTheme}`}>{result.severity} Severity • {result.confidence}% Conf.</span>
            <h1 className="text-2xl font-bold leading-tight text-emerald-950">{result.diagnosis}</h1>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Detected in {result.growthStage}</p>
          </div>

          <button disabled={savingReport} onClick={handleSave} className="journey-primary"><Save size={18}/>{savingReport?'Saving…':'Save to Journal'}</button>
          <p className="text-sm text-slate-600">Keep this report with your notes so you can revisit what changed.</p>

          {/* Priority Action */}
          <div className={`${bgTheme} text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden`}>
            <div className="relative z-10"><div className="flex items-center gap-2 mb-2 opacity-90"><Zap size={16} fill="currentColor" /><span className="text-[10px] font-black uppercase tracking-widest">Priority Action</span></div><p className="text-lg font-bold leading-snug">{result.topAction}</p></div>
            <Activity size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
          </div>

          {/* Metric Cards - Context Aware Display */}
          <div className="grid grid-cols-2 gap-3 animate-in fade-in delay-100">
            {isNovice ? (
              <div className="bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-purple-100 shadow-sm flex flex-col items-center text-center h-full justify-between">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-full mb-1"><Scale size={16} /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Health Status</span>
                <div className="w-full mt-2">
                  <div className="text-lg font-black text-purple-700 mb-1">{healthDisplay}</div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${result.healthScore >= 75 ? 'bg-green-500' : result.healthScore >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${result.healthScore}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <MetricCard icon={Scale} label="Health Score" value={healthDisplay} color="purple" />
            )}

            <MetricCard icon={Calendar} label="Harvest In" value={formatMetricDisplay(result.harvestWindow, 'harvest', defaultProfile?.experience)} color="green" />

            {/* CONTEXT-AWARE: Nutrients */}
            <MetricCard
              icon={Droplet}
              label={growMethod === 'Outdoor' ? "Watering Needs" : "Nutrients"}
              value={formatMetricDisplay(result.nutrientTargets?.ec, 'nutrient', defaultProfile?.experience, growMethod)}
              subValue={defaultProfile?.experience === 'Expert' && growMethod !== 'Outdoor' ? `pH: ${result.nutrientTargets?.ph || "--"}` : undefined}
              color="blue"
            />

            {/* CONTEXT-AWARE: Environment */}
            <MetricCard
              icon={Wind}
              label="Environment"
              value={result.environmentSummary || formatMetricDisplay(result.environmentTargets?.vpd, 'vpd', defaultProfile?.experience, growMethod)}
              subValue={(!result.environmentSummary && defaultProfile?.experience === 'Expert' && growMethod !== 'Outdoor') ? `${result.environmentTargets?.temp || "--"} / ${result.environmentTargets?.rh || "--"}` : undefined}
              color={(() => {
                const s = result.environmentSummary || "";
                if (/Stress|Risk|Burn|Warning/i.test(s)) return "orange";
                if (/Optimal|Ideal/i.test(s)) return "green";
                return "cyan";
              })()}
            />
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-2"><CheckCircle size={18} className={themeColor} /><h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Personalized Grow and Recovery Tips</h3></div>
            <RecoveryChecklist
              steps={result.fixSteps}
              themeColor={themeColor}
              onAddTask={(stepTitle) => {
                // Logic to add task for TODAY directly
                if (onAddTask) {
                  const today = new Date().toISOString().split('T')[0];
                  void Promise.resolve(onAddTask(stepTitle, today, 'ai_diagnosis')).then(saved => {
                    if(saved!==false)alert('Task saved.');
                  }).catch(()=>alert('The task could not be saved. Please retry.'));
                }
              }}
            />
            {result.preventionTips && result.preventionTips.length > 0 && <PreventionSection tips={result.preventionTips} />}
          </div>

          {image && (
            <div className="flex justify-center py-4">
              <div className="w-[80%] rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-1"><img src={image} className="w-full h-full object-cover" /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pb-4">
            <button disabled={savingReport} onClick={handleSave} className="py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"><Save size={18} /> {savingReport ? 'Saving…' : 'Save to Journal'}</button>
            <button onClick={handleShare} className="py-4 bg-emerald-100 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-emerald-200"><Share2 size={18} /> Share Analysis</button>
          </div>
          <p className="text-xs text-center text-gray-500 pb-3">Share a plant check-in. Invite a second look.</p>
          {shareSummary && <AnalysisShareDialog summary={shareSummary} onClose={() => setShareSummary(null)} />}
        </div>
      </div>
    );
  }

  // 4. Initial View (Main)
  return (
    <div className="bg-gray-50 min-h-full w-full pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <div className="bg-white px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 rounded-b-3xl shadow-sm mb-4">
        <div className="flex justify-between items-center mb-4">{onBack && <button onClick={onBack}><ChevronRight className="rotate-180 text-gray-400" /></button>}<Growbot size="sm" mood="happy" /><div className="w-6" /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Plant Health</h1>
        <p className="text-sm text-gray-500 font-medium">Choose a photo for an AI visual check-in.</p>
      </div>

      <div className="px-5 space-y-4 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {mediaError && <p role="alert" className="col-span-2 text-sm text-red-700 bg-red-50 p-3 rounded-xl">{mediaError}</p>}
          <button disabled={!!pickingMedia} aria-busy={pickingMedia === 'camera'} onClick={handleStartCamera} className="bg-emerald-600 text-white min-h-[64px] rounded-2xl font-bold flex items-center justify-center gap-2"><CameraIcon size={22} /> {pickingMedia === 'camera' ? 'Opening camera…' : proFirstRelease ? 'Take Photo' : 'Take Pic'}</button>
          <button disabled={!!pickingMedia} aria-busy={pickingMedia === 'photos'} onClick={handleGalleryUpload} className="bg-white text-slate-800 border border-slate-200 min-h-[64px] rounded-2xl font-bold flex items-center justify-center gap-2"><Upload size={20} /> {pickingMedia === 'photos' ? 'Opening photos…' : 'Analyze Image'}</button>
        </div>
      </div>
      {shareSummary && <AnalysisShareDialog summary={shareSummary} onClose={() => setShareSummary(null)} />}
    </div>
  );
};
export default Diagnose;
