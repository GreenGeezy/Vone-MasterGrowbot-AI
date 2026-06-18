import React, { useState, useEffect, useRef } from 'react';
import { OnboardingStep, UserProfile, Plant, Task, AppScreen } from './types';
import Splash from './screens/Splash';
import Onboarding from './screens/Onboarding';
import OnboardingSummary from './screens/OnboardingSummary';
import Home from './screens/Home';
import Diagnose from './screens/Diagnose';
import StrainSearch from './screens/StrainSearch';
import Journal from './screens/Journal';
import Profile from './screens/Profile'; // Import Profile
import Paywall from './screens/Paywall';
import PostPaymentAuth from './screens/PostPaymentAuth';
import GetStartedTutorial from './screens/GetStartedTutorial';
import BottomNav from './components/BottomNav';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from './services/supabaseClient';
import { getPendingTasksForToday, toggleTaskCompletion, addNewTask, loadGrowData, createPlantRecord, saveAppJournalEntry, saveDiagnosisReport } from './services/dbService';
import { STRAIN_DATABASE } from './data/strains';
import ErrorBoundary from './components/ErrorBoundary';

import { getDailyInsight, wakeUpBackend } from './services/geminiService';
import { initializeApp } from './services/appInitializer';

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<AppScreen>(AppScreen.HOME);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false); // New Tutorial State
  const isAuthProcessing = useRef(false);

  useEffect(() => {
    const initApp = async () => {
      if (Capacitor.isNativePlatform()) await SplashScreen.hide();
      const init = await initializeApp();
      if (init.isReady && init.session?.access_token) wakeUpBackend();

      // --- AUTH DEEP LINK HANDLING ---
      // Helper function with Timeout & Error Handling
      const handleAuthDeepLink = async (urlStr: string) => {
        if (isAuthProcessing.current) {
          console.log("Auth already in progress, skipping duplicate link.");
          return;
        }

        const code = new URL(urlStr).searchParams.get('code');
        if (!code) return;

        try {
          isAuthProcessing.current = true;
          // 60s Timeout to guarantee sufficient time for network operations (especially on mobile)
          const exchangePromise = supabase.auth.exchangeCodeForSession(code);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Authentication timed out. Check connection.")), 60000)
          );

          // Race the exchange against the timeout
          const { data: sessionData, error } = await Promise.race([exchangePromise, timeoutPromise]) as any;

          if (error) throw error;

          if (sessionData?.session) {
            alert("Login Success!"); // User requested visible confirmation
            handleAuthSuccess();
          }
        } catch (err: any) {
          console.error("Auth Exchange Failed:", err);
          // Only alert meaningful errors
          if (err.message !== 'Auth session missing!') {
            alert(`Login Failed: ${err.message || 'Unknown error'}`);
          }
        } finally {
          isAuthProcessing.current = false;
        }
      };

      // 1. Check for Cold Start Deep Link (Crucial for Android)
      const launchUrl = await CapacitorApp.getLaunchUrl();
      if (launchUrl?.url && launchUrl.url.includes('code=')) {
        handleAuthDeepLink(launchUrl.url);
      }

      // 2. Runtime Deep Link Listener
      CapacitorApp.addListener('appUrlOpen', async (data) => {
        if (data.url.includes('code=')) {
          handleAuthDeepLink(data.url);
        }
      });

      // --- SESSION MANAGEMENT LOGIC ---
      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      let profileData: UserProfile | null = savedProfile ? JSON.parse(savedProfile) : null;

      if (profileData && init.isReturningSubscriber) {
        // RETURNING USER -> SKIP EVERYTHING
        console.log("Returning Subscriber Verified. Skipping Onboarding.");
        setUserProfile(profileData);
        setOnboardingStatus(OnboardingStep.COMPLETED);
        loadUserData();
      } else if (profileData && !init.isReturningSubscriber) {
        // EXPIRED/CANCELLED -> FORCE PAYWALL
        console.log("Subscription Expired. Redirecting to Paywall.");
        setUserProfile(profileData);
        setOnboardingStatus(OnboardingStep.SUMMARY); // Effectively re-onboard/pay
      } else {
        // NEW USER -> STAY ON EXISTING STATE (Default is SPLASH)
        // CRITICAL FIX: Do NOT force setOnboardingStatus(SPLASH) here.
        // If the user has already clicked "Start" and moved to QUIZ before this finishes,
        // resetting it to SPLASH causes the "Flash and Reset" bug.
        console.log("New User Detected. Waiting for interaction.");
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
    // --- Streak Logic ---
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem('mastergrowbot_last_visit');
    let currentStreak = parseInt(localStorage.getItem('mastergrowbot_streak') || '0');

    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastVisit === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1; // Reset if broken (or first time)
      }
      localStorage.setItem('mastergrowbot_last_visit', today);
      localStorage.setItem('mastergrowbot_streak', currentStreak.toString());

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

    // NEW USER CHECK: If they haven't seen tutorial, show it
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
    localStorage.setItem('mastergrowbot_profile', JSON.stringify(updated));
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

  if (onboardingStatus === OnboardingStep.SPLASH) return <Splash onGetStarted={() => setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE)} />;
  if (onboardingStatus === OnboardingStep.QUIZ_EXPERIENCE) return <Onboarding onComplete={(p) => { setUserProfile(p); setOnboardingStatus(OnboardingStep.SUMMARY); }} />;
  if (onboardingStatus === OnboardingStep.SUMMARY) return <OnboardingSummary profile={userProfile!} onContinue={() => { setOnboardingStatus(OnboardingStep.COMPLETED); setShowPaywall(true); }} />;

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <ErrorBoundary>
        <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === AppScreen.HOME && <Home plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onAddPlant={handleAddPlant} onNavigateToPlant={() => setCurrentTab(AppScreen.JOURNAL)} />}
          {currentTab === AppScreen.DIAGNOSE && <Diagnose onSaveToJournal={handleAddJournalEntry} onAddTask={handleAddTask} plant={plants[0]} defaultProfile={userProfile} onAddPlant={handleAddPlant} />}
          {currentTab === AppScreen.STRAINS && <StrainSearch onAddPlant={handleAddPlant} />}
          {currentTab === AppScreen.JOURNAL && <Journal plants={plants} tasks={tasks} onAddEntry={handleAddJournalEntry} onAddTask={handleAddTask} onUpdatePlant={(id: string, u: any) => setPlants(p => p.map(x => x.id === id ? { ...x, ...u } : x))} />}
          {currentTab === AppScreen.PROFILE && <Profile userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onViewTutorial={() => setShowTutorial(true)} onSignOut={async () => {
            if (Capacitor.getPlatform() !== 'web') {
              try { await Purchases.logOut(); } catch (e) { console.error("Error logging out of RevenueCat:", e); }
            }
            localStorage.clear();
            window.location.reload();
          }} />}
        </div>
      </ErrorBoundary>

      {showTutorial && <GetStartedTutorial onComplete={completeTutorial} />}

      {/* HARD PAYWALL: No onClose or onSkip provided to prevent bypass */}
      {showPaywall && <Paywall onClose={() => { }} onPurchase={() => { setShowPaywall(false); setShowAuth(true); }} onSkip={() => { }} />}

      {showAuth && <PostPaymentAuth onComplete={handleAuthSuccess} onSkip={handleAuthSuccess} userProfile={userProfile} />}

      <BottomNav currentScreen={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />
    </div>
  );
};
export default App;
