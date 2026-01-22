import React, { useState, useEffect } from 'react';
import { OnboardingStep, UserProfile, Plant, Task } from './types';
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
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from './services/supabaseClient';
import { STRAIN_DATABASE } from './data/strains'; // Integrated Strain DB
import { User, LogOut, Shield, FileText } from 'lucide-react';

// --- Profile Component ---
const ProfileScreen: React.FC<{ 
  userProfile: UserProfile | null; 
  onSignOut: () => void; 
}> = ({ userProfile, onSignOut }) => {
    
  const openPrivacyPolicy = () => {
      window.open('https://www.mastergrowbot.com/privacy-policy', '_system');
  };

  return (
      <div className="p-6 pt-12 h-full overflow-y-auto bg-surface">
          <h1 className="text-2xl font-bold mb-6 text-text-main">Profile</h1>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} />
              </div>
              <h2 className="text-lg font-bold text-text-main">{userProfile?.experience || "Grower"}</h2>
              <div className="inline-flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md mt-1">
                <Shield size={12} className="text-primary" />
                <p className="text-xs font-bold text-primary">Pro Member</p>
              </div>
          </div>

          <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Legal & Support</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button 
                    onClick={openPrivacyPolicy}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
                  >
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                              <FileText size={16} />
                          </div>
                          <span className="font-medium text-text-main">Privacy Policy</span>
                      </div>
                      <Shield size={16} className="text-gray-300" />
                  </button>
              </div>
          </div>

          <button onClick={onSignOut} className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
              <LogOut size={20} /> Sign Out
          </button>
          
          <p className="text-center text-xs text-gray-300 mt-8 mb-20">Version 1.0.2 (Strain Update)</p>
      </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStep>(OnboardingStep.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'diagnose' | 'chat' | 'journal' | 'profile'>('home');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
   
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
   
  useEffect(() => {
    const initApp = async () => {
      await SplashScreen.hide();

      // Deep Link Handler
      CapacitorApp.addListener('appUrlOpen', async (data) => {
          if (data.url.includes('code=')) {
              const urlObj = new URL(data.url);
              const code = urlObj.searchParams.get('code');
              if (code) {
                  const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
                  if (sessionData.session) {
                      handleAuthSuccess(sessionData.session.user.id);
                  }
              }
          }
      });

      // RevenueCat Init
      if (Capacitor.isNativePlatform()) {
          await Purchases.configure({ apiKey: 'goog_kqOynvNRCABzUPrpfyFvlMvHUna' });
          try {
              const customerInfo = await Purchases.getCustomerInfo();
              if (customerInfo.entitlements.active['pro']) {
                  setIsTrialActive(true);
              }
          } catch (e) { console.error(e); }
      }

      // Check Session & Load Profile
      const { data: { session } } = await supabase.auth.getSession();
      const savedProfile = localStorage.getItem('mastergrowbot_profile');
      if (savedProfile) setUserProfile(JSON.parse(savedProfile));

      if (session) {
          setIsTrialActive(true);
          setOnboardingStatus(OnboardingStep.COMPLETED);
          loadUserData();
      } else {
          if (localStorage.getItem('mastergrowbot_onboarding_complete') === 'true') {
             setOnboardingStatus(OnboardingStep.COMPLETED);
             loadUserData();
          } else if (savedProfile) {
             setOnboardingStatus(OnboardingStep.SUMMARY);
          }
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
      // STRAIN INTELLIGENCE INTEGRATION
      // We explicitly look up the strain from the DB to ensure badges/details appear
      const mockStrain = STRAIN_DATABASE.find(s => s.name === 'Blue Dream') || STRAIN_DATABASE[0];

      setPlants([{ 
          id: '1', 
          name: 'Project Alpha', 
          strain: mockStrain.name, 
          strainDetails: mockStrain, // Injects detailed genetics data
          stage: 'Veg', 
          healthScore: 92, 
          age_days: 24, 
          imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851?auto=format&fit=crop&q=80&w=1000', 
          totalDays: 24, 
          journal: [],
          tasks: [],
          weeklySummaries: []
      }]);

      setTasks([
          { id: '1', title: 'Check pH levels', completed: false, date: new Date().toISOString(), type: 'check' },
          { id: '2', title: 'Light feeding (CalMag)', completed: false, date: new Date().toISOString(), type: 'feed' }
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

  const handleGetStarted = () => {
      setOnboardingStatus(OnboardingStep.QUIZ_EXPERIENCE);
  };

  const handlePaymentSuccess = () => {
      setIsTrialActive(true);
      setShowPaywall(false);
      setShowAuth(true); 
  };

  const handleAuthSuccess = async (userId?: string) => {
      setShowAuth(false);
      setShowPaywall(false);
      setIsTrialActive(true);
      localStorage.setItem('mastergrowbot_onboarding_complete', 'true');
      setOnboardingStatus(OnboardingStep.COMPLETED); 
      if (userId && Capacitor.isNativePlatform()) {
          await Purchases.logIn({ appUserID: userId });
      }
      loadUserData();
  };

  const handleAddJournalEntry = (entry: any) => {
      const newEntry = { 
          ...entry, 
          id: Date.now().toString(), 
          date: new Date().toLocaleDateString() 
      };
      
      setPlants(prevPlants => {
          const updatedPlants = [...prevPlants];
          if (updatedPlants[0]) {
              updatedPlants[0] = { 
                  ...updatedPlants[0], 
                  journal: [newEntry, ...updatedPlants[0].journal] 
              };
          }
          return updatedPlants;
      });
      setCurrentTab('journal');
  };

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      window.location.reload();
  };

  const handleTabChange = (tab: any) => {
      if (!isTrialActive && Capacitor.isNativePlatform()) {
          setShowPaywall(true);
      } else {
          setCurrentTab(tab);
      }
  };

  // Onboarding Flow
  if (onboardingStatus === OnboardingStep.SPLASH) return <Splash onGetStarted={handleGetStarted} />;
  if (onboardingStatus === OnboardingStep.QUIZ_EXPERIENCE) return <Onboarding onComplete={handleOnboardingComplete} />;
  if (onboardingStatus === OnboardingStep.SUMMARY) return <OnboardingSummary profile={userProfile!} onContinue={handleSummaryContinue} />;

  // Main App Flow
  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === 'home' && <Home plants={plants} tasks={tasks} onToggleTask={(id) => setTasks(t => t.map(x => x.id === id ? {...x, completed: !x.completed} : x))} onNavigateToPlant={() => setCurrentTab('journal')} />}
          {currentTab === 'diagnose' && <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />}
          {currentTab === 'chat' && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
          {currentTab === 'journal' && <Journal plants={plants} onAddEntry={handleAddJournalEntry} />}
          {currentTab === 'profile' && <ProfileScreen userProfile={userProfile} onSignOut={handleSignOut} />}
      </div>

      {showPaywall && (
        <Paywall onClose={() => setShowPaywall(false)} onPurchase={handlePaymentSuccess} onSkip={() => setShowPaywall(false)} />
      )}
      
      {showAuth && (
        <PostPaymentAuth onComplete={() => handleAuthSuccess()} onSkip={() => handleAuthSuccess()} userProfile={userProfile} />
      )}
      
      <BottomNav currentScreen={currentTab} onNavigate={handleTabChange} />
    </div>
  );
};

export default App;
