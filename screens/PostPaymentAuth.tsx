import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Shield,
  Smartphone,
  Cloud,
  Lock,
  ChevronRight,
  AlertCircle,
  Mail
} from 'lucide-react';
import { supabase, signInWithGoogle, updateOnboardingProfile } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser'; // Requires: npm install @capacitor/browser
import Growbot from '../components/Growbot';

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
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup'); // Toggle state

  // Handle App State changes for Google Auth redirect
  useEffect(() => {
    const handleAppStateChange = async (state: any) => {
      if (state.isActive && isProcessing) {
        // Give time for the auth callback to process
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setStatusMessage("Sign in successful! Setting up profile...");
            await handlePostAuthLogic(data.session.user.id);
          } else {
            setIsProcessing(false);
            setAuthError("Sign-in was cancelled or incomplete. Please try again.");
          }
        }, 2000);
      }
    };

    const setupListener = async () => {
      const listener = await CapacitorApp.addListener('appStateChange', handleAppStateChange);
      return listener;
    };

    const listenerPromise = setupListener();
    return () => { listenerPromise.then(l => l.remove()); };
  }, [isProcessing]);

  const handlePostAuthLogic = async () => {
    try {
      if (userProfile) {
        // Fix: updateOnboardingProfile only takes 1 argument (the updates)
        // The user ID is handled internally by the function via auth.getUser()
        await updateOnboardingProfile({
          ...userProfile,
          isOnboarded: true
        });
      }
      setStatusMessage("Account secured! Syncing data...");
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error("Profile sync error:", error);
      // Even if profile update fails, auth worked, so we proceed
      onComplete();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage("Connecting to Google...");
    try {
      await signInWithGoogle();
      // Logic continues in handleAppStateChange or redirect
    } catch (error: any) {
      setAuthError(error.message || "Google sign-in failed.");
      setIsProcessing(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setAuthError(null);
    setIsProcessing(true);
    setStatusMessage(authMode === 'signup' ? "Creating your secure account..." : "Signing you in...");

    try {
      let error;
      let data;

      if (authMode === 'signup') {
        const res = await supabase.auth.signUp({ email, password });
        error = res.error;
        data = res.data;
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password });
        error = res.error;
        data = res.data;
      }

      if (error) throw error;

      if (data.user) {
        await handlePostAuthLogic(data.user.id);
      }
    } catch (error: any) {
      let msg = error.message || "Authentication failed. Please check your credentials.";
      if (msg.includes("already registered") || msg.includes("unique constraint")) {
        msg = "This email is already registered. Please switch to Sign In.";
      }
      setAuthError(msg);
      setIsProcessing(false);
    }
  };

  const openLegalLink = async (url: string) => {
    try {
      await Browser.open({ url });
    } catch (e) {
      // Fallback if browser plugin fails or on web
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col px-6 py-8 overflow-y-auto">

      {/* 1. SUCCESS HEADER */}
      <div className="flex flex-col items-center text-center mb-8 mt-4">
        <div className="mb-4 relative">
          <Growbot size="xl" mood="happy" />
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1.5 border-4 border-gray-50">
            <CheckCircle2 size={20} strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">
          Subscription Activated!
        </h1>
        <p className="text-sm text-gray-600 font-medium leading-relaxed max-w-xs">
          Secure Your Account & Sync Across Devices.
        </p>
      </div>

      {/* 2. BENEFITS SUMMARY */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
        <div className="flex items-start gap-3">
          <Cloud size={18} className="text-green-600 mt-0.5" />
          <p className="text-xs text-gray-600 font-medium"><strong>Safe & Secure:</strong> Backup your grow journal and data to the cloud.</p>
        </div>
        <div className="flex items-start gap-3">
          <Smartphone size={18} className="text-blue-600 mt-0.5" />
          <p className="text-xs text-gray-600 font-medium"><strong>Cross-Device:</strong> Seamlessly sync between your phone and tablet.</p>
        </div>
        <div className="flex items-start gap-3">
          <Lock size={18} className="text-gray-600 mt-0.5" />
          <p className="text-xs text-gray-600 font-medium"><strong>Privacy First:</strong> Your garden data is encrypted and private.</p>
        </div>
      </div>

      {/* 3. AUTH FORM */}
      <div className="w-full max-w-sm mx-auto space-y-4">

        {/* Google Sign In (Primary) */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isProcessing}
          className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          {isProcessing ? (
            <span className="text-sm">Connecting...</span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-400 tracking-widest">
            <span className="bg-gray-50 px-3">Or use email</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
            className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors"
          >
            {authMode === 'signup'
              ? "Already have an account? Sign In"
              : "New user? Create an account"}
          </button>
        </div>

        {/* Email Inputs */}
        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full bg-white border border-gray-200 pl-11 p-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white border border-gray-200 pl-11 p-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-600 font-bold leading-snug">{authError}</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleEmailAuth}
          disabled={isProcessing}
          className="w-full bg-green-600 text-white font-black py-4 rounded-xl shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:shadow-none"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              {authMode === 'signup' ? "Create Account" : "Sign In"}
              <ChevronRight size={18} strokeWidth={3} />
            </>
          )}
        </button>

        {/* Micro-copy */}
        {authMode === 'signup' && (
          <p className="text-[10px] text-center text-gray-400 font-medium">
            Quick & secure — takes just seconds. No extra payment needed.
          </p>
        )}
      </div>

      {/* 4. COMPLIANCE FOOTER */}
      <div className="mt-auto pt-8 pb-4 text-center space-y-4">
        <div className="flex justify-center gap-6 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {/* Added your specific URLs here */}
          <button onClick={() => openLegalLink('https://www.mastergrowbot.com/terms-of-service')} className="hover:text-green-600 transition-colors">Terms of Use</button>
          <button onClick={() => openLegalLink('https://www.mastergrowbot.com/privacy-policy')} className="hover:text-green-600 transition-colors">Privacy Policy</button>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] text-gray-400 font-medium">
            <Shield size={9} className="inline mr-1 -mt-0.5" />
            We securely store your grow data to enable syncing across devices.
          </p>
          <p className="text-[9px] text-gray-400 font-medium">
            Share subscription with up to 5 family members via Family Sharing.
          </p>
        </div>
      </div>

    </div>
  );
};

export default PostPaymentAuth;
