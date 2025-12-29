import React, { useState, useEffect } from 'react';
import { AppScreen, Plant, Task, PlantStage, UserProfile, OnboardingStep, JournalEntry } from './types';
import BottomNav from './components/BottomNav';
import Home from './screens/Home';
import Diagnose from './screens/Diagnose';
import Chat from './screens/Chat';
import Paywall from './screens/Paywall';
import PostPaymentAuth from './screens/PostPaymentAuth';
import Journal from './screens/Journal';
import Onboarding from './screens/Onboarding';
import OnboardingSummary from './screens/OnboardingSummary';
import Splash from './screens/Splash';
import DevTools from './components/DevTools';
import Growbot from './components/Growbot';
import { supabase, getUserProfile } from './services/supabaseClient';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { InAppReview } from '@capacitor-community/in-app-review';
import { Star, X } from 'lucide-react';

const MOCK_PLANTS_DATA: Plant[] = [
  {
    id: '1',
    name: 'Northern Lights #5',
    strain: 'Northern Lights',
    stage: PlantStage.VEG,
    daysInStage: 24,
    totalDays: 45,
    healthScore: 94,
    imageUri: 'https://picsum.photos/200/200?random=1',
    nextHarvestDate: '2026-12-01',
    streak: 12,
    tasks: [],
    journal: [],
    weeklySummaries: []
  }
];

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Water Northern Lights', completed: false, type: 'water' },
  { id: '2', title: 'Check pH levels', completed: true, type: 'check' },
];

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.HOME);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [plants, setPlants] = useState<Plant[]>(MOCK_PLANTS_DATA);

  useEffect(() => {
    const initRevenueCat = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          const rcKey = process.env.REVENUECAT_API_KEY || "goog_kqOynvNRCABzUPrpfyFvlMvHUna";
          await Purchases.configure({ apiKey: rcKey });
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await Purchases.logIn({ appUserID: session.user.id });
          }
        } catch (e) {
          console.error("RevenueCat Init Error:", e);
        }
      }
    };
    initRevenueCat();

    const savedProfile = localStorage.getItem('mastergrowbot_profile');
    const trialActive = localStorage.getItem('mastergrowbot_trial_active');

    if (trialActive === 'true') {
      setIsTrialActive(true);
      setOnboardingStatus(OnboardingStep.COMPLETED);
      if (savedProfile) setUserProfile(JSON.parse(savedProfile));
    } else if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
    } else {
      setOnboardingStatus(OnboardingStep.SPLASH);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (Capacitor.isNativePlatform()) {
          try {
            await Purchases.logIn({ appUserID: session.user.id });
          } catch (e) {
            console.error("RC Sync Error:", e);
          }
        }

        if (event === 'SIGNED_IN') {
          try {
            const { data: profile } = await getUserProfile();
            if (profile) {
              const appProfile: UserProfile = {
                experience: profile.experience as any,
                grow_mode: profile.environment as any,
                goal: profile.goal as any,
                space: profile.grow_space_size as any
              };
              setUserProfile(appProfile);
              localStorage.setItem('mastergrowbot_profile', JSON.stringify(appProfile));
              setOnboardingStatus(OnboardingStep.COMPLETED);
            }
          } catch (e) {
            console.error("Auth hydration error", e);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkReviewEligibility = () => {
    const count = parseInt(localStorage.getItem('mgb_scan_count') || '0');
    const lastPrompt = localStorage.getItem('mgb_last_prompt_date');
    
    // Logic 1: 3rd scan if never prompted
    if (count === 3 && !lastPrompt) {
      setShowReviewModal(true);
      localStorage.setItem('mgb_last_prompt_date', new Date().toISOString());
      return;
    }

    // Logic 2: 10+ scans AND 30 days since last prompt
    if (count >= 10 && lastPrompt) {
      const lastDate = new Date(lastPrompt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 30) {
        setShowReviewModal(true);
        localStorage.setItem('mgb_last_prompt_date', new Date().toISOString());
      }
    }
  };

  const submitInternalRating = async (rating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('app_ratings').insert({
          user_id: user.id,
          rating: rating,
          created_at: new Date().toISOString()
        });
      }

      // If positive (4 or 5 stars), trigger Native Store Review
      if (rating >= 4 && Capacitor.isNativePlatform()) {
        await InAppReview.requestReview();
      }
    } catch (e) {
      console.error("Rating Error:", e);
    } finally {
      setShowReviewModal(false);
    }
  };

  const handleSplashGetStarted = () => setOnboardingStatus(OnboardingStep.QUIZ);

  const handleSessionActive = async () => {
    try {
      const { data, error } = await getUserProfile();
      if (data && !error) {
        const profile: UserProfile = {
          experience: data.experience as any,
          grow_mode: data.environment as any,
          goal: data.goal as any,
          space: data.grow_space_size as any
        };
        setUserProfile(profile);
        localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
        setOnboardingStatus(OnboardingStep.COMPLETED);
      } else {
        setOnboardingStatus(OnboardingStep.QUIZ);
      }
    } catch (e) {
      setOnboardingStatus(OnboardingStep.SPLASH);
    }
  };

  const handleQuizComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
    setOnboardingStatus(OnboardingStep.SUMMARY);
  };

  const handleSummaryContinue = () => setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
  const handlePaymentSuccess = () => setOnboardingStatus(OnboardingStep.POST_PAYMENT_AUTH);
  const handleTrialActivation = () => {
    localStorage.setItem('mastergrowbot_trial_active', 'true');
    setIsTrialActive(true);
    setOnboardingStatus(OnboardingStep.COMPLETED);
    setShowPaywall(false);
  };
  const handleSkipTrial = () => {
    setOnboardingStatus(OnboardingStep.COMPLETED);
    setShowPaywall(false);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddJournalEntry = (entry: Omit<JournalEntry, 'id' | 'date'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
    };
    
    // Update local scan count if it was a diagnosis
    if (entry.type === 'diagnosis') {
      const currentCount = parseInt(localStorage.getItem('mgb_scan_count') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('mgb_scan_count', newCount.toString());
      
      // Delay eligibility check slightly for better UX after saving
      setTimeout(checkReviewEligibility, 1500);
    }

    setPlants(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
            updated[0] = { ...updated[0], journal: [newEntry, ...updated[0].journal] };
        }
        return updated;
    });
  };

  const handleUpdatePlant = (plantId: string, updates: Partial<Plant>) => {
    setPlants(prev => prev.map(p => p.id === plantId ? { ...p, ...updates } : p));
  };

  const renderContent = () => {
    switch (onboardingStatus) {
      case OnboardingStep.SPLASH: return <Splash onGetStarted={handleSplashGetStarted} onSessionActive={handleSessionActive} />;
      case OnboardingStep.QUIZ: return <Onboarding onComplete={handleQuizComplete} />;
      case OnboardingStep.SUMMARY: return userProfile && <OnboardingSummary profile={userProfile} onContinue={handleSummaryContinue} />;
      case OnboardingStep.TRIAL_PAYWALL: return <Paywall onClose={handleTrialActivation} onAuthRedirect={handlePaymentSuccess} onSkip={handleSkipTrial} isMandatory={true} userProfile={userProfile} />;
      case OnboardingStep.POST_PAYMENT_AUTH: return <PostPaymentAuth userProfile={userProfile} onComplete={handleTrialActivation} />;
      default: break;
    }

    switch (currentScreen) {
      case AppScreen.HOME: return <Home plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onNavigateToPlant={() => setCurrentScreen(AppScreen.DIAGNOSE)} />;
      case AppScreen.DIAGNOSE: return <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />;
      case AppScreen.CHAT: return <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />;
      case AppScreen.JOURNAL: return <Journal plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onAddEntry={handleAddJournalEntry} onUpdatePlant={handleUpdatePlant} />;
      case AppScreen.ACCOUNT: return (
          <div className="p-6 pt-12 h-full overflow-y-auto text-text-main bg-surface">
             <h1 className="text-2xl font-bold mb-6">My Account</h1>
             {userProfile && (
               <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-[10px] text-text-sub font-bold uppercase block mb-1">Level</span>
                    <p className="text-primary font-bold text-lg">{userProfile.experience}</p>
                  </div>
               </div>
             )}
             <button onClick={() => setShowPaywall(true)} className="w-full py-3 bg-text-main text-white rounded-xl font-bold shadow-lg">Manage Pro Account (2026)</button>
          </div>
        );
      default: return <Home plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onNavigateToPlant={() => {}} />;
    }
  };

  return (
    <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto h-screen relative overflow-hidden shadow-2xl bg-surface sm:border-x border-gray-100">
      <DevTools 
        onReset={() => { localStorage.clear(); window.location.reload(); }} 
        onInjectProfile={() => {}} 
        onToggleTrial={() => setIsTrialActive(!isTrialActive)} 
        isTrialActive={isTrialActive} 
        currentStep={onboardingStatus} 
      />
      
      <div className="h-full overflow-y-auto no-scrollbar pb-0">
        {renderContent()}
      </div>

      {onboardingStatus === OnboardingStep.COMPLETED && !showPaywall && (
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      )}

      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} onAuthRedirect={() => setShowPaywall(false)} isMandatory={false} userProfile={userProfile} />
      )}

      {/* 2-STAGE REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative text-center overflow-hidden">
            <button 
              onClick={() => setShowReviewModal(false)}
              className="absolute top-6 right-6 p-2 text-gray-300 hover:text-text-main"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <Growbot size="xl" mood="happy" />
            </div>

            <h2 className="text-2xl font-black text-text-main mb-2 tracking-tight">How's your grow?</h2>
            <p className="text-sm text-text-sub font-medium mb-8">
              We're working hard to make our AI better for every grower in 2026. Please rate your experience!
            </p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => submitInternalRating(star)}
                  className="p-1 hover:scale-125 transition-transform duration-200"
                >
                  <Star size={36} className="text-yellow-400 fill-current" />
                </button>
              ))}
            </div>
            
            <div className="flex justify-between px-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <span>Needs Help</span>
              <span>Incredible</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;