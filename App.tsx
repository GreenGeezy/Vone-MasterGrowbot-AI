import React, { useState, useEffect } from 'react';
import { OnboardingStep, UserProfile, Plant, Task, AppScreen } from './types';
import Splash from './screens/Splash';
import Onboarding from './screens/Onboarding';
import OnboardingSummary from './screens/OnboardingSummary';
import Home from './screens/Home';
import Diagnose from './screens/Diagnose';
import Chat from './screens/Chat';
import Journal from './screens/Journal';
import Profile from './screens/Profile'; // Import Profile
import Paywall from './screens/Paywall';
import PostPaymentAuth from './screens/PostPaymentAuth';
import BottomNav from './components/BottomNav';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from './services/supabaseClient';
import { STRAIN_DATABASE } from './data/strains';

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<AppScreen>(AppScreen.HOME);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await SplashScreen.hide();

      if (Capacitor.getPlatform() === 'android') {
        await Purchases.configure({ apiKey: 'goog_kqOynvNRCABzUPrpfyFvlMvHUna' });
      }

      CapacitorApp.addListener('appUrlOpen', async (data) => {
        if (data.url.includes('code=')) {
          const { data: sessionData } = await supabase.auth.exchangeCodeForSession(new URL(data.url).searchParams.get('code')!);
          if (sessionData.session) handleAuthSuccess();
        }
      });

      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      if (savedProfile) setUserProfile(JSON.parse(savedProfile));
      loadUserData();
    };
    initApp();
  }, []);

  const loadUserData = async () => {
    const mockStrain = STRAIN_DATABASE[0];
    setPlants([{ id: '1', name: 'Project Alpha', strain: mockStrain.name, strainDetails: mockStrain, stage: 'Veg', healthScore: 92, daysInStage: 24, imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851', totalDays: 24, journal: [], tasks: [], streak: 5, weeklySummaries: [] }]);
    setTasks([{ id: '1', title: 'Check pH', completed: false, type: 'check' }, { id: '2', title: 'CalMag', completed: false, type: 'feed' }]);
  };

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    setShowPaywall(false);
    setOnboardingStatus(OnboardingStep.COMPLETED);
    loadUserData();
  };

  const handleAddJournalEntry = (entry: any) => {
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toLocaleDateString() };
    setPlants(prev => {
      if (prev[0]) {
        prev[0].journal.unshift(newEntry);
        return [...prev];
      }
      return prev;
    });
    setCurrentTab(AppScreen.JOURNAL);
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...updates };
    setUserProfile(updated);
    localStorage.setItem('mastergrowbot_profile', JSON.stringify(updated));
  };

  if (onboardingStatus === OnboardingStep.SPLASH) return <Splash onGetStarted={() => setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE)} />;
  if (onboardingStatus === OnboardingStep.QUIZ_EXPERIENCE) return <Onboarding onComplete={(p) => { setUserProfile(p); setOnboardingStatus(OnboardingStep.SUMMARY); }} />;
  if (onboardingStatus === OnboardingStep.SUMMARY) return <OnboardingSummary profile={userProfile!} onContinue={() => { setOnboardingStatus(OnboardingStep.COMPLETED); setShowPaywall(true); }} />;

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <div className="h-full w-full overflow-y-auto pb-24">
        {currentTab === AppScreen.HOME && <Home plants={plants} tasks={tasks} onToggleTask={(id: string) => setTasks(t => t.map(x => x.id === id ? { ...x, completed: !x.completed } : x))} onNavigateToPlant={() => setCurrentTab(AppScreen.JOURNAL)} />}
        {currentTab === AppScreen.DIAGNOSE && <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} defaultProfile={userProfile} />}
        {currentTab === AppScreen.CHAT && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
        {currentTab === AppScreen.JOURNAL && <Journal plants={plants} onAddEntry={handleAddJournalEntry} onUpdatePlant={(id: string, u: any) => setPlants(p => p.map(x => x.id === id ? { ...x, ...u } : x))} />}
        {currentTab === AppScreen.PROFILE && <Profile userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onSignOut={() => window.location.reload()} />}
      </div>

      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} onPurchase={() => { setShowPaywall(false); setShowAuth(true); }} onSkip={() => setShowPaywall(false)} />}

      {showAuth && <PostPaymentAuth onComplete={handleAuthSuccess} onSkip={handleAuthSuccess} userProfile={userProfile} />}

      <BottomNav currentScreen={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />
    </div>
  );
};
export default App;
