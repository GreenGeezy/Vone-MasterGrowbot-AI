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
import GetStartedTutorial from './screens/GetStartedTutorial';
import BottomNav from './components/BottomNav';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from './services/supabaseClient';
import { getPendingTasksForToday, toggleTaskCompletion, addNewTask } from './services/dbService';
import { STRAIN_DATABASE } from './data/strains';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<AppScreen>(AppScreen.HOME);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false); // New Tutorial State

  useEffect(() => {
    const initApp = async () => {
      await SplashScreen.hide();

      if (Capacitor.getPlatform() === 'android') {
        await Purchases.configure({ apiKey: 'goog_kqOynvNRCABzUPrpfyFvlMvHUna' });
      }

      // 0. Check for Cold Start Deep Link (Crucial for Android/Brave)
      const launchUrl = await CapacitorApp.getLaunchUrl();
      if (launchUrl && launchUrl.url.includes('code=')) {
        alert(`Debug: App Launched via URL: ${launchUrl.url.substring(0, 50)}...`);
        try {
          // Process the code immediately
          const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(new URL(launchUrl.url).searchParams.get('code')!);
          if (error) {
            console.error("Launch Auth Error:", error);
            alert(`Launch Login Error: ${error.message}`);
          }
          if (sessionData.session) {
            console.log("Session established via Launch URL.");
            alert("Launch Login Success!"); // VISIBLE SUCCESS
            handleAuthSuccess(); // FORCE UI TRANSITION
            // loadUserData(); // handleAuthSuccess calls this anyway
          }
        } catch (err: any) {
          console.error("Launch Processing Failed:", err);
          alert(`Launch Link Error: ${err.message}`);
        }
      }

      CapacitorApp.addListener('appUrlOpen', async (data) => {
        if (data.url.includes('code=')) {
          // DEBUG: Alert so user sees what's happening
          alert(`Debug: Deep link received. URL: ${data.url.substring(0, 50)}...`);

          try {
            const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(new URL(data.url).searchParams.get('code')!);

            if (error) {
              console.error("Auth Exchange Error:", error);
              alert(`Login Error: ${error.message}`); // VISIBLE ERROR
            }

            if (sessionData.session) {
              console.log("Session established via Deep Link.");
              alert("Login Success! Syncing profile..."); // VISIBLE SUCCESS
              handleAuthSuccess(); // FORCE UI TRANSITION
              // loadUserData(); // handleAuthSuccess calls this anyway
            }
          } catch (err: any) {
            console.error("Deep Link Processing Failed:", err);
            alert(`Deep Link Error: ${err.message || JSON.stringify(err)}`); // VISIBLE ERROR
          }
        }
      });

      // --- SESSION MANAGEMENT LOGIC ---
      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      let profileData: UserProfile | null = savedProfile ? JSON.parse(savedProfile) : null;
      let isSubscribed = false;

      // 1. Check Subscription Status (Simulated check, replace with actual Entitlement logic in prod)
      try {
        if (Capacitor.getPlatform() !== 'web') {
          const { customerInfo } = await Purchases.getCustomerInfo();
          // Check for active entitlement "pro" or similar. Mocking true for local dev context if profile exists
          if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
            isSubscribed = true;
          }
        } else {
          // Web/Dev Logic: If they reached 'COMPLETED' or have profile, assume sub for now unless explicit logout
          // For strict testing: assumes true if profile exists locally
          if (profileData) isSubscribed = true;
        }
      } catch (e) {
        console.warn("Purchases check failed (dev mode?)", e);
        if (profileData) isSubscribed = true; // Fallback for dev
      }

      if (profileData && isSubscribed) {
        // RETURNING USER -> SKIP EVERYTHING
        console.log("Returning Subscriber Verified. Skipping Onboarding.");
        setUserProfile(profileData);
        setOnboardingStatus(OnboardingStep.COMPLETED);
        loadUserData();
      } else if (profileData && !isSubscribed) {
        // EXPIRED/CANCELLED -> FORCE PAYWALL
        console.log("Subscription Expired. Redirecting to Paywall.");
        setUserProfile(profileData);
        setOnboardingStatus(OnboardingStep.SUMMARY); // Effectively re-onboard/pay
      } else {
        // NEW USER -> START FROM SPLASH
        console.log("New User Detected.");
        setOnboardingStatus(OnboardingStep.SPLASH);
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
    const mockStrain = STRAIN_DATABASE[0];

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

    // Default Plant Data
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
      streak: currentStreak, // Use calculated streak
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

  const handleAddJournalEntry = (entry: any) => {
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toLocaleDateString() };
    setPlants(prev => {
      if (prev.length > 0) {
        // Add to existing first plant
        const updatedFirst = { ...prev[0], journal: [newEntry, ...prev[0].journal] };
        return [updatedFirst, ...prev.slice(1)];
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

  const handleAddPlant = (strain: any) => {
    const newPlant: Plant = {
      id: Date.now().toString(),
      name: `My ${strain.name}`,
      strain: strain.name,
      strainDetails: strain,
      stage: 'Seedling',
      healthScore: 100,
      daysInStage: 1,
      imageUri: strain.image || 'https://images.unsplash.com/photo-1603796846097-b36976ea2851', // Fallback or strain image
      totalDays: 1,
      journal: [],
      tasks: [],
      streak: 0,
      weeklySummaries: []
    };
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
          {currentTab === AppScreen.CHAT && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
          {currentTab === AppScreen.JOURNAL && <Journal plants={plants} tasks={tasks} onAddEntry={handleAddJournalEntry} onAddTask={handleAddTask} onUpdatePlant={(id: string, u: any) => setPlants(p => p.map(x => x.id === id ? { ...x, ...u } : x))} />}
          {currentTab === AppScreen.PROFILE && <Profile userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onViewTutorial={() => setShowTutorial(true)} onSignOut={() => { localStorage.clear(); window.location.reload(); }} />}
        </div>
      </ErrorBoundary>

      {showTutorial && <GetStartedTutorial onComplete={completeTutorial} />}

      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} onPurchase={() => { setShowPaywall(false); setShowAuth(true); }} onSkip={() => setShowPaywall(false)} />}

      {showAuth && <PostPaymentAuth onComplete={handleAuthSuccess} onSkip={handleAuthSuccess} userProfile={userProfile} />}

      <BottomNav currentScreen={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />
    </div>
  );
};
export default App;
