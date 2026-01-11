import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Growbot from '../components/Growbot';
import { Capacitor } from '@capacitor/core';

interface AuthProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PostPaymentAuth: React.FC<AuthProps> = ({ onComplete, onSkip }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = mode === 'signup' 
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onComplete();
    } catch (err: any) {
        alert(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
      await supabase.auth.signInWithOAuth({ 
          provider: provider, 
          options: { redirectTo: 'com.mastergrowbot.app://login-callback' } 
      });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-6"><Growbot size="lg" mood="neutral" /></div>
        <h2 className="text-2xl font-black text-center mb-2">
            {mode === 'signup' ? "Save Your Progress" : "Welcome Back"}
        </h2>
        <p className="text-center text-text-sub mb-8">
            Create an account to sync your garden across devices.
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none" required />
            <button disabled={loading} className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg">
                {loading ? "Please wait..." : (mode === 'signup' ? "Create Account" : "Log In")}
            </button>
        </form>

        <div className="flex flex-col gap-3 mt-6">
            <button onClick={() => handleSocialLogin('google')} className="w-full bg-white border border-gray-200 text-text-main font-bold py-4 rounded-2xl flex justify-center items-center gap-2">
                <span>Continue with Google</span>
            </button>
            
            {(Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'web') && (
                <button onClick={() => handleSocialLogin('apple')} className="w-full bg-black text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2">
                    <span>Sign in with Apple</span>
                </button>
            )}
        </div>

        <p className="text-center mt-6 text-sm">
            <span onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="text-primary font-bold cursor-pointer">
                {mode === 'signup' ? "Have an account? Log In" : "Need an account? Sign Up"}
            </span>
        </p>
      </div>
    </div>
  );
};

export default PostPaymentAuth;
