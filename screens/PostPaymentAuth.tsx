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

  const handlePostAuthLogic = async (userId: string) => {
      try {
          setStatusMessage("Linking your subscription...");
          if (Capacitor.isNativePlatform()) {
              await Purchases.logIn({ appUserID: userId });
          }
          if (userProfile) {
              await updateOnboardingProfile({
                  experience: userProfile.experience,
                  environment: userProfile.grow_mode,
                  goal: userProfile.goal,
                  grow_space_size: userProfile.space
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
    setStatusMessage("Creating your account...");
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) await handlePostAuthLogic(data.user.id);
    } catch (e: any) {
        setAuthError(e.message);
        setIsProcessing(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) { setAuthError("Email and password required."); return; }
    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage("Signing you in...");
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await handlePostAuthLogic(data.user.id);
    } catch (e: any) {
        setAuthError(e.message);
        setIsProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    try { await signInWithGoogle(); } catch (e) { console.error(e); setIsProcessing(false); }
  };

  if (isProcessing) {
      return (
          <div className="fixed inset-0 z-[70] bg-surface flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-text-main mb-2">Securing Your Plan</h2>
              <p className="text-text-sub animate-pulse">{statusMessage}</p>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-surface flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-card text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-primary mb-6"><CheckCircle2 size={32} /></div>
          <h1 className="text-2xl font-extrabold text-text-main mb-3">Subscription Active!</h1>
          <p className="text-text-sub text-sm mb-8">Create an account to save your purchase and sync your garden across devices.</p>
          
          <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 mb-6 hover:bg-gray-50 transition-colors">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
              Sign Up with Google
          </button>

          <div className="relative mb-6">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
             <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-widest"><span className="bg-white px-3">OR USE EMAIL</span></div>
          </div>

          <div className="space-y-4 mb-6 text-left">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5" />
            {authError && <p className="text-xs text-red-500 px-1">{authError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleSignIn} className="border border-gray-200 font-bold py-3.5 rounded-2xl">Sign In</button>
            <button onClick={handleSignUp} className="bg-primary text-white font-bold py-3.5 rounded-2xl">Sign Up</button>
          </div>
      </div>
    </div>
  );
};

export default PostPaymentAuth;
