
import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2, ArrowRight, UserPlus, X } from 'lucide-react';
import { supabase, signInWithGoogle, updateOnboardingProfile } from '../services/supabaseClient';
import { UserProfile } from '../types';

interface PostPaymentAuthProps {
  onComplete: () => void;
  userProfile: UserProfile | null;
}

const syncRevenueCatUserID = async (userId: string) => {
    console.log(`Syncing RevenueCat for user ${userId}`);
    // Simulate API delay for sync
    await new Promise(resolve => setTimeout(resolve, 800));
};

const PostPaymentAuth: React.FC<PostPaymentAuthProps> = ({ onComplete, userProfile }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showEmailSignUp, setShowEmailSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const finalizeSetup = async (userId: string) => {
    if (userProfile) {
        setStatusMessage("Saving your personalized plan...");
        await updateOnboardingProfile({
            experience: userProfile.experience,
            environment: userProfile.grow_mode,
            goal: userProfile.goal,
            grow_space_size: userProfile.space
        });
    }
    setStatusMessage("Activating subscription...");
    await syncRevenueCatUserID(userId);
    onComplete();
  };

  const handleEmailSignUpFlow = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    setIsProcessing(true);
    setStatusMessage("Clearing previous sessions...");
    
    try {
      // 1. STYLED REQUIREMENT: Force Sign Out to ensure a clean slate for the new account
      await supabase.auth.signOut();
      
      setStatusMessage("Creating your secure account...");
      // 2. Perform actual Sign Up
      const { data, error } = await supabase.auth.signUp({ 
          email, 
          password 
      });
      
      if (error) throw error;
      
      if (data.user) {
        await finalizeSetup(data.user.id);
      } else {
        setStatusMessage("Please check your email to verify your account.");
        // If your Supabase is configured for auto-confirm, data.user will be present.
        // Otherwise, the user needs to confirm.
      }
    } catch (error: any) {
      console.error("SignUp Error:", error);
      alert(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setStatusMessage("Connecting to Google...");
    try {
        await signInWithGoogle();
        // Redirect is handled by App.tsx onAuthStateChange
    } catch (e) {
        console.error(e);
        setIsProcessing(false);
    }
  };

  if (isProcessing) {
      return (
          <div className="h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-text-main mb-2">Finalizing Your Plan</h2>
              <p className="text-text-sub animate-pulse">{statusMessage}</p>
          </div>
      );
  }

  return (
    <div className="h-screen bg-surface relative flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {!showEmailSignUp ? (
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-primary mb-6 ring-8 ring-green-50/50">
               <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-text-main mb-3 leading-tight">
               Access Granted!<br/>Secure Your Data
            </h1>
            <p className="text-text-sub text-sm font-medium leading-relaxed mb-8 px-2">
               Create an account to save your purchase, activate your AI Coach, and sync your grow logs across devices.
            </p>
            <div className="space-y-3">
              <button onClick={handleGoogleLogin} className="w-full bg-white text-text-main border border-gray-200 font-bold text-lg py-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Continue with Google
              </button>
              <button onClick={() => setShowEmailSignUp(true)} className="w-full bg-text-main text-white font-bold text-lg py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
                  <Mail size={20} className="text-primary-light" />
                  Continue with Email
              </button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-text-sub opacity-70">
                <Lock size={12} />
                <span>Encrypted & Secured by Supabase</span>
            </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 relative z-10 animate-in slide-in-from-bottom-4">
            <button onClick={() => setShowEmailSignUp(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-text-main transition-colors">
                <X size={20} />
            </button>
            <h2 className="text-2xl font-extrabold mb-2 tracking-tight">Create Your Account</h2>
            <p className="text-sm text-text-sub mb-8 font-medium">Enter your credentials to link your Pro plan.</p>
            <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-black text-text-sub uppercase tracking-widest block mb-2 ml-1">Email Address</label>
                    <input 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        type="email" 
                        placeholder="grower@mastergrowbot.ai" 
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-text-sub uppercase tracking-widest block mb-2 ml-1">Password</label>
                    <input 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        type="password" 
                        placeholder="Minimum 6 characters" 
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                </div>
                <button 
                    onClick={handleEmailSignUpFlow} 
                    disabled={!email || password.length < 6}
                    className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform disabled:opacity-50"
                >
                    Create Account & Start <ArrowRight size={18} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default PostPaymentAuth;
