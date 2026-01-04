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
import BottomNav from './components/BottomNav';
import DevTools from './components/DevTools';

const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'diagnose' | 'chat' | 'journal'>('home');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  
  // App initialization
  useEffect(() => {
    const initApp = async () => {
      // 1. Check local storage for basic state
      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      const trialStatus = localStorage.getItem('mastergrowbot_trial_active');
      const hasCompletedOnboarding = localStorage.getItem('mastergrowbot_onboarding_complete');

      if (savedProfile) setUserProfile(JSON.parse(savedProfile));
      if (trialStatus === 'true') setIsTrialActive(true);

      // 2. Load data if user is active
      if (hasCompletedOnboarding === 'true') {
          setOnboardingStatus(OnboardingStep.COMPLETED);
          loadUserData();
      } else {
          // Allow splash to run for 2.5 seconds then move to Onboarding
          setTimeout(() => {
             setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE);
          }, 2500);
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
      // Mock data for MVP
      const mockPlants: Plant[] = [
          { 
              id: '1', 
              name: 'Project Alpha', 
              strain: 'Blue Dream', 
              stage: 'Veg', 
              health: 92, 
              imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851?auto=format&fit=crop&q=80&w=1000', 
              totalDays: 24, 
              journal: [] 
          }
      ];
      setPlants(mockPlants);
      
      const mockTasks: Task[] = [
          { id: '1', title: 'Check pH (Target 6.2)', completed: false, date: new Date().toISOString() },
          { id: '2', title: 'Light 18/6 Cycle Check', completed: true, date: new Date().toISOString() },
      ];
      setTasks(mockTasks);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
      setUserProfile(profile);
      localStorage.setItem('mastergrowbot_profile', JSON.stringify(profile));
      setOnboardingStatus(OnboardingStep.SUMMARY);
  };

  const handleStartTrial = () => {
      setIsTrialActive(true);
      localStorage.setItem('mastergrowbot_trial_active', 'true');
      localStorage.setItem('mastergrowbot_onboarding_complete', 'true');
      setOnboardingStatus(OnboardingStep.COMPLETED);
      loadUserData();
  };

  const handleTabChange = (tab: any) => {
      if (!isTrialActive && tab === 'diagnose') {
          setShowPaywall(true);
      } else {
          setCurrentTab(tab);
      }
  };

  const handleTaskToggle = (taskId: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleAddJournalEntry = (entryData: Omit<JournalEntry, 'id' | 'date'>) => {
      if (plants.length === 0) return;
      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...entryData
      };
      setPlants(prev => {
          const updated = [...prev];
          updated[0].journal = [newEntry, ...updated[0].journal];
          return updated;
      });
  };

  const handleUpdatePlant = (plantId: string, updates: Partial<Plant>) => {
      setPlants(prev => prev.map(p => p.id === plantId ? { ...p, ...updates } : p));
  };

  // Render Logic
  if (onboardingStatus === OnboardingStep.SPLASH) return <Splash />;
  
  if (onboardingStatus !== OnboardingStep.COMPLETED && onboardingStatus !== OnboardingStep.SUMMARY) {
      return <Onboarding currentStep={onboardingStatus} onNext={(step) => setOnboardingStatus(step)} onComplete={handleOnboardingComplete} />;
  }

  if (onboardingStatus === OnboardingStep.SUMMARY) {
      return <OnboardingSummary userProfile={userProfile!} onStartTrial={handleStartTrial} />;
  }

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <div className="h-full w-full overflow-y-auto">
          {currentTab === 'home' && <Home plants={plants} tasks={tasks} onToggleTask={handleTaskToggle} onNavigateToPlant={() => setCurrentTab('journal')} />}
          {currentTab === 'diagnose' && <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />}
          {currentTab === 'chat' && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
          {currentTab === 'journal' && <Journal plants={plants} onAddEntry={handleAddJournalEntry} onUpdatePlant={handleUpdatePlant} />}
      </div>

      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} onPurchase={() => { setShowPaywall(false); handleStartTrial(); }} />}
      <BottomNav currentTab={currentTab} onChange={handleTabChange} />

      {/* DEV TOOLS for Testing */}
      <DevTools 
        onReset={() => { localStorage.clear(); window.location.reload(); }} 
        onInjectProfile={() => {
            const mockProfile = { experience: 'Intermediate', grow_mode: 'Indoor', goal: 'Yield', space: 'Tent' };
            setUserProfile(mockProfile as any);
            
            // Force save everything to Bypass Splash/Onboarding
            localStorage.setItem('mastergrowbot_profile', JSON.stringify(mockProfile));
            localStorage.setItem('mastergrowbot_trial_active', 'true');
            localStorage.setItem('mastergrowbot_onboarding_complete', 'true');
            
            // Force Reload to trigger initApp check
            window.location.reload(); 
        }} 
        onToggleTrial={() => {
            const newState = !isTrialActive;
            setIsTrialActive(newState);
            localStorage.setItem('mastergrowbot_trial_active', newState.toString());
            if(newState) {
                localStorage.setItem('mastergrowbot_onboarding_complete', 'true');
                setOnboardingStatus(OnboardingStep.COMPLETED);
            }
        }} 
        isTrialActive={isTrialActive} 
        currentStep={onboardingStatus} 
      />
    </div>
  );
};

export default App;
