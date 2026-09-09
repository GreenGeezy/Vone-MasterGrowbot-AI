import React, { useState, useEffect, useRef } from 'react';
import { Camera as CameraIcon, Upload, X, Zap, Activity, CheckSquare, Square, ChevronRight, Droplet, Calendar, Scale, ShieldAlert, Wind, CheckCircle, Share2, Save, RotateCcw, ScanLine, Film, Video, Crown, Eye, RefreshCw } from 'lucide-react';
import { diagnosePlant, ExtendedDiagnosisResult } from '../services/geminiService';
import { Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { STRAIN_DATABASE } from '../data/strains';
import { matchesStrainSearch } from '../utils/strainSearch';
import AnalysisShareDialog from '../components/AnalysisShareDialog';
import type { AnalysisShareSummary } from '../services/analysisShareCard';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
// InAppReview dynamically imported below — static import crashes on web
import { formatMetricDisplay, formatDiagnosisReport } from '../utils/diagnosisFormatter';
import { analyzePlantVideo, validateVideo } from '../services/videoAnalysisService';
import { VideoVisualResult } from '../services/videoVisualResult';
import { hasPremiumAccess } from '../services/premiumCatalog';
import { initializeSubscriptions, withTimeout } from '../services/appInitializer';
import PremiumPaywall from './PremiumPaywall';

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
  onSaveToJournal?: (entry: any) => void;
  onAddTask?: (title: string, date: string, source: 'ai_diagnosis' | 'user') => void;
  defaultProfile?: UserProfile | null;
  onAddPlant?: (strain: any) => void;
}

