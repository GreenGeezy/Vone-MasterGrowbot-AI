import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import { supabase, signInWithGoogle, updateOnboardingProfile } from '../services/supabaseClient';
import { UserProfile } from '../types';

interface PostPaymentAuthProps {
  onComplete: () => void;
  userProfile: UserProfile | null;
}

// Mock RevenueCat Sync
const syncRevenueCatUserID = async (userId: string) => {
    console.log(`Syncing RevenueCat for user ${userId}`);
    // Simulate API call
    return new Promise<void>((resolve) => setTimeout(resolve, 800));
};

const PostPaymentAuth: React.FC<PostPaymentAuthProps> = ({ onComplete, userProfile }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handlePostAuthLogic = async () => {
      setIsProcessing(true);
      try {
          // 1. Get User
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
              // PROTOTYPE/MOCK FALLBACK:
              // If we are in the "Email" mock flow, no actual user exists in Supabase.
              // We simulate a successful sync to allow the onboarding to complete.
              console.warn("Prototype: No authenticated user found. Skipping DB sync.");
              setStatusMessage("Finalizing setup (Mock Mode)...");
              await new Promise(resolve => setTimeout(resolve, 1500));
              onComplete();
              return;
          }

          // 2. Save Profile (Quiz Data)
          if (userProfile) {
              setStatusMessage("Saving your personalized plan...");
              await updateOnboardingProfile({
                  experience: userProfile.experience,
                  environment: userProfile.grow_mode,
                  goal: userProfile.goal,
                  grow_space_size: userProfile.space
              });
          }

          // 3. Sync RevenueCat
          setStatusMessage("Activating subscription...");
          await syncRevenueCatUserID(user.id);

          // 4. Complete
          onComplete();

      } catch (error) {
          console.error("Post-auth error:", error);
          // Proceed anyway to not block user from accessing the app
          onComplete();
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAppleLogin = async () => {
    try {
        await supabase.auth.signInWithOAuth({ provider: 'apple' });
    } catch (e) {
        console.error(e);
    }
  };

  const handleGoogleLogin = async () => {
    try {
        await signInWithGoogle();
    } catch (e) {
        console.error(e);
    }
  };

  const handleEmailLogin = () => {
     // Mocking email flow completion for this prototype.
     // In a real app, this would route to /signup, then callback here.
     // We simulate a delay then trigger the logic (which handles the missing user gracefully).
     setIsProcessing(true);
     setStatusMessage("Verifying...");
     setTimeout(() => {
         handlePostAuthLogic();
     }, 1000);
  };

  if (isProcessing) {
      return (
          <div className="h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-text-main mb-2">Almost There</h2>
              <p className="text-text-sub animate-pulse">{statusMessage}</p>
          </div>
      );
  }

  return (
    <div className="h-screen bg-surface relative flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-card border border-gray-100 relative z-10 text-center">
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-primary mb-6 ring-8 ring-green-50/50">
             <CheckCircle2 size={32} />
          </div>

          <h1 className="text-2xl font-extrabold text-text-main mb-3 leading-tight">
             One Final Step:<br/>Unlock Your Personalized Plan
          </h1>
          
          <p className="text-text-sub text-sm font-medium leading-relaxed mb-8 px-2">
             Connect an account to securely save your purchase, protect your personalized Grow Plan, and activate your free trial.
          </p>

          <div className="space-y-3">
            <button 
                onClick={handleAppleLogin}
                className="w-full bg-black text-white font-bold text-lg py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
                </svg>
                Continue with Apple
            </button>

            <button 
                onClick={handleGoogleLogin}
                className="w-full bg-white text-text-main border border-gray-200 font-bold text-lg py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50"
            >
                <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    alt="Google" 
                    className="w-5 h-5" 
                />
                Continue with Google
            </button>

            <button 
                onClick={handleEmailLogin}
                className="w-full bg-white text-text-main border border-gray-200 font-bold text-lg py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50"
            >
                <Mail size={20} className="text-text-main" />
                Continue with Email
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-text-sub opacity-70">
              <Lock size={12} />
              <span>Secure Encrypted Connection</span>
          </div>
      </div>
    </div>
  );
};

export default PostPaymentAuth;