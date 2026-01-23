import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase, signInWithGoogle, updateOnboardingProfile } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
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

  useEffect(() => {
      const handleAppStateChange = async (state: any) => {
          if (state.isActive && isProcessing) {
              setTimeout(async () => {
                  const { data } = await supabase.auth.getSession();
                  if (data.session) {
                      setStatusMessage("Sign in successful!");
                      await handlePostAuthLogic(data.session.user.id);
                  } else {
                      setIsProcessing(false);
                      setAuthError("Sign in cancelled or failed.");
                  }
              }, 2000); 
          }
      };
      const listener = CapacitorApp.addListener('appStateChange', handleAppStateChange);
      return () => { listener.then(l => l.remove()); };
  }, [isProcessing]);

  const handlePostAuthLogic = async (userId: string) => {
      try {
          setStatusMessage("Syncing your subscription...");
          if (Capacitor.isNativePlatform()) {
              await Purchases.logIn({ appUserID: userId });
          }
          if (userProfile) {
              await updateOnboardingProfile({
                  experience: userProfile.experience,
                  environment: "Indoor", // Default or map from userProfile
                  goal: "Quality",
                  grow_space_size: "Medium"
              });
          }
          onComplete();
      } catch (error) {
          console.error("Post-auth error:", error);
          onComplete();
      }
  };

  const handleSignUp = async () => {
    if (!email || !password) { setAuthError("Email and password required."); return; }
    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage("Creating account...");
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) await handlePostAuthLogic(data.user.id);
    } catch (e: any) { setAuthError(e.message); setIsProcessing(false); }
  };

  const handleSignIn = async () => {
    if (!email || !password) { setAuthError("Email and password required."); return; }
    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage("Signing in...");
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await handlePostAuthLogic(data.user.id);
    } catch (e: any) { setAuthError(e.message); setIsProcessing(false); }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setStatusMessage("Opening Google...");
    setAuthError(null);
    try { await signInWithGoogle(); } catch (e: any) { setAuthError(e.message); setIsProcessing(false); }
  };

  if (isProcessing) {
      return (
          <div className="fixed inset-0 z-[70] bg-surface flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-text-main mb-2">Finalizing Setup</h2>
              <p className="text-text-sub animate-pulse">{statusMessage}</p>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-surface flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-card text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-primary mb-6"><CheckCircle2 size={32} /></div>
          <h1 className="text-2xl font-black text-text-main mb-2">Subscription Active!</h1>
          <p className="text-text-sub text-sm mb-8">Create an account to save your Pro status and sync across devices.</p>
          
          <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 mb-6 hover:bg-gray-50 transition-colors">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
              Sign Up with Google
          </button>

          <div className="relative mb-6">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
             <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-widest"><span className="bg-white px-3">OR USE EMAIL</span></div>
          </div>

          <div className="space-y-3 mb-6 text-left">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5" />
            {authError && <p className="text-xs text-red-500 px-1 font-bold">{authError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleSignIn} className="border border-gray-200 font-bold py-3.5 rounded-2xl text-text-sub">Sign In</button>
            <button onClick={handleSignUp} className="bg-primary text-white font-bold py-3.5 rounded-2xl shadow-lg">Sign Up</button>
          </div>
          {onSkip && <button onClick={onSkip} className="mt-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Skip for now</button>}
      </div>
    </div>
  );
};

export default PostPaymentAuth;
