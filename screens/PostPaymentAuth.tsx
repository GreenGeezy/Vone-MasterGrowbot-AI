import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2, UserPlus, LogIn } from 'lucide-react';
import { supabase, signInWithGoogle, updateOnboardingProfile } from '../services/supabaseClient';
import { UserProfile } from '../types';

interface PostPaymentAuthProps {
  onComplete: () => void;
  userProfile: UserProfile | null;
}

const syncRevenueCatUserID = async (userId: string) => {
    console.log(`Syncing RevenueCat for user ${userId}`);
    return new Promise<void>((resolve) => setTimeout(resolve, 800));
};

const PostPaymentAuth: React.FC<PostPaymentAuthProps> = ({ onComplete, userProfile }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handlePostAuthLogic = async (userId: string) => {
      try {
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
      } catch (error) {
          console.error("Post-auth error:", error);
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
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        if (data.user) {
            await handlePostAuthLogic(data.user.id);
        }
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        if (data.user) {
            await handlePostAuthLogic(data.user.id);
        }
    } catch (e: any) {
        setAuthError(e.message || "Failed to sign in.");
        setIsProcessing(false);
    }
  };

  const handleAppleLogin = () => {
    alert("Apple Sign-In is coming soon!");
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    try {
        await signInWithGoogle();
        // The redirect and finalization is handled by the onAuthStateChange listener in App.tsx
    } catch (e) {
        console.error(e);
        setIsProcessing(false);
    }
  };

  if (isProcessing) {
      return (
          <div className="h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-text-main mb-2">Processing Authentication</h2>
              <p className="text-text-sub animate-pulse">{statusMessage}</p>
          </div>
      );
  }

  return (
    <div className="h-screen bg-surface relative flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto">
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-card border border-gray-100 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-primary mb-6 ring-8 ring-green-50/50">
             <CheckCircle2 size={32} />
          </div>

          <h1 className="text-2xl font-extrabold text-text-main mb-3 leading-tight">
             Secure Your Account
          </h1>
          
          <p className="text-text-sub text-sm font-medium leading-relaxed mb-6 px-2">
             Create an account or sign in to save your purchase and activate your personalized Grow Plan.
          </p>

          <div className="space-y-4 mb-6 text-left">
            <div>
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-1.5 ml-1">Email Address</label>
                <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="grower@example.com"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
            </div>
            <div>
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-1.5 ml-1">Password</label>
                <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
            </div>
            {authError && <p className="text-xs text-alert-red font-medium px-1">{authError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
                onClick={handleSignIn}
                className="bg-white text-text-main border border-gray-200 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
                <LogIn size={18} /> Sign In
            </button>
            <button 
                onClick={handleSignUp}
                className="bg-primary text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
                <UserPlus size={18} /> Sign Up
            </button>
          </div>

          <div className="relative mb-6">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
             <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400"><span className="bg-white px-2">Or continue with</span></div>
          </div>

          <div className="space-y-3">
            <button 
                onClick={handleAppleLogin}
                className="w-full bg-black text-white font-bold text-base py-3 rounded-xl shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
                </svg>
                Sign In with Apple
            </button>

            <button 
                onClick={handleGoogleLogin}
                className="w-full bg-white text-text-main border border-gray-200 font-bold text-base py-3 rounded-xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:bg-gray-50"
            >
                <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    alt="Google" 
                    className="w-5 h-5" 
                />
                Sign In with Google
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-text-sub opacity-70">
              <Lock size={12} />
              <span>Secure Encrypted Connection</span>
          </div>
      </div>
    </div>
  );
};

export default PostPaymentAuth;