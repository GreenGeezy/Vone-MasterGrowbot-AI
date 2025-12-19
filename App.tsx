
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
import { supabase, getUserProfile, updateOnboardingProfile } from './services/supabaseClient';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const MOCK_USER_PROFILE: UserProfile = {
  experience: 'Intermediate',
  grow_mode: 'Indoor',
  goal: 'Maximize Yield',
  space: 'Medium'
};

const getStrainDetails = (name: string) => STRAIN_DATABASE.find(s => s.name === name);

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
    journal: [
      {
        id: 'j1',
        date: new Date().toLocaleDateString(),
        type: 'note',
        title: 'Training Day',
        notes: 'Performed LST on main stem. Plant responded well.'
      }
    ],
    weeklySummaries: [
        {
            id: 'w1',
            weekNumber: 1,
            date: 'Oct 10',
            healthScore: 98,
            imageUri: 'https://picsum.photos/200/200?random=10',
            aiNotes: "Strong seedling establishment. Root development looks vigorous. No signs of damping off."
        },
        {
            id: 'w2',
            weekNumber: 2,
            date: 'Oct 17',
            healthScore: 95,
            imageUri: 'https://picsum.photos/200/200?random=11',
            aiNotes: "Transition to veg successful. Slight nitrogen uptake increase detected. Leaf color is optimal."
        }
    ]
  }
];

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Water Northern Lights', completed: false, type: 'water' },
  { id: '2', title: 'Check pH levels', completed: true, type: 'check' },
  { id: '3', title: 'Feed Blue Dream (Week 4 Veg)', completed: false, type: 'feed' },
];

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.HOME);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [plants, setPlants] = useState<Plant[]>(MOCK_PLANTS_DATA);

  // Helper to check RevenueCat entitlement
  const checkSubscriptionStatus = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        return customerInfo.entitlements.active['pro_access'] !== undefined;
      } catch (e) {
        console.error("RevenueCat Check Error:", e);
        return false;
      }
    }
    // Web fallback uses localStorage for development/testing
    return localStorage.getItem('mastergrowbot_trial_active') === 'true';
  };

  useEffect(() => {
    const initApp = async () => {
      // 1. RevenueCat Init
      if (Capacitor.isNativePlatform()) {
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          await Purchases.configure({ apiKey: "appl_REPLACE_WITH_YOUR_REVENUECAT_KEY" });
        } catch (e) {
          console.error("RevenueCat Init Error:", e);
        }
      }

      // 2. Initial State Load
      const subscribed = await checkSubscriptionStatus();
      setIsTrialActive(subscribed);
      
      const { data: { session } } = await supabase.auth.getSession();
      const savedProfile = localStorage.getItem('mastergrowbot_profile');

      if (subscribed) {
        if (session && savedProfile) {
          setUserProfile(JSON.parse(savedProfile));
          setOnboardingStatus(OnboardingStep.COMPLETED);
        } else if (session) {
          setOnboardingStatus(OnboardingStep.QUIZ);
        } else {
          setOnboardingStatus(OnboardingStep.SPLASH);
        }
      } else {
        // Not subscribed? Always start from splash/onboarding
        setOnboardingStatus(OnboardingStep.SPLASH);
      }
    };
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const subscribed = await checkSubscriptionStatus();
        setIsTrialActive(subscribed);

        if (subscribed) {
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
          } else {
            setOnboardingStatus(OnboardingStep.QUIZ);
          }
        } else {
          // Logged in but no subscription? Force paywall.
          setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setIsTrialActive(false);
        setOnboardingStatus(OnboardingStep.SPLASH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSplashGetStarted = () => setOnboardingStatus(OnboardingStep.QUIZ);

  const handleSessionActive = async () => {
    const subscribed = await checkSubscriptionStatus();
    setIsTrialActive(subscribed);

    if (!subscribed) {
      setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
      return;
    }

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
  };

  const handleQuizComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
    setOnboardingStatus(OnboardingStep.SUMMARY);
  };

  const handleSummaryContinue = () => setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
  
  const handlePaymentSuccess = () => {
    // This is called by the Paywall after successful purchase
    setIsTrialActive(true);
    setOnboardingStatus(OnboardingStep.POST_PAYMENT_AUTH);
  };

  const handleFinalActivation = () => {
    localStorage.setItem('mastergrowbot_trial_active', 'true');
    setIsTrialActive(true);
    setOnboardingStatus(OnboardingStep.COMPLETED);
    setShowPaywall(false);
  };

  const renderContent = () => {
    // MASTER GUARD: Block all main app views if subscription is missing
    if (onboardingStatus === OnboardingStep.COMPLETED && !isTrialActive) {
      return (
        <Paywall 
          onClose={() => {}} 
          onAuthRedirect={handlePaymentSuccess} 
          isMandatory={true} 
          userProfile={userProfile} 
        />
      );
    }

    switch (onboardingStatus) {
      case OnboardingStep.SPLASH: 
        return <Splash onGetStarted={handleSplashGetStarted} onSessionActive={handleSessionActive} />;
      case OnboardingStep.QUIZ: 
        return <Onboarding onComplete={handleQuizComplete} />;
      case OnboardingStep.SUMMARY: 
        return userProfile && <OnboardingSummary profile={userProfile} onContinue={handleSummaryContinue} />;
      case OnboardingStep.TRIAL_PAYWALL: 
        return (
          <Paywall 
            onClose={handleFinalActivation} 
            onAuthRedirect={handlePaymentSuccess} 
            isMandatory={true} 
            userProfile={userProfile} 
          />
        );
      case OnboardingStep.POST_PAYMENT_AUTH: 
        return <PostPaymentAuth userProfile={userProfile} onComplete={handleFinalActivation} />;
      default: break;
    }

    // Authenticated and Subscribed Views
    switch (currentScreen) {
      case AppScreen.HOME: 
        return <Home plants={plants} tasks={tasks} onToggleTask={(id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))} onNavigateToPlant={() => setCurrentScreen(AppScreen.DIAGNOSE)} />;
      case AppScreen.DIAGNOSE: 
        return <Diagnose plant={plants[0]} />;
      case AppScreen.CHAT: 
        return <Chat plant={plants[0]} userProfile={userProfile} />;
      case AppScreen.JOURNAL: 
        return <Journal plants={plants} onAddEntry={(e) => setPlants(p => { const updated = [...p]; updated[0].journal.unshift({ ...e, id: Date.now().toString(), date: new Date().toLocaleDateString() }); return updated; })} />;
      case AppScreen.ACCOUNT: 
        return <div className="p-10">Account Settings (Pro Only)</div>;
      default: 
        return <Home plants={plants} tasks={tasks} onToggleTask={() => {}} onNavigateToPlant={() => {}} />;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen relative overflow-hidden shadow-2xl bg-surface border-x border-gray-100">
      <DevTools 
        onReset={() => { localStorage.clear(); window.location.reload(); }} 
        onInjectProfile={() => {}} 
        onToggleTrial={() => {}} 
        isTrialActive={isTrialActive} 
        currentStep={onboardingStatus} 
      />
      <div className="h-full overflow-y-auto no-scrollbar pb-0">
        {renderContent()}
      </div>
      {onboardingStatus === OnboardingStep.COMPLETED && isTrialActive && !showPaywall && (
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      )}
    </div>
  );
};

export default App;
