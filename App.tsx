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
import { getPendingTasksForToday, toggleTaskCompletion, addNewTask, updateTaskProperties, deleteTask, deleteJournalEntry, deletePlant, loadGrowData, createPlantRecord, saveAppJournalEntry, saveDiagnosisReport } from './services/dbService';
import ErrorBoundary from './components/ErrorBoundary';
import { wakeUpBackend } from './services/geminiService';
import { initializeApp } from './services/appInitializer';

// --- LocalStorage Keys for State Persistence ---
const LS_ONBOARDING_STATUS = 'mg_onboarding_status';
const LS_PROFILE = 'mastergrowbot_profile';
const LS_LAST_VISIT = 'mastergrowbot_last_visit';
const LS_STREAK = 'mastergrowbot_streak';

const App: React.FC = () => {
  // --- Global App Gate ---
  const [isAppReady, setIsAppReady] = useState(false);
  const [isReturningSubscriber, setIsReturningSubscriber] = useState(false);

  // --- App State ---
  const [onboardingStatus, setOnboardingStatus] = useState(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<AppScreen>(AppScreen.HOME);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const isAuthProcessing = useRef(false);

  // --- Initialization: Hard App Gate ---
  useEffect(() => {
    const boot = async () => {
      // Hide native splash screen
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }

      // Restore persisted onboarding state BEFORE initializing
      const savedOnboardingStatus = localStorage.getItem(LS_ONBOARDING_STATUS);
      const savedProfile = localStorage.getItem(LS_PROFILE);
      let savedProfileData: any = null;

      if (savedOnboardingStatus) {
        setOnboardingStatus(savedOnboardingStatus);
      }
      if (savedProfile) {
        try {
          savedProfileData = JSON.parse(savedProfile);
          setUserProfile(savedProfileData);
        } catch { /* ignore parse error */ }
      }

      // Run the centralized initializer (auth + profile + RevenueCat)
      const init = await initializeApp();

      // Wake backend ONLY after auth is ready (guarantees JWT exists)
      if (init.isReady && init.session?.access_token) {
        wakeUpBackend();
      }

      if (!init.isReady) {
        console.error('[App] Initialization failed');
        setIsAppReady(true);
        return;
      }

      setIsReturningSubscriber(init.isReturningSubscriber);

      if (init.isReturningSubscriber) {
        // Returning subscriber: skip onboarding, go straight to app
        const profileSource = init.profile || savedProfileData || {};
        const profileData = {
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
      }

      // Deep link handling (native only)
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

    return () => {
      // Cleanup capacitor listeners if needed
    };
  }, []);

  const handleAuthDeepLink = async (urlStr: string) => {
    const { supabase } = await import('./services/supabaseClient');
    if (isAuthProcessing.current) return;
    const code = new URL(urlStr).searchParams.get('code');
    if (!code) return;

    try {
      isAuthProcessing.current = true;
      const exchangePromise = supabase.auth.exchangeCodeForSession(code);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timed out.')), 60000)
      );
      const { data: sessionData, error } = await Promise.race([exchangePromise, timeoutPromise]) as any;
      if (error) throw error;
      if (sessionData?.session) {
        alert('Login Success!');
        handleAuthSuccess();
      }
    } catch (err: any) {
      console.error('Auth Exchange Failed:', err);
      if (err.message !== 'Auth session missing!') {
        alert(`Login Failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      isAuthProcessing.current = false;
    }
  };

  // --- User Data Loading ---
  const loadUserData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem(LS_LAST_VISIT);
    let currentStreak = parseInt(localStorage.getItem(LS_STREAK) || '0');

    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastVisit === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      localStorage.setItem(LS_LAST_VISIT, today);
      localStorage.setItem(LS_STREAK, currentStreak.toString());
      setUserProfile(prev => prev ? ({ ...prev, streak: currentStreak, lastVisit: today }) : null);
    }

    const loadedPlants = await loadGrowData(currentStreak);
    setPlants(loadedPlants);

    const pendingTasks = await getPendingTasksForToday();
    if (pendingTasks) setTasks(pendingTasks);
  };

  // --- AUTH SUCCESS (after purchase) ---
  // CRITICAL: This is the ONLY path from paywall → tutorial → main app
  const handleAuthSuccess = async () => {
    // 1. Close auth screen
    setShowAuth(false);
    setShowPaywall(false);

    // 2. Mark onboarding as COMPLETED and persist
    setOnboardingStatus(OnboardingStep.COMPLETED);
    localStorage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.COMPLETED);

    // 3. Mark profile as onboarded and persist
    if (userProfile) {
      const updated = { ...userProfile, isOnboarded: true };
      setUserProfile(updated);
      localStorage.setItem(LS_PROFILE, JSON.stringify(updated));
    }

    // 4. Show tutorial if not seen
    const hasSeenTutorial = userProfile?.hasSeenTutorial;
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }

    // 5. Load user data
    loadUserData();
  };

  const handleAddJournalEntry = async (entry: any, plantIdOverride?: string) => {
    const targetPlantId = plantIdOverride || entry.plantId || plants[0]?.id;
    const newEntry = { ...entry, id: `local_${Date.now()}`, date: new Date().toLocaleDateString(), plantId: targetPlantId };
    setPlants(prev => {
      if (prev.length === 0) return prev;
      return prev.map(plant => plant.id === targetPlantId
        ? { ...plant, journal: [newEntry, ...plant.journal] }
        : plant
      );
    });
    setCurrentTab(AppScreen.JOURNAL);

    try {
      const savedEntry = await saveAppJournalEntry(targetPlantId, newEntry);
      await saveDiagnosisReport(targetPlantId, newEntry);
      setPlants(prev => prev.map(plant => plant.id === targetPlantId
        ? { ...plant, journal: plant.journal.map((j: any) => j.id === newEntry.id ? savedEntry : j) }
        : plant
      ));
    } catch (error) {
      console.warn('Journal save failed; optimistic entry kept locally:', error);
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
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: newStatus, completed: newStatus } : t));
    await toggleTaskCompletion(taskId, newStatus);
  };

  const handleAddTask = async (title: string, date: string, source: 'user' | 'ai_diagnosis' = 'user', options?: { recurrence?: 'daily' | 'weekly', notes?: string }) => {
    const tempId = Date.now().toString();
    const optimisticTask: Task = {
      id: tempId,
      title,
      dueDate: date,
      plantId: plants[0]?.id,
      isCompleted: false,
      completed: false,
      source,
      recurrence: options?.recurrence,
      notes: options?.notes,
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [...prev, optimisticTask]);

    const savedTask = await addNewTask({
      title,
      dueDate: date,
      plantId: plants[0]?.id,
      source,
      type: 'other',
      recurrence: options?.recurrence,
      notes: options?.notes
    });

    if (savedTask) {
      setTasks(prev => prev.map(t => t.id === tempId ? savedTask : t));
    }
  };

  const handleUpdateTask = async (taskId: string, title: string, notes?: string, recurrence?: 'daily' | 'weekly' | 'once' | string) => {
    const updates: any = { title, notes, recurrence };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    setPlants(prev => prev.map(plant => ({
      ...plant,
      tasks: plant.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    })));
    await updateTaskProperties(taskId, updates);
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setPlants(prev => prev.map(plant => ({
      ...plant,
      tasks: plant.tasks.filter(t => t.id !== taskId)
    })));
    await deleteTask(taskId);
  };

  const handleDeleteEntry = async (entryId: string, plantId: string) => {
    setPlants(prev => prev.map(plant =>
      plant.id === plantId
        ? { ...plant, journal: plant.journal.filter((j: any) => j.id !== entryId) }
        : plant
    ));
    await deleteJournalEntry(entryId);
  };

  const handleDeletePlant = async (plantId: string) => {
    setPlants(prev => prev.filter(p => p.id !== plantId));
    setTasks(prev => prev.filter(t => t.plantId !== plantId && (t as any).plant_id !== plantId));
    await deletePlant(plantId);
  };

  const handleAddPlant = async (strain: any) => {
    const newPlant = await createPlantRecord(strain);
    if (!newPlant) return;
    setPlants(prev => [...prev, newPlant]);
    handleAddTask(`Start journal for ${strain.name}`, new Date().toISOString().split('T')[0], 'user');
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    handleUpdateProfile({ hasSeenTutorial: true });
  };

  // --- ONBOARDING FLOW HANDLERS ---

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

  // CRITICAL FIX: After purchase, go directly to auth screen
  // Do NOT go back to summary
  const handlePaywallPurchase = () => {
    setShowPaywall(false);
    setShowAuth(true);
  };

  // Auth retry helper (for child components)
  const retryAuth = async () => {
    const init = await initializeApp();
    if (init.isReady) {
      setIsReturningSubscriber(init.isReturningSubscriber);
      if (init.isReturningSubscriber) {
        const profileSource: any = init.profile || userProfile || {};
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
      }
    }
  };

  // --- RENDER ---
  // CRITICAL: Render order matters. Each condition is mutually exclusive.

  // 1. LOADING STATE (before initializeApp completes)
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

  // 2. SPLASH (new user, not yet started onboarding)
  if (onboardingStatus === OnboardingStep.SPLASH) {
    return (
      <ErrorBoundary>
        <Splash onGetStarted={handleGetStarted} />
      </ErrorBoundary>
    );
  }

  // 3. ONBOARDING QUIZ
  if (onboardingStatus === OnboardingStep.QUIZ_EXPERIENCE) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 4. ONBOARDING SUMMARY → PAYWALL
  // CRITICAL: Only show summary/paywall if we're NOT in auth or tutorial
  if (onboardingStatus === OnboardingStep.SUMMARY && !showAuth && !showTutorial) {
    if (!userProfile) return null;
    if (showPaywall) {
      return (
        <ErrorBoundary>
          <Paywall
            onClose={() => setShowPaywall(false)}
            onPurchase={handlePaywallPurchase}
            onSkip={() => {}}
          />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <OnboardingSummary profile={userProfile} onContinue={handleSummaryContinue} />
      </ErrorBoundary>
    );
  }

  // 5. POST-PAYMENT AUTH SCREEN (after purchase)
  // This MUST come BEFORE the main app so it renders over everything
  if (showAuth) {
    return (
      <PostPaymentAuth
        onComplete={handleAuthSuccess}
        onSkip={handleAuthSuccess}
        userProfile={userProfile}
      />
    );
  }

  // 6. TUTORIAL (shown after auth success, before main app)
  // Only show tutorial if onboarding is completed but tutorial hasn't been seen
  if (showTutorial && onboardingStatus === OnboardingStep.COMPLETED) {
    return (
      <GetStartedTutorial onComplete={completeTutorial} />
    );
  }

  // 7. MAIN APP (onboarding completed, tutorial done or skipped)
  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <ErrorBoundary>
        <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === AppScreen.HOME && <Home plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onEditTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onDeletePlant={handleDeletePlant} onAddPlant={() => setCurrentTab(AppScreen.STRAINS)} onNavigateToPlant={() => setCurrentTab(AppScreen.JOURNAL)} />}
          {currentTab === AppScreen.DIAGNOSE && <Diagnose onSaveToJournal={handleAddJournalEntry} onAddTask={handleAddTask} plant={plants[0]} defaultProfile={userProfile} onAddPlant={handleAddPlant} />}
          {currentTab === AppScreen.STRAINS && <StrainSearch onAddPlant={handleAddPlant} />}
          {currentTab === AppScreen.JOURNAL && <Journal plants={plants} tasks={tasks} onAddEntry={handleAddJournalEntry} onAddTask={handleAddTask} onEditTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onDeleteEntry={handleDeleteEntry} onUpdatePlant={(id: string, u: any) => setPlants(p => p.map(x => x.id === id ? { ...x, ...u } : x))} />}
          {currentTab === AppScreen.PROFILE && <Profile userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onViewTutorial={() => setShowTutorial(true)} onSignOut={() => { localStorage.clear(); window.location.reload(); }} />}
        </div>

        <BottomNav currentScreen={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />
      </ErrorBoundary>
    </div>
  );
};

export default App;
