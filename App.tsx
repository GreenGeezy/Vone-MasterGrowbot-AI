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
import { STRAIN_DATABASE } from './data/strains';
import { supabase, getUserProfile } from './services/supabaseClient';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

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
    nextHarvestDate: '2023-12-01',
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
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [plants, setPlants] = useState<Plant[]>(MOCK_PLANTS_DATA);

  useEffect(() => {
    const initRevenueCat = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          // Fetch API Key from environment variables injected during build
          const rcKey = process.env.REVENUECAT_API_KEY || "goog_kqOynvNRCABzUPrpfyFvlMvHUna";
          await Purchases.configure({ apiKey: rcKey });
          
          // Sync existing session if available
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
             <button onClick={() => setShowPaywall(true)} className="w-full py-3 bg-text-main text-white rounded-xl font-bold shadow-lg">Manage Pro Account</button>
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
    </div>
  );
};

export default App;