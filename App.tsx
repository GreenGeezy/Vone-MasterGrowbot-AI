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
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from './services/supabaseClient';
import { User, LogOut } from 'lucide-react';

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

      // --- 1. HANDLE DEEP LINK RETURNS ---
      CapacitorApp.addListener('appUrlOpen', async (data) => {
          if (data.url.includes('login-callback')) {
              console.log("Deep link received:", data.url);
              
              // Parse the tokens from the URL fragment (hash)
              const hashIndex = data.url.indexOf('#');
              if (hashIndex !== -1) {
                  const params = new URLSearchParams(data.url.substring(hashIndex + 1));
                  const accessToken = params.get('access_token');
                  const refreshToken = params.get('refresh_token');

                  if (accessToken && refreshToken) {
                      // Set session manually
                      const { data: { session }, error } = await supabase.auth.setSession({
                          access_token: accessToken,
                          refresh_token: refreshToken,
                      });

                      if (session && !error) {
                          handleAuthSuccess(session.user.id);
                      }
                  }
              }
          }
      });

      // --- 2. REVENUECAT INIT ---
      if (Capacitor.isNativePlatform()) {
          const apiKey = 'goog_kqOynvNRCABzUPrpfyFvlMvHUna'; 
          await Purchases.configure({ apiKey });
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

          try {
              const customerInfo = await Purchases.getCustomerInfo();
              if (customerInfo.entitlements.active['pro'] || customerInfo.activeSubscriptions.length > 0) {
                  setIsTrialActive(true);
              }
          } catch (e) {
              console.error("Subscription check failed:", e);
          }
      }

      // --- 3. SESSION CHECK ---
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
          } else if (savedProfile) {
             setOnboardingStatus(OnboardingStep.SUMMARY);
          }
      }
    };
    initApp();
  }, []);

  const loadUserData = async () => {
      setPlants([{ 
          id: '1', name: 'Project Alpha', strain: 'Blue Dream', stage: 'Veg', health: 92, 
          imageUri: 'https://images.unsplash.com/photo-1603796846097-b36976ea2851?auto=format&fit=crop&q=80&w=1000', 
          totalDays: 24, journal: [] 
      }]);
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
      const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toLocaleDateString() };
      setPlants(prevPlants => {
          const updatedPlants = [...prevPlants];
          if (updatedPlants[0]) {
              updatedPlants[0] = { ...updatedPlants[0], journal: [newEntry, ...updatedPlants[0].journal] };
          }
          return updatedPlants;
      });
      setCurrentTab('journal');
  };

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      window.location.reload();
  };

  const ProfileScreen = () => (
      <div className="p-6 pt-12">
          <h1 className="text-2xl font-bold mb-6">Profile</h1>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} />
              </div>
              <h2 className="text-lg font-bold">{userProfile?.experience || "Grower"}</h2>
              <p className="text-sm text-gray-500">Pro Member</p>
          </div>
          <button onClick={handleSignOut} className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2">
              <LogOut size={20} /> Sign Out
          </button>
      </div>
  );

  const handleTabChange = (tab: any) => {
      if (!isTrialActive && Capacitor.isNativePlatform()) {
          setShowPaywall(true);
      } else {
          setCurrentTab(tab);
      }
  };

  if (onboardingStatus === OnboardingStep.SPLASH) return <Splash onGetStarted={handleGetStarted} />;
  if (onboardingStatus !== OnboardingStep.COMPLETED && onboardingStatus !== OnboardingStep.SUMMARY) return <Onboarding onComplete={handleOnboardingComplete} />;
  if (onboardingStatus === OnboardingStep.SUMMARY) return <OnboardingSummary profile={userProfile!} onContinue={handleSummaryContinue} />;

  return (
    <div className="h-screen w-screen bg-surface overflow-hidden relative">
      <div className="h-full w-full overflow-y-auto pb-24">
          {currentTab === 'home' && <Home plants={plants} tasks={tasks} onToggleTask={() => {}} onNavigateToPlant={() => setCurrentTab('journal')} />}
          {currentTab === 'diagnose' && <Diagnose onSaveToJournal={handleAddJournalEntry} plant={plants[0]} />}
          {currentTab === 'chat' && <Chat onSaveToJournal={handleAddJournalEntry} plant={plants[0]} userProfile={userProfile} />}
          {currentTab === 'journal' && <Journal plants={plants} onAddEntry={handleAddJournalEntry} />}
          {currentTab === 'profile' && <ProfileScreen />}
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
