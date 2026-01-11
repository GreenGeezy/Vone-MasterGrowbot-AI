import React, { useState, useEffect } from 'react';
import { OnboardingStep, UserProfile, Plant, JournalEntry, Task } from './types';
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
      // 1. REVENUECAT CONFIGURATION (Mobile Only)
      if (Capacitor.isNativePlatform()) {
          let apiKey = '';
          if (Capacitor.getPlatform() === 'android') {
              apiKey = 'goog_kqOynvNRCABzUPrpfyFvlMvHUna'; // Android Key
          } else if (Capacitor.getPlatform() === 'ios') {
              apiKey = 'appl_ihDRwAcLuSWmrxGSiVxrurApZwF'; // iOS Key
          }
          
          if (apiKey) {
              await Purchases.configure({ apiKey });
              await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          }
      }

      // 2. CHECK SESSION & STATE
      const { data: { session } } = await supabase.auth.getSession();
      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      const hasCompletedOnboarding = localStorage.getItem('mastergrowbot_onboarding_complete');

      if (savedProfile) setUserProfile(JSON.parse(savedProfile));

      // If logged in, they have full access
      if (session) {
          setIsTrialActive(true);
          setOnboardingStatus(OnboardingStep.COMPLETED);
          loadUserData();
      } else {
          // If not logged in, wait 2.5s then check local state
          setTimeout(() => {
             if (hasCompletedOnboarding === 'true') {
                 // Finished onboarding but not logged in -> Auth
                 setOnboardingStatus(OnboardingStep.COMPLETED);
                 setShowAuth(true);
             } else if (savedProfile) {
                 // Has profile but didn't finish -> Summary
                 setOnboardingStatus(OnboardingStep.SUMMARY);
             } else {
                 // New user -> Splash/Quiz (handled by Splash component logic usually, 
                 // but we ensure transition happens if Splash calls back)
                 // We don't force transition here to let Splash run its animation/button logic
             }
          }, 2500);
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
      // Mock data for immediate feature testing
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

  // FIXED: Missing Handler for Splash Screen
  const handleGetStarted = () => {
      setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE);
  };

  const handlePaymentSuccess = () => {
      setShowPaywall(false);
      setShowAuth(true); 
  };

  const handleAuthSuccess = () => {
      setShowAuth(false);
      setIsTrialActive(true);
      localStorage.setItem('mastergrowbot_onboarding_complete', 'true');
      loadUserData();
  };

  const handleTabChange = (tab: any) => {
      // Logic: Native apps require trial. Web apps allow testing.
      if (!isTrialActive && Capacitor.isNativePlatform()) {
          setShowPaywall(true);
      } else {
          setCurrentTab(tab);
      }
  };

  const handleTaskToggle = (taskId: string) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  const handleAddJournalEntry = (entry: any) => console.log(entry);
  const handleUpdatePlant = (id: string, updates: any) => console.log(updates);

  // --- RENDER ---
  
  // FIXED: Passed handleGetStarted prop to Splash
  if (onboardingStatus === OnboardingStep.SPLASH) {
      return <Splash onGetStarted={handleGetStarted} />;
  }
  
  if (onboardingStatus !== OnboardingStep.COMPLETED && onboardingStatus !== OnboardingStep.SUMMARY) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (onboardingStatus === OnboardingStep.SUMMARY) {
      return <OnboardingSummary profile={userProfile!} onContinue={handleSummaryContinue} />;
  }

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === 'home' && <Home plants={plants} tasks={tasks} onToggleTask={handleTaskToggle} onNavigateToPlant={() => setCurrentTab('journal')} />}
          {currentTab === 'diagnose' && <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />}
          {currentTab === 'chat' && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
          {currentTab === 'journal' && <Journal plants={plants} onAddEntry={handleAddJournalEntry} onUpdatePlant={handleUpdatePlant} />}
      </div>

      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} onPurchase={handlePaymentSuccess} onAuthRedirect={() => { setShowPaywall(false); setShowAuth(true); }} />}
      {showAuth && <PostPaymentAuth onComplete={handleAuthSuccess} onSkip={() => { setShowAuth(false); setIsTrialActive(true); loadUserData(); }} />}
      
      <BottomNav currentScreen={currentTab} onNavigate={handleTabChange} />
    </div>
  );
};

export default App;
