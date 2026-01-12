import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2, UserPlus, LogIn } from 'lucide-react';
import { supabase, signInWithGoogle, updateOnboardingProfile } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

interface PostPaymentAuthProps {
  onComplete: () => void;
  onSkip?: () => void;
  userProfile?: UserProfile | null;
}

const PostPaymentAuth: React.FC<PostPaymentAuthProps> = ({ onComplete, onSkip, userProfile }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // This is the magic function that links the Anonymous Purchase to the Real User
  const linkSubscriptionToAccount = async (userId: string) => {
      if (Capacitor.isNativePlatform()) {
          console.log(`Linking RevenueCat Anonymous ID to Authenticated ID: ${userId}`);
          await Purchases.logIn({ appUserID: userId });
      }
  };

  const handlePostAuthLogic = async (userId: string) => {
      try {
          setStatusMessage("Linking your subscription...");
          // 1. Link Subscription
          await linkSubscriptionToAccount(userId);

          // 2. Save Onboarding Data
          if (userProfile) {
              setStatusMessage("Saving your personalized plan...");
              await updateOnboardingProfile({
                  experience: userProfile.experience,
                  environment: userProfile.grow_mode,
                  goal: userProfile.goal,
                  grow_space_size: userProfile.space
              });
          }

          // 3. Done
          onComplete();
      } catch (error) {
          console.error("Post-auth error:", error);
          // Even if saving profile fails, the sub is linked, so let them in.
          onComplete();
      }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
        setAuthError("Please enter both email and password.");
        return;
    }
    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage("Creating your account...");
    
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) await handlePostAuthLogic(data.user.id);
    } catch (e: any) {
        setAuthError(e.message || "Failed to create account.");
        setIsProcessing(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
        setAuthError("Please enter both email and password.");
        return;
    }
    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage("Signing you in...");

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await handlePostAuthLogic(data.user.id);
    } catch (e: any) {
        setAuthError(e.message || "Failed to sign in.");
        setIsProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    try {
        // When Google Sign-in completes, the session listener in App.tsx catches it.
        // App.tsx needs to ensure handlePostAuthLogic is called there too.
        await signInWithGoogle();
    } catch (e) {
        console.error(e);
        setIsProcessing(false);
    }
  };

  if (isProcessing) {
      return (
          <div className="fixed inset-0 z-[70] h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-text-main mb-2">Securing Your Plan</h2>
              <p className="text-text-sub animate-pulse">{statusMessage}</p>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[70] h-screen bg-surface relative flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-card border border-gray-100 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-primary mb-6 ring-8 ring-green-50/50">
             <CheckCircle2 size={32} />
          </div>

          <h1 className="text-2xl font-extrabold text-text-main mb-3 leading-tight tracking-tight">
             Subscription Active!
          </h1>
          
          <p className="text-text-sub text-sm font-medium leading-relaxed mb-8 px-2">
             Create an account to save your subscription and sync your garden across devices.
          </p>

          {/* Social Logins */}
          <div className="space-y-3 mb-6">
            <button onClick={handleGoogleLogin} className="w-full bg-white text-text-main border border-gray-200 font-bold text-base py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Save with Google
            </button>
          </div>

          <div className="relative mb-6">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
             <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-widest"><span className="bg-white px-3">OR USE EMAIL</span></div>
          </div>

          <div className="space-y-4 mb-6 text-left">
            <div>
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-1.5 ml-1">Email</label>
                <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="grower@example.com" className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 outline-none placeholder-gray-300" />
                </div>
            </div>
            <div>
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-1.5 ml-1">Password</label>
                <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 outline-none placeholder-gray-300" />
                </div>
            </div>
            {authError && <p className="text-xs text-alert-red font-medium px-1 animate-in fade-in slide-in-from-top-1">{authError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-2">
            <button onClick={handleSignIn} className="bg-white text-text-main border border-gray-200 font-bold py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"><LogIn size={18} /> Sign In</button>
            <button onClick={handleSignUp} className="bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><UserPlus size={18} /> Sign Up</button>
          </div>

          {onSkip && (
            <button onClick={onSkip} className="mt-4 text-xs text-text-sub font-medium hover:text-text-main transition-colors">
                Skip for now (Subscription saves to this device only)
            </button>
          )}
      </div>
    </div>
  );
};

export default PostPaymentAuth;
