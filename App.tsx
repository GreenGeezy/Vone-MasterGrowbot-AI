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
import { getPendingTasksForToday, toggleTaskCompletion, addNewTask, updateTaskProperties, deleteTask, deleteJournalEntry, deletePlant } from './services/dbService';
import { STRAIN_DATABASE } from './data/strains';
import ErrorBoundary from './components/ErrorBoundary';
import { wakeUpBackend } from './services/geminiService';
import { initializeApp } from './services/appInitializer';

const App: React.FC = () => {
  // --- Global App Gate ---
  const [isAppReady, setIsAppReady] = useState(false);
  const [isReturningSubscriber, setIsReturningSubscriber] = useState(false);

  // --- App State ---
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
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
      console.log('[App] Boot sequence started');

      // Hide native splash screen
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }

      // Run the centralized initializer (auth + profile + RevenueCat)
      const init = await initializeApp();

      // Wake backend ONLY after auth is ready (guarantees JWT exists)
      if (init.isReady && init.session?.access_token) {
        wakeUpBackend();
      }

      if (!init.isReady) {
        console.error('[App] Initialization failed');
        // Still show Splash to let user retry
        setIsAppReady(true);
        return;
      }

      setIsReturningSubscriber(init.isReturningSubscriber);

      if (init.isReturningSubscriber && init.profile) {
        // Returning subscriber: skip onboarding, go straight to app
        const profileData: UserProfile = {
          ...init.profile,
          experience: init.profile.experience || 'Novice',
          grow_mode: init.profile.grow_mode || 'Indoor',
          goal: init.profile.goal || 'Maximize Yield',
          space: init.profile.space || 'Medium',
          isOnboarded: true,
          streak: init.profile.streak || 0,
          lastVisit: new Date().toISOString().split('T')[0],
        };
        setUserProfile(profileData);
        localStorage.setItem('mastergrowbot_profile', JSON.stringify(profileData));
        setOnboardingStatus(OnboardingStep.COMPLETED);
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
      console.log('[App] Boot complete. isReturningSubscriber:', init.isReturningSubscriber);
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
    const mockStrain = STRAIN_DATABASE[0];

    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem('mastergrowbot_last_visit');
    let currentStreak = parseInt(localStorage.getItem('mastergrowbot_streak') || '0');

    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastVisit === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      localStorage.setItem('mastergrowbot_last_visit', today);
      localStorage.setItem('mastergrowbot_streak', currentStreak.toString());
      setUserProfile(prev => prev ? ({ ...prev, streak: currentStreak, lastVisit: today }) : null);
    }

    setPlants([{
      id: '1',
      name: 'Project Alpha',
      strain: mockStrain.name,
      strainDetails: mockStrain,
      stage: 'Veg',
      healthScore: 92,
      daysInStage: 24,
      imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851',
      totalDays: 24,
      journal: [],
      tasks: [],
      streak: currentStreak,
      weeklySummaries: []
    }]);

    const pendingTasks = await getPendingTasksForToday();
    if (pendingTasks) setTasks(pendingTasks);
  };

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    setShowPaywall(false);
    setOnboardingStatus(OnboardingStep.COMPLETED);
    if (!userProfile?.hasSeenTutorial) {
      setShowTutorial(true);
    }
    loadUserData();
  };

  const handleAddJournalEntry = (entry: any) => {
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toLocaleDateString() };
    setPlants(prev => {
      if (prev.length > 0) {
        const updatedFirst = { ...prev[0], journal: [newEntry, ...prev[0].journal] };
        return [updatedFirst, ...prev.slice(1)];
      } else {
        const defaultPlant: Plant = {
          id: Date.now().toString(),
          name: 'My First Grow',
          strain: 'Generic',
          stage: 'Seedling',
          healthScore: 100,
          daysInStage: 1,
          imageUri: entry.image || entry.imageUri || 'https://images.unsplash.com/photo-1603796846097-b36976ea2851',
          totalDays: 1,
          journal: [newEntry],
          tasks: [],
          streak: 0,
          weeklySummaries: []
        };
        return [defaultPlant];
      }
    });
    setCurrentTab(AppScreen.JOURNAL);
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

  const handleAddPlant = (strain: any) => {
    const newPlant: Plant = {
      id: Date.now().toString(),
      name: `My ${strain.name}`,
      strain: strain.name,
      strainDetails: strain,
      stage: 'Seedling',
      healthScore: 100,
      daysInStage: 1,
      imageUri: strain.image || 'https://images.unsplash.com/photo-1603796846097-b36976ea2851',
      totalDays: 1,
      journal: [],
      tasks: [],
      streak: 0,
      weeklySummaries: []
    };
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
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setOnboardingStatus(OnboardingStep.SUMMARY);
  };

  const handleSummaryContinue = () => {
    setShowPaywall(true);
  };

  const handlePaywallPurchase = () => {
    setShowPaywall(false);
    setShowAuth(true);
  };

  // Auth retry helper (for child components)
  const retryAuth = async () => {
    const init = await initializeApp();
    if (init.isReady) {
      setIsReturningSubscriber(init.isReturningSubscriber);
      if (init.isReturningSubscriber && init.profile) {
        const profileData: UserProfile = {
          ...init.profile,
          experience: init.profile.experience || 'Novice',
          grow_mode: init.profile.grow_mode || 'Indoor',
          goal: init.profile.goal || 'Maximize Yield',
          space: init.profile.space || 'Medium',
          isOnboarded: true,
          streak: init.profile.streak || 0,
          lastVisit: new Date().toISOString().split('T')[0],
        };
        setUserProfile(profileData);
        localStorage.setItem('mastergrowbot_profile', JSON.stringify(profileData));
        setOnboardingStatus(OnboardingStep.COMPLETED);
        loadUserData();
      }
    }
  };

  // --- RENDER ---

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
  if (onboardingStatus === OnboardingStep.SUMMARY) {
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

  // 5. AUTH (after purchase)
  if (showAuth) {
    return (
      <PostPaymentAuth
        onComplete={handleAuthSuccess}
        onSkip={handleAuthSuccess}
        userProfile={userProfile}
      />
    );
  }

  // 6. MAIN APP
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

        {showTutorial && <GetStartedTutorial onComplete={completeTutorial} />}

        <BottomNav currentScreen={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />
      </ErrorBoundary>
    </div>
  );
};

export default App;