const RecoveryChecklist = ({ steps, themeColor, onAddTask }: { steps: string[], themeColor: string, onAddTask?: (t: string) => void }) => {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(steps.length).fill(false));
  return (
    <div className="space-y-2 mt-3">
      {steps.map((step, idx) => (
        <div key={idx} className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${checkedState[idx] ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div onClick={() => { const updated = [...checkedState]; updated[idx] = !updated[idx]; setCheckedState(updated); }} className="flex gap-3 flex-1 cursor-pointer">
            <div className={`mt-0.5 transition-colors ${checkedState[idx] ? 'text-gray-300' : themeColor}`}>{checkedState[idx] ? <CheckSquare size={18} /> : <Square size={18} />}</div>
            <p className={`text-xs sm:text-sm leading-snug transition-all ${checkedState[idx] ? 'text-gray-400 line-through' : 'text-gray-700 font-semibold'}`}>{step}</p>
          </div>
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

const Diagnose: React.FC<DiagnoseProps> = ({ plant, onBack, onSaveToJournal, onAddTask, defaultProfile, onAddPlant }) => {
  const [image, setImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtendedDiagnosisResult | null>(null);
  const [shareSummary, setShareSummary] = useState<AnalysisShareSummary | null>(null);
  const [premiumActive, setPremiumActive] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [showVideoFlow, setShowVideoFlow] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [videoResult, setVideoResult] = useState<VideoVisualResult | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const recordVideoRef = useRef<HTMLInputElement>(null);
  const chooseVideoRef = useRef<HTMLInputElement>(null);
  const videoAbortRef = useRef<AbortController | null>(null);

  // LOCAL STATE OVERRIDES (Initialized from Global Defaults)
  const [strain, setStrain] = useState<string>(plant?.strain || 'Generic');
  // Initialize from defaultProfile, fallback to Indoor if undefined
  const [growMethod, setGrowMethod] = useState<'Indoor' | 'Outdoor' | 'Greenhouse'>(defaultProfile?.grow_mode || 'Indoor');

  const [showStrainMenu, setShowStrainMenu] = useState(false);
  const [showCustomUi, setShowCustomUi] = useState(false); // Toggle for Custom UI
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Strain Form State
  const [customStrainName, setCustomStrainName] = useState('');
  const [customStrainType, setCustomStrainType] = useState<'Indica' | 'Sativa' | 'Hybrid'>('Hybrid');

  const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);
  const [timeLeft, setTimeLeft] = useState(15);

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

      setTimeLeft(15);
      interval = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);

      return () => {
        clearInterval(phraseInterval);
        clearInterval(interval);
      };
    }
  }, [loading]);

  useEffect(() => {
    let active = true;
    if (!Capacitor.isNativePlatform()) return () => { active = false; };
    initializeSubscriptions().then(async () => {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await withTimeout(Purchases.getCustomerInfo(), 6000, 'Premium status');
      if (active) setPremiumActive(hasPremiumAccess(customerInfo));
    }).catch(() => { /* The paywall retries when the user asks for Premium. */ });
    return () => { active = false; videoAbortRef.current?.abort(); };
  }, []);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const openVideo = () => {
    setVideoError(null);
    if (premiumActive) setShowVideoFlow(true);
    else setShowPremiumPaywall(true);
  };

  const selectVideo = async (file?: File) => {
    if (!file) return;
    setVideoError(null);
    setVideoResult(null);
    try {
      const { duration } = await validateVideo(file);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoFile(file);
      setVideoDurationSeconds(duration);
      setVideoUrl(URL.createObjectURL(file));
    } catch (cause: any) {
      setVideoFile(null);
      setVideoDurationSeconds(null);
      setVideoError(cause?.message || 'Choose another video.');
    }
  };

  const runVideoAnalysis = async () => {
    if (!videoFile || videoLoading) return;
    const controller = new AbortController();
    videoAbortRef.current = controller;
    setVideoLoading(true);
    setVideoError(null);
    setVideoResult(null);
    try {
      setVideoResult(await analyzePlantVideo(videoFile, controller.signal));
    } catch (cause: any) {
      if (cause?.name !== 'AbortError') setVideoError(cause?.message || 'Video analysis failed. Please try again.');
    } finally {
      if (videoAbortRef.current === controller) videoAbortRef.current = null;
      setVideoLoading(false);
    }
  };

  const closeVideoFlow = () => {
    videoAbortRef.current?.abort();
    setShowVideoFlow(false);
    setVideoLoading(false);
  };

  const saveVideoObservation = () => {
    if (!videoResult || !onSaveToJournal) return;
    const observations = videoResult.visibleSigns.length ? videoResult.visibleSigns.join('; ') : 'No specific visible signs recorded.';
    onSaveToJournal({
      id: Date.now().toString(), date: new Date().toLocaleDateString(), type: 'Health Check',
      notes: `Video visual analysis — ${videoResult.healthLabel}. ${videoResult.visualSummary} Visible observations: ${observations} Suggested next visual check: ${videoResult.recommendedVerification}`,
    });
    alert('Video observations saved to your journal. The video itself was not retained.');
  };

  const processImage = async (dataUrl: string) => {
    setImage(dataUrl);
    setPreviewImage(null);
    setLoading(true);
    setResult(null);
    try {
      // Use LOCAL STATE `growMethod` for the analysis, preserving global default separately
      const diagnosis = await diagnosePlant(dataUrl, {
        strain: strain === 'Leave Blank' ? undefined : strain,
        growMethod,
        userProfile: defaultProfile || { experience: 'Novice' } as UserProfile // Fallback
      });
      setResult(diagnosis);

      // --- IN-APP REVIEW TRIGGER (3rd Success) ---
      try {
        const currentCount = parseInt(localStorage.getItem('diagnosis_success_count') || '0');
        const newCount = currentCount + 1;
        localStorage.setItem('diagnosis_success_count', newCount.toString());

        if (newCount === 3 && Capacitor.isNativePlatform()) {
          console.log("Triggering In-App Review...");
          const { InAppReview } = await import('@capacitor-community/in-app-review');
          await InAppReview.requestReview();
        }
      } catch (e) {
        console.warn("Review trigger failed", e);
      }

    } catch (e: any) {
      console.error("Full Diagnosis Error:", e);
      alert(`Analysis failed: ${e.message || JSON.stringify(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (photo.dataUrl) await processImage(photo.dataUrl);
    } catch (err) { console.log("Camera cancelled"); }
  };

  const handleGalleryUpload = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      if (photo.dataUrl) setPreviewImage(photo.dataUrl);
    } catch (err) { console.log("Gallery cancelled"); }
  };

  const handleShare = () => {
    if (!result) return;
    setShareSummary({ kind: 'photo', headline: result.diagnosis, score: result.healthScore });
  };

  const handleSave = () => {
    if (onSaveToJournal && result && image) {
      onSaveToJournal({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        type: 'Health Check',
        notes: formatDiagnosisReport(result),
        image: image,
        diagnosisData: result,
      });

      // Auto-Task Logic for Low Health
      if (result.healthScore < 70 && onAddTask) {
        const today = new Date().toISOString().split('T')[0];
        onAddTask(`Review Diagnosis: ${result.diagnosis}`, today, 'ai_diagnosis');
        alert("Saved to Journal + Follow-up Task Created! 📝✅");
      } else {
        alert("Saved to Journal! 📝");
      }

    } else {
      alert("Could not save entry.");
    }
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
        <div className="text-4xl font-mono text-white font-black">{timeLeft}s</div>
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
      <div className="bg-gray-50 min-h-screen pb-[120px] overflow-y-auto font-sans">
        <div className="sticky top-0 z-[60] bg-white/90 backdrop-blur px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2 text-gray-800 font-black uppercase text-xs tracking-widest"><Activity size={16} className={themeColor} /> Health Report</div>
          <button onClick={() => { setResult(null); setImage(null); }} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 max-w-lg mx-auto">
          {/* Header */}
          <div className="animate-in fade-in slide-in-from-top-4">
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 text-white ${bgTheme}`}>{result.severity} Severity • {result.confidence}% Conf.</span>
            <h1 className={`text-3xl font-black leading-tight ${themeColor}`}>{result.diagnosis}</h1>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wide">Detected in {result.growthStage}</p>
          </div>

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
                  onAddTask(stepTitle, today, 'ai_diagnosis');
                  alert("Task Added to Today's Plan! 📅");
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
            <button onClick={handleSave} className="py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"><Save size={18} /> Save to Journal</button>
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
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">{onBack && <button onClick={onBack}><ChevronRight className="rotate-180 text-gray-400" /></button>}<Growbot size="lg" mood="happy" /><div className="w-6" /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Analyze Your Plant's Health with AI</h1>
        <p className="text-sm text-gray-500 font-medium">Scan or upload a photo for instant report on plant health and actions to take to save your grow from pests, diseases, and fix deficiencies.</p>
      </div>

      <div className="px-6 space-y-6 max-w-md mx-auto">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-5">
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Genetics</label>
            <div onClick={() => setShowStrainMenu(!showStrainMenu)} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-gray-800 flex justify-between items-center cursor-pointer border border-transparent hover:border-green-200 transition-all">
              {strain || "Select Strain / Generic"}
              <ChevronRight size={16} className={`text-gray-400 transition-transform ${showStrainMenu ? 'rotate-90' : ''}`} />
            </div>
            {showStrainMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-2 max-h-[22rem] overflow-y-auto animate-in fade-in slide-in-from-top-2">

                {/* Custom Strain Creation UI */}
                {showCustomUi ? (
                  <div className="p-2 bg-gray-50 rounded-xl mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase text-gray-500">New Custom Strain</span>
                      <button onClick={() => setShowCustomUi(false)} className="text-xs text-blue-500 font-bold">Cancel</button>
                    </div>
                    <input
                      className="w-full text-sm p-3 bg-white border border-gray-200 rounded-lg mb-3 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Strain Name (e.g. Purple Haze)"
                      value={customStrainName}
                      onChange={(e) => setCustomStrainName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2 mb-4">
                      {['Indica', 'Hybrid', 'Sativa'].map(type => (
                        <button
                          key={type}
                          onClick={() => setCustomStrainType(type as any)}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md border transition-all ${customStrainType === type ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-400 border-gray-200'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (!customStrainName) return;
                          setStrain(customStrainName);
                          setShowCustomUi(false);
                          setShowStrainMenu(false);
                        }}
                        className="py-3 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                      >
                        Select Only
                      </button>
                      <button
                        onClick={() => {
                          if (!customStrainName) return;
                          setStrain(customStrainName);
                          if (onAddPlant) {
                            onAddPlant({ name: customStrainName, type: customStrainType, image: null }); // Placeholder image null
                            alert(`Added ${customStrainName} to Your Plants!`);
                          }
                          setShowCustomUi(false);
                          setShowStrainMenu(false);
                        }}
                        className="py-3 bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-200"
                      >
                        Select & Add
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Search UI */
                  <>
                    <input className="w-full text-xs p-3 bg-gray-50 rounded-lg mb-2 outline-none font-bold" placeholder="Search Strains..." autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-gray-50">
                      <button onClick={() => { setStrain("Generic"); setShowStrainMenu(false); }} className="p-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold text-center">✨ Generic</button>
                      <button onClick={() => { setShowCustomUi(true); setCustomStrainName(''); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold text-center border border-blue-100">+ Custom Strain</button>
                    </div>
                    {filteredStrains.map(s => (
                      <button key={s.id} onClick={() => { setStrain(s.name); setShowStrainMenu(false); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-sm font-bold text-gray-800 flex justify-between items-center group">
                        {s.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Growing Environment</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['Indoor', 'Outdoor', 'Greenhouse'].map((env) => (<button key={env} onClick={() => setGrowMethod(env as any)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${growMethod === env ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>{env}</button>))}
            </div>
          </div>
        </div>

        <button onClick={openVideo} data-testid="premium-video-card" className="w-full text-left relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 text-white shadow-xl shadow-emerald-100 active:scale-[0.99] transition-transform">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.18em] text-emerald-300"><Crown size={13} /> MASTERGROWBOT AI PREMIUM</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-[9px] font-black">PREMIUM</span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div><h2 className="text-xl font-black">Video Plant Analysis</h2><p className="mt-1 text-xs leading-relaxed text-slate-300">Capture more visual context than a single photo. Record or upload a short plant video for advanced visual observations.</p></div>
              <div className="shrink-0 rounded-2xl bg-emerald-400 p-3 text-slate-950"><Film size={23} /></div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-black text-emerald-300">Analyze Video <ChevronRight size={15} /></div>
          </div>
        </button>

        <button onClick={handleStartCamera} className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-gray-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"><CameraIcon size={24} className="text-green-400" /> Scan with Camera</button>
        <button onClick={handleGalleryUpload} className="w-full bg-white text-gray-600 py-4 rounded-[2rem] font-bold border border-gray-200 flex items-center justify-center gap-2"><Upload size={18} /> Upload from Gallery</button>
      </div>

      <input ref={recordVideoRef} className="hidden" type="file" accept="video/mp4,video/quicktime,.mov" capture="environment" onChange={event => { void selectVideo(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      <input ref={chooseVideoRef} className="hidden" type="file" accept="video/mp4,video/quicktime,.mov" onChange={event => { void selectVideo(event.target.files?.[0]); event.currentTarget.value = ''; }} />

      {showPremiumPaywall && <PremiumPaywall onClose={() => setShowPremiumPaywall(false)} onUnlocked={() => { setPremiumActive(true); setShowPremiumPaywall(false); setShowVideoFlow(true); }} />}

      {showVideoFlow && (
        <div className="fixed inset-0 z-[110] bg-slate-950 text-white flex flex-col" data-testid="video-workflow">
          <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 border-b border-white/10">
            <div><p className="text-[9px] font-black tracking-[0.18em] text-emerald-300">MASTERGROWBOT AI PREMIUM</p><h2 className="text-xl font-black">Video Plant Analysis</h2></div>
            <button onClick={closeVideoFlow} aria-label="Close video analysis" className="rounded-full bg-white/10 p-2"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pb-10">
            {!videoFile && !videoResult && (
              <div className="max-w-md mx-auto">
                <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5 mb-5"><Eye className="text-emerald-300 mb-3" /><p className="text-sm text-slate-200 leading-relaxed">Move slowly around the plant. Keep the leaves in focus and include affected areas from more than one angle.</p><p className="text-xs text-slate-400 mt-2">Maximum 20 seconds and 8 MB. Analysis uses visual evidence only; avoid recording private conversations.</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => recordVideoRef.current?.click()} className="rounded-2xl bg-emerald-400 text-slate-950 p-5 font-black flex flex-col items-center gap-2"><Video size={25} /> Record Video</button>
                  <button onClick={() => chooseVideoRef.current?.click()} className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 font-black flex flex-col items-center gap-2"><Upload size={25} /> Choose Video</button>
                </div>
              </div>
            )}

            {videoFile && !videoResult && (
              <div className="max-w-md mx-auto">
                {videoUrl && <video src={videoUrl} controls={!videoLoading} muted playsInline className="w-full aspect-video object-contain bg-black rounded-[2rem] border border-white/10" />}
                <div className="flex justify-between text-xs text-slate-400 mt-3"><span className="truncate mr-3">{videoFile.name}</span><span>{videoDurationSeconds?.toFixed(1)}s · {(videoFile.size / 1024 / 1024).toFixed(1)} MB</span></div>
                {videoLoading ? (
                  <div className="mt-6 rounded-2xl bg-white/[0.06] border border-white/10 p-5 text-center"><div className="h-10 w-10 mx-auto border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" /><h3 className="font-black mt-4">Reviewing visible plant evidence…</h3><p className="text-xs text-slate-400 mt-2">This can take up to 90 seconds.</p><button onClick={() => videoAbortRef.current?.abort()} className="mt-4 text-sm font-bold text-slate-300">Cancel</button></div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 mt-6"><button onClick={() => { setVideoFile(null); setVideoUrl(null); }} className="rounded-xl bg-white/10 py-3 text-xs font-bold">Choose Again</button><button onClick={() => recordVideoRef.current?.click()} className="rounded-xl bg-white/10 py-3 text-xs font-bold">Record Again</button><button onClick={runVideoAnalysis} className="rounded-xl bg-emerald-400 text-slate-950 py-3 text-xs font-black">Analyze</button></div>
                )}
              </div>
            )}

            {videoResult && (
              <div className="max-w-md mx-auto space-y-4" data-testid="video-result">
                <div className="rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-cyan-400/10 border border-emerald-300/20 p-5"><p className="text-[10px] font-black text-emerald-300 tracking-widest">OVERALL VISUAL CONDITION</p><div className="flex items-end justify-between mt-2"><h3 className="text-2xl font-black">{videoResult.healthLabel}</h3><span className="text-sm font-black text-emerald-300">{videoResult.confidence}% confidence</span></div><p className="text-sm text-slate-300 mt-3 leading-relaxed">{videoResult.visualSummary}</p></div>
                {[
                  ['Key Visible Observations', videoResult.visibleSigns],
                  ['Possible Interpretations', videoResult.possibleInterpretations],
                  ['Areas to Inspect More Closely', videoResult.areasToInspect],
                ].map(([title, items]) => <div key={title as string} className="rounded-2xl bg-white/[0.06] border border-white/10 p-4"><h4 className="text-xs font-black text-slate-200 mb-3">{title as string}</h4><ul className="space-y-2">{(items as string[]).map(item => <li key={item} className="text-xs text-slate-300 flex gap-2"><span className="text-emerald-400">•</span>{item}</li>)}</ul></div>)}
                <div className="grid grid-cols-1 gap-3"><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-[10px] font-black text-slate-400">ENVIRONMENTAL CONTEXT</p><p className="text-xs mt-2 text-slate-200">{videoResult.environmentSummary}</p></div><div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-[10px] font-black text-slate-400">MEDIA QUALITY / LIMITATIONS</p><p className="text-xs mt-2 text-slate-200">{videoResult.mediaQuality}</p></div><div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/20 p-4"><p className="text-[10px] font-black text-emerald-300">SUGGESTED NEXT VISUAL CHECK</p><p className="text-xs mt-2 text-slate-200">{videoResult.recommendedVerification}</p></div></div>
                <div className="grid grid-cols-2 gap-3"><button onClick={saveVideoObservation} className="rounded-xl bg-white/10 py-3 font-bold text-sm"><Save size={16} className="inline mr-1" /> Save</button><button onClick={() => { setVideoResult(null); setVideoFile(null); setVideoUrl(null); }} className="rounded-xl bg-emerald-400 text-slate-950 py-3 font-black text-sm"><RefreshCw size={16} className="inline mr-1" /> New Video</button></div>
                <button onClick={() => setShareSummary({ kind: 'video', headline: videoResult.healthLabel, score: videoResult.healthScore })} className="w-full rounded-xl bg-emerald-400/15 border border-emerald-400/30 py-4 font-bold text-sm text-emerald-200"><Share2 size={16} className="inline mr-2" /> Share Analysis</button>
              </div>
            )}
            {videoError && <div role="alert" className="max-w-md mx-auto mt-5 rounded-2xl bg-red-500/15 border border-red-400/30 p-4 text-sm text-red-100"><p>{videoError}</p><div className="flex gap-3 mt-3"><button onClick={runVideoAnalysis} disabled={!videoFile || videoLoading} className="font-black text-white disabled:opacity-40">Retry</button><button onClick={() => { setVideoError(null); setVideoFile(null); setVideoUrl(null); }} className="font-bold text-slate-300">Choose another</button></div></div>}
          </div>
        </div>
      )}
      {shareSummary && <AnalysisShareDialog summary={shareSummary} onClose={() => setShareSummary(null)} />}
    </div>
  );
};
export default Diagnose;
