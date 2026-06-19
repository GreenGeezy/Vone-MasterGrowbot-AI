import React, { useState, useEffect, useRef } from 'react';
import { OnboardingStep, UserProfile, Plant, Task, AppScreen } from './types';
import Splash from './screens/Splash';
import Onboarding from './screens/Onboarding';
import OnboardingSummary from './screens/OnboardingSummary';
import Home from './screens/Home';
import Diagnose from './screens/Diagnose';
import StrainSearch from './screens/StrainSearch';
import Journal from './screens/Journal';
import Profile from './screens/Profile';
import Paywall from './screens/Paywall';
import PostPaymentAuth from './screens/PostPaymentAuth';
import GetStartedTutorial from './screens/GetStartedTutorial';
import BottomNav from './components/BottomNav';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { getPendingTasksForToday, toggleTaskCompletion, addNewTask, loadGrowData, createPlantRecord, saveAppJournalEntry, saveDiagnosisReport } from './services/dbService';
import { STRAIN_DATABASE } from './data/strains';
import ErrorBoundary from './components/ErrorBoundary';

import { getDailyInsight, wakeUpBackend } from './services/geminiService';
import { initializeApp } from './services/appInitializer';

const LS_ONBOARDING_STATUS = 'mg_onboarding_status';
const LS_PROFILE = 'mastergrowbot_profile';
const LS_LAST_VISIT = 'mastergrowbot_last_visit';
const LS_STREAK = 'mastergrowbot_streak';

