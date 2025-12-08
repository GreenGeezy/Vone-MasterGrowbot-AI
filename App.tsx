import React, { useState, useEffect } from 'react';
import { AppScreen, Plant, Task, PlantStage, UserProfile, OnboardingStep, JournalEntry } from './types';
import BottomNav from './components/BottomNav';
import Home from './screens/Home';
import Diagnose from './screens/Diagnose';
import Chat from './screens/Chat';
import Paywall from './screens/Paywall';
import Journal from './screens/Journal';
import Onboarding from './screens/Onboarding';
import OnboardingSummary from './screens/OnboardingSummary';
import Splash from './screens/Splash';
import DevTools from './components/DevTools';
import { STRAIN_DATABASE } from './data/strains';
import { getUserProfile } from './services/supabaseClient';

// Mock Data for Prototype
const MOCK_USER_PROFILE: UserProfile = {
  experience: 'Intermediate',
  grow_mode: 'Indoor',
  goal: 'Maximize Yield',
  space: 'Medium'
};

// Initialize mock plants with strain details if they match our DB
const getStrainDetails = (name: string) => STRAIN_DATABASE.find(s => s.name === name);

const MOCK_PLANTS_DATA: Plant[] = [
  {
    id: '1',
    name: 'Northern Lights #5',
    strain: 'Northern Lights',
    // No exact match in DB for "Northern Lights", so strainDetails undefined initially
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
  },
  {
    id: '2',
    name: 'Blue Dream Auto',
    strain: 'Blue Dream',
    strainDetails: getStrainDetails('Blue Dream'),
    stage: PlantStage.FLOWER_EARLY,
    daysInStage: 12,
    totalDays: 67,
    healthScore: 82,
    imageUri: 'https://picsum.photos/200/200?random=2',
    nextHarvestDate: '2023-11-15',
    streak: 4,
    tasks: [],
    journal: [],
    weeklySummaries: [
        {
            id: 'w4',
            weekNumber: 6,
            date: 'Oct 20',
            healthScore: 88,
            imageUri: 'https://picsum.photos/200/200?random=13',
            aiNotes: "Pre-flower stretch complete. Vertical height increased by 40%. Nutrient demands shifting to P-K."
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
  // Onboarding & Auth State
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isTrialActive, setIsTrialActive] = useState(false);
  
  // App State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.HOME);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [plants, setPlants] = useState<Plant[]>(MOCK_PLANTS_DATA);

  // Load initial state
  useEffect(() => {
    const savedProfile = localStorage.getItem('mastergrowbot_profile');
    const trialActive = localStorage.getItem('mastergrowbot_trial_active');

    if (trialActive === 'true') {
      setIsTrialActive(true);
      setOnboardingStatus(OnboardingStep.COMPLETED);
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
    } else if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
    } else {
      setOnboardingStatus(OnboardingStep.SPLASH);
    }
  }, []);

  // Handlers for Onboarding Flow
  const handleSplashGetStarted = () => {
    setOnboardingStatus(OnboardingStep.QUIZ);
  };

  const handleSessionActive = async () => {
    try {
      // 1. Fetch Profile from Supabase
      const { data, error } = await getUserProfile();
      
      if (data && !error) {
        // 2. Map DB fields to App types
        const profile: UserProfile = {
          experience: data.experience as any,
          grow_mode: data.environment as any, // DB: environment -> App: grow_mode
          goal: data.goal as any,
          space: data.grow_space_size as any // DB: grow_space_size -> App: space
        };
        
        // 3. Update State
        setUserProfile(profile);
        localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
        updateTasksBasedOnProfile(profile);
        
        // 4. Skip Onboarding
        setOnboardingStatus(OnboardingStep.COMPLETED);
      } else {
        // Session exists but no profile (weird edge case), go to quiz
        console.warn("Session active but profile missing", error);
        setOnboardingStatus(OnboardingStep.QUIZ);
      }
    } catch (e) {
      console.error("Error hydrating session:", e);
      setOnboardingStatus(OnboardingStep.SPLASH);
    }
  };

  const handleQuizComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
    setOnboardingStatus(OnboardingStep.SUMMARY);
    updateTasksBasedOnProfile(profile);
  };

  const handleSummaryContinue = () => {
    setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
  };

  const handleTrialActivation = () => {
    localStorage.setItem('mastergrowbot_trial_active', 'true');
    setIsTrialActive(true);
    setOnboardingStatus(OnboardingStep.COMPLETED);
    setShowPaywall(false);
  };

  const handleSkipTrial = () => {
    // User clicked "Maybe Later" - proceed but don't activate trial features in state
    setOnboardingStatus(OnboardingStep.COMPLETED);
    setShowPaywall(false);
  };

  const updateTasksBasedOnProfile = (profile: UserProfile) => {
    const newTasks = [...DEFAULT_TASKS];
    // Add dynamic tasks based on profile
    if (profile.grow_mode === 'Indoor') {
      newTasks.unshift({ id: 'dev-1', title: 'Check Grow Light Height', completed: false, type: 'check' });
    }
    if (profile.goal === 'Maximize Yield') {
      newTasks.push({ id: 'dev-2', title: 'Review LST Techniques', completed: false, type: 'train' });
    }
    setTasks(newTasks);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleNavigate = (screen: AppScreen) => {
    setCurrentScreen(screen);
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
            updated[0] = {
                ...updated[0],
                journal: [newEntry, ...updated[0].journal]
            };
        }
        return updated;
    });

    // Only auto-navigate if it came from Chat or Diagnose
    if (currentScreen !== AppScreen.JOURNAL) {
        setTimeout(() => {
            setCurrentScreen(AppScreen.JOURNAL);
        }, 500);
    }
  };

  const handleUpdatePlant = (plantId: string, updates: Partial<Plant>) => {
    setPlants(prev => prev.map(p => p.id === plantId ? { ...p, ...updates } : p));
  };

  // Dev Tools Handlers
  const handleDevReset = () => {
    localStorage.removeItem('mastergrowbot_profile');
    localStorage.removeItem('mastergrowbot_trial_active');
    setUserProfile(null);
    setIsTrialActive(false);
    setOnboardingStatus(OnboardingStep.SPLASH);
    setTasks(DEFAULT_TASKS);
    setPlants(MOCK_PLANTS_DATA);
  };

  const handleDevInjectProfile = () => {
    setUserProfile(MOCK_USER_PROFILE);
    localStorage.setItem('mastergrowbot_profile', JSON.stringify(MOCK_USER_PROFILE));
    updateTasksBasedOnProfile(MOCK_USER_PROFILE);
    setOnboardingStatus(OnboardingStep.SUMMARY);
  };

  const handleDevToggleTrial = () => {
    if (isTrialActive) {
      setIsTrialActive(false);
      localStorage.removeItem('mastergrowbot_trial_active');
      setOnboardingStatus(OnboardingStep.TRIAL_PAYWALL);
    } else {
      setIsTrialActive(true);
      localStorage.setItem('mastergrowbot_trial_active', 'true');
      setOnboardingStatus(OnboardingStep.COMPLETED);
    }
  };

  const renderContent = () => {
    if (onboardingStatus === OnboardingStep.SPLASH) {
      return (
        <Splash 
          onGetStarted={handleSplashGetStarted} 
          onSessionActive={handleSessionActive} 
        />
      );
    }

    if (onboardingStatus === OnboardingStep.QUIZ) {
      return <Onboarding onComplete={handleQuizComplete} />;
    }

    if (onboardingStatus === OnboardingStep.SUMMARY && userProfile) {
      return <OnboardingSummary profile={userProfile} onContinue={handleSummaryContinue} />;
    }

    if (onboardingStatus === OnboardingStep.TRIAL_PAYWALL) {
      // Mandatory onboarding paywall - has Skip option
      return (
        <Paywall 
          onClose={handleTrialActivation} 
          onSkip={handleSkipTrial}
          isMandatory={true} 
          userProfile={userProfile} 
        />
      );
    }

    // Main App Screens
    switch (currentScreen) {
      case AppScreen.HOME:
        return (
          <Home 
            plants={plants} 
            tasks={tasks} 
            onToggleTask={handleToggleTask}
            onNavigateToPlant={() => setCurrentScreen(AppScreen.DIAGNOSE)} 
          />
        );
      case AppScreen.DIAGNOSE:
        return <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />;
      case AppScreen.CHAT:
        return <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />;
      case AppScreen.JOURNAL:
        return (
          <Journal 
             plants={plants} 
             tasks={tasks} 
             onToggleTask={handleToggleTask} 
             onAddEntry={handleAddJournalEntry}
             onUpdatePlant={handleUpdatePlant}
          />
        );
      case AppScreen.ACCOUNT:
        return (
          <div className="p-6 pt-12 h-full overflow-y-auto text-text-main bg-surface">
             <h1 className="text-2xl font-bold mb-6">My Account</h1>
             {userProfile && (
               <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-[10px] text-text-sub font-bold uppercase block mb-1">Level</span>
                    <p className="text-primary font-bold text-lg">{userProfile.experience}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-[10px] text-text-sub font-bold uppercase block mb-1">Setup</span>
                    <p className="text-text-main font-bold text-sm">{userProfile.grow_mode} • {userProfile.space}</p>
                  </div>
               </div>
             )}
             
             {isTrialActive ? (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-text-main font-bold text-lg">Pro Plan</span>
                        <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">ACTIVE</span>
                    </div>
                    <p className="text-sm text-text-sub mb-4 font-medium">Your free trial ends in 3 days.</p>
                    <button onClick={() => setShowPaywall(true)} className="w-full py-3 bg-white text-primary rounded-xl font-bold shadow-sm border border-primary/10 active:scale-95 transition-transform">
                        Manage Subscription
                    </button>
                </div>
             ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-text-main font-bold text-lg">Free Plan</span>
                    </div>
                    <p className="text-sm text-text-sub mb-4 font-medium">Upgrade to unlock unlimited AI features.</p>
                    <button onClick={() => setShowPaywall(true)} className="w-full py-3 bg-text-main text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
                        Upgrade to Pro
                    </button>
                </div>
             )}
          </div>
        );
      default:
        return <Home plants={plants} tasks={tasks} onToggleTask={handleToggleTask} onNavigateToPlant={() => {}} />;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen relative overflow-hidden shadow-2xl bg-surface border-x border-gray-100">
      
      <DevTools 
        onReset={handleDevReset} 
        onInjectProfile={handleDevInjectProfile}
        onToggleTrial={handleDevToggleTrial}
        isTrialActive={isTrialActive}
        currentStep={onboardingStatus}
      />

      <div className="h-full overflow-y-auto no-scrollbar pb-0">
        {renderContent()}
      </div>

      {onboardingStatus === OnboardingStep.COMPLETED && !showPaywall && (
        <BottomNav 
          currentScreen={currentScreen} 
          onNavigate={handleNavigate} 
        />
      )}

      {showPaywall && (
        <Paywall 
            onClose={handleTrialActivation} 
            isMandatory={false} 
            userProfile={userProfile} 
        />
      )}
    </div>
  );
};

export default App;