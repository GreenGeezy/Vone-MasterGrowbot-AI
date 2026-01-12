import React, { useState, useEffect } from 'react';
import { OnboardingStep, UserProfile, Plant, Task } from './types';
import Splash from './screens/Splash';
import Onboarding from './screens/Onboarding';
import OnboardingSummary from './screens/OnboardingSummary';
import Home from './screens/Home';
import Diagnose from './screens/Diagnose';
import Chat from './screens/Chat';
import Journal from './screens/Journal';
import Paywall from './screens/Paywall';
import PostPaymentAuth from './screens/PostPaymentAuth';
import BottomNav from './components/BottomNav';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen'; // Added Import
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'diagnose' | 'chat' | 'journal'>('home');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Flow States
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  useEffect(() => {
    const initApp = async () => {
      // 1. FAST LAUNCH: Hide native splash immediately so React UI is visible
      await SplashScreen.hide();

      CapacitorApp.addListener('appUrlOpen', async (data) => {
          if (data.url.includes('access_token') || data.url.includes('refresh_token') || data.url.includes('login-callback')) {
              setTimeout(async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) handleAuthSuccess(session.user.id);
              }, 500);
          }
      });

      if (Capacitor.isNativePlatform()) {
          const apiKey = Capacitor.getPlatform() === 'android' 
              ? 'goog_kqOynvNRCABzUPrpfyFvlMvHUna' 
              : 'appl_ihDRwAcLuSWmrxGSiVxrurApZwF';
          
          await Purchases.configure({ apiKey });
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      }

      const { data: { session } } = await supabase.auth.getSession();
      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      const hasCompletedOnboarding = localStorage.getItem('mastergrowbot_onboarding_complete');

      if (savedProfile) setUserProfile(JSON.parse(savedProfile));

      if (session) {
          setIsTrialActive(true);
          setOnboardingStatus(OnboardingStep.COMPLETED);
          loadUserData();
      } else {
          if (hasCompletedOnboarding === 'true') {
             setOnboardingStatus(OnboardingStep.COMPLETED);
          } else if (savedProfile) {
             setOnboardingStatus(OnboardingStep.SUMMARY);
          }
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
      setPlants([{ 
          id: '1', name: 'Project Alpha', strain: 'Blue Dream', stage: 'Veg', health: 92, 
          imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851?auto=format&fit=crop&q=80&w=1000', 
          totalDays: 24, journal: [] 
      }]);
      setTasks([
          { id: '1', title: 'Check pH (Target 6.2)', completed: false, date: new Date().toISOString() },
          { id: '2', title: 'Light 18/6 Cycle Check', completed: true, date: new Date().toISOString() }
      ]);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
      setUserProfile(profile);
      localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
      setOnboardingStatus(OnboardingStep.SUMMARY);
  };

  const handleSummaryContinue = () => {
      setOnboardingStatus(OnboardingStep.COMPLETED);
      setShowPaywall(true); 
  };

  const handleGetStarted = () => {
      setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE);
  };

  const handlePaymentSuccess = () => {
      setShowPaywall(false);
      setShowAuth(true); 
  };

  const handleAuthSuccess = async (userId?: string) => {
      setShowAuth(false);
      setShowPaywall(false);
      setIsTrialActive(true);
      localStorage.setItem('mastergrowbot_onboarding_complete', 'true');
      
      if (userId && Capacitor.isNativePlatform()) {
          await Purchases.logIn({ appUserID: userId });
      }
      loadUserData();
  };

  const handleTabChange = (tab: any) => {
      if (!isTrialActive && Capacitor.isNativePlatform()) {
          setShowPaywall(true);
      } else {
          setCurrentTab(tab);
      }
  };

  const handleTaskToggle = (taskId: string) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  const handleAddJournalEntry = (entry: any) => console.log(entry);
  const handleUpdatePlant = (id: string, updates: any) => console.log(updates);

  if (onboardingStatus === OnboardingStep.SPLASH) return <Splash onGetStarted={handleGetStarted} />;
  if (onboardingStatus !== OnboardingStep.COMPLETED && onboardingStatus !== OnboardingStep.SUMMARY) return <Onboarding onComplete={handleOnboardingComplete} />;
  if (onboardingStatus === OnboardingStep.SUMMARY) return <OnboardingSummary profile={userProfile!} onContinue={handleSummaryContinue} />;

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === 'home' && <Home plants={plants} tasks={tasks} onToggleTask={handleTaskToggle} onNavigateToPlant={() => setCurrentTab('journal')} />}
          {currentTab === 'diagnose' && <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />}
          {currentTab === 'chat' && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
          {currentTab === 'journal' && <Journal plants={plants} onAddEntry={handleAddJournalEntry} onUpdatePlant={handleUpdatePlant} />}
      </div>

      {showPaywall && (
        <Paywall 
            onClose={() => setShowPaywall(false)} 
            onPurchase={handlePaymentSuccess} 
            onSkip={() => setShowPaywall(false)} 
        />
      )}
      
      {showAuth && (
        <PostPaymentAuth 
            onComplete={() => handleAuthSuccess()} 
            onSkip={() => handleAuthSuccess()} 
            userProfile={userProfile}
        />
      )}
      
      <BottomNav currentScreen={currentTab} onNavigate={handleTabChange} />
    </div>
  );
};

export default App;