const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<AppScreen>(AppScreen.HOME);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const isAuthProcessing = useRef(false);

  useEffect(() => {
    const boot = async () => {
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }

      const savedOnboardingStatus = localStorage.getItem(LS_ONBOARDING_STATUS);
      const savedProfile = localStorage.getItem(LS_PROFILE);

      if (savedOnboardingStatus) {
        setOnboardingStatus(savedOnboardingStatus as OnboardingStep);
      }

      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile));
        } catch (error) {
          console.warn('[App] Saved profile could not be parsed:', error);
        }
      }

      const init = await initializeApp();
      if (init.isReady && init.session?.access_token) wakeUpBackend();

      if (!init.isReady) {
        console.error('[App] Initialization failed');
        setIsAppReady(true);
        return;
      }

      if (init.isReturningSubscriber && (init.profile || savedProfile)) {
        const profileSource = init.profile || JSON.parse(savedProfile || '{}');
        const profileData: UserProfile = {
          ...profileSource,
          experience: profileSource.experience || 'Novice',
          grow_mode: profileSource.grow_mode || 'Indoor',
          goal: profileSource.goal || 'Maximize Yield',
          space: profileSource.space || 'Medium',
          isOnboarded: true,
          streak: profileSource.streak || 0,
          lastVisit: new Date().toISOString().split('T')[0],
        };
        setUserProfile(profileData);
        localStorage.setItem(LS_PROFILE, JSON.stringify(profileData));
        setOnboardingStatus(OnboardingStep.COMPLETED);
        localStorage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.COMPLETED);
        loadUserData();
      } else if (savedProfile && savedOnboardingStatus === OnboardingStep.COMPLETED) {
        setOnboardingStatus(OnboardingStep.SUMMARY);
        localStorage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.SUMMARY);
      }

      if (Capacitor.isNativePlatform()) {
        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (launchUrl?.url && launchUrl.url.includes('code=')) {
          handleAuthDeepLink(launchUrl.url);
        }

        CapacitorApp.addListener('appUrlOpen', async (data) => {
          if (data.url.includes('code=')) {
            handleAuthDeepLink(data.url);
          }
        });
      }

      setIsAppReady(true);
    };
    boot();
  }, []);

  const handleAuthDeepLink = async (urlStr: string) => {
    const { supabase } = await import('./services/supabaseClient');
    if (isAuthProcessing.current) {
      console.log("Auth already in progress, skipping duplicate link.");
      return;
    }

    const code = new URL(urlStr).searchParams.get('code');
    if (!code) return;

    try {
      isAuthProcessing.current = true;
      const exchangePromise = supabase.auth.exchangeCodeForSession(code);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Authentication timed out. Check connection.")), 60000)
      );

      const { data: sessionData, error } = await Promise.race([exchangePromise, timeoutPromise]) as any;
      if (error) throw error;

      if (sessionData?.session) {
        alert("Login Success!");
        handleAuthSuccess();
      }
    } catch (err: any) {
      console.error("Auth Exchange Failed:", err);
      if (err.message !== 'Auth session missing!') {
        alert(`Login Failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      isAuthProcessing.current = false;
    }
  };

  const loadUserData = async () => {
    // --- Streak Logic ---
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem(LS_LAST_VISIT);
    let currentStreak = parseInt(localStorage.getItem(LS_STREAK) || '0');

    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastVisit === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1; // Reset if broken (or first time)
      }
      localStorage.setItem(LS_LAST_VISIT, today);
      localStorage.setItem(LS_STREAK, currentStreak.toString());

      // Update profile state if it exists
      setUserProfile(prev => prev ? ({ ...prev, streak: currentStreak, lastVisit: today }) : null);
    }

    const savedPlants = await loadGrowData(currentStreak);
    setPlants(savedPlants.length ? savedPlants : [{
      id: 'local_default',
      name: 'My First Grow',
      strain: STRAIN_DATABASE[0].name,
      strainDetails: STRAIN_DATABASE[0],
      stage: 'Seedling',
      healthScore: 100,
      daysInStage: 1,
      imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851',
      totalDays: 1,
      journal: [],
      tasks: [],
      streak: currentStreak,
      weeklySummaries: []
    }]);

    // Fetch real tasks
    const pendingTasks = await getPendingTasksForToday();
    if (pendingTasks) setTasks(pendingTasks);
  };

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    setShowPaywall(false);
    setOnboardingStatus(OnboardingStep.COMPLETED);
    localStorage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.COMPLETED);

    if (userProfile) {
      const updated = { ...userProfile, isOnboarded: true };
      setUserProfile(updated);
      localStorage.setItem(LS_PROFILE, JSON.stringify(updated));
    }

    if (!userProfile?.hasSeenTutorial) {
      setShowTutorial(true);
    }

    loadUserData();
  };

  const handleAddJournalEntry = async (entry: any, plantIdOverride?: string) => {
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toLocaleDateString() };
    const targetPlantId = plantIdOverride || entry.plantId || entry.plant_id || plants[0]?.id;
    setPlants(prev => {
      if (prev.length > 0) {
        return prev.map((plant, index) =>
          plant.id === targetPlantId || (!targetPlantId && index === 0)
            ? { ...plant, journal: [newEntry, ...plant.journal] }
            : plant
        );
      } else {
        // Create Default Plant to save entry
        const defaultPlant: Plant = {
          id: Date.now().toString(),
          name: 'My First Grow',
          strain: 'Generic',
          stage: 'Seedling',
          healthScore: 100,
          daysInStage: 1,
          imageUri: entry.image || entry.imageUri || 'https://images.unsplash.com/photo-1603796846097-b36976ea2851',
          totalDays: 1,
          journal: [newEntry], // Initialize with this entry
          tasks: [],
          streak: 0,
          weeklySummaries: []
        };
        return [defaultPlant];
      }
    });
    setCurrentTab(AppScreen.JOURNAL);

    try {
      const savedEntry = await saveAppJournalEntry(targetPlantId, entry);
      await saveDiagnosisReport(targetPlantId, { ...entry, imageUri: savedEntry.imageUri || entry.imageUri || entry.image });
      setPlants(prev => prev.map(plant =>
        plant.id === targetPlantId
          ? { ...plant, journal: plant.journal.map(j => j.id === newEntry.id ? savedEntry : j) }
          : plant
      ));
    } catch (error) {
      console.warn('Journal save failed; optimistic local entry remains:', error);
    }
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...updates };
    setUserProfile(updated);
    localStorage.setItem(LS_PROFILE, JSON.stringify(updated));
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = !task.isCompleted;

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: newStatus, completed: newStatus } : t));

    await toggleTaskCompletion(taskId, newStatus);
  };

  const handleAddTask = async (title: string, date: string, source: 'user' | 'ai_diagnosis' = 'user', options?: { recurrence?: 'daily' | 'weekly', notes?: string }) => {
    const tempId = Date.now().toString();
    const optimisticTask: Task = {
      id: tempId,
      title,
      dueDate: date,
      isCompleted: false,
      completed: false, // Legacy
      source,
      recurrence: options?.recurrence,
      notes: options?.notes,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [...prev, optimisticTask]);

    const savedTask = await addNewTask({
      plantId: plants[0]?.id,
      title,
      dueDate: date,
      source,
      type: 'other', // Default
      recurrence: options?.recurrence,
      notes: options?.notes
    });

    if (savedTask) {
      setTasks(prev => prev.map(t => t.id === tempId ? savedTask : t));
    }
  };

  const handleAddPlant = async (strain: any) => {
    const newPlant = await createPlantRecord(strain);
    if (!newPlant) return;
    setPlants(prev => [...prev, newPlant]);
    // Optionally create a starter task?
    handleAddTask(`Start journal for ${strain.name}`, new Date().toISOString().split('T')[0], 'user');
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    handleUpdateProfile({ hasSeenTutorial: true });
  };

  const handleGetStarted = () => {
    setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE);
    localStorage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.QUIZ_EXPERIENCE);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
    setOnboardingStatus(OnboardingStep.SUMMARY);
    localStorage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.SUMMARY);
  };

  const handleSummaryContinue = () => {
    setShowPaywall(true);
  };

  const handlePaywallPurchase = () => {
    setShowPaywall(false);
    setShowAuth(true);
  };

  if (!isAppReady) {
    return (
      <div className="h-screen w-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-text-sub">Loading MasterGrowbot...</p>
        </div>
      </div>
    );
  }

  if (onboardingStatus === OnboardingStep.SPLASH) {
    return <Splash onGetStarted={handleGetStarted} />;
  }

  if (onboardingStatus === OnboardingStep.QUIZ_EXPERIENCE) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (onboardingStatus === OnboardingStep.SUMMARY && !showAuth && !showTutorial) {
    if (!userProfile) return null;
    if (showPaywall) {
      return (
        <ErrorBoundary>
          <Paywall onClose={() => { }} onPurchase={handlePaywallPurchase} onSkip={() => { }} />
        </ErrorBoundary>
      );
    }
    return <OnboardingSummary profile={userProfile} onContinue={handleSummaryContinue} />;
  }

  if (showAuth) {
    return <PostPaymentAuth onComplete={handleAuthSuccess} onSkip={handleAuthSuccess} userProfile={userProfile} />;
  }

  if (showTutorial && onboardingStatus === OnboardingStep.COMPLETED) {
    return <GetStartedTutorial onComplete={completeTutorial} />;
  }

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <ErrorBoundary>
        <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === AppScreen.HOME && <Home plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onAddPlant={handleAddPlant} onNavigateToPlant={() => setCurrentTab(AppScreen.JOURNAL)} />}
          {currentTab === AppScreen.DIAGNOSE && <Diagnose onSaveToJournal={handleAddJournalEntry} onAddTask={handleAddTask} plant={plants[0]} defaultProfile={userProfile} onAddPlant={handleAddPlant} />}
          {currentTab === AppScreen.STRAINS && <StrainSearch onAddPlant={handleAddPlant} />}
          {currentTab === AppScreen.JOURNAL && <Journal plants={plants} tasks={tasks} onAddEntry={handleAddJournalEntry} onAddTask={handleAddTask} onUpdatePlant={(id: string, u: any) => setPlants(p => p.map(x => x.id === id ? { ...x, ...u } : x))} />}
          {currentTab === AppScreen.PROFILE && <Profile userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onViewTutorial={() => setShowTutorial(true)} onSignOut={async () => {
            localStorage.clear();
            window.location.reload();
          }} />}
        </div>
      </ErrorBoundary>

      {showTutorial && <GetStartedTutorial onComplete={completeTutorial} />}

      <BottomNav currentScreen={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />
    </div>
  );
};
export default App;
