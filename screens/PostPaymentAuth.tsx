import React from 'react';
import {
  CheckCircle2,
  Shield,
  Lock,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import Growbot from '../components/Growbot';
import { UserProfile } from '../types';

interface PostPaymentAuthProps {
  onComplete: () => void;
  onSkip?: () => void; // Keep for interface compatibility
  userProfile?: UserProfile | null;
}

const PostPaymentAuth: React.FC<PostPaymentAuthProps> = ({ onComplete }) => {
  // Simple "Continue" handler
  const handleContinue = () => {
    onComplete();
  };

  const openLegalLink = async (url: string) => {
    try { await Browser.open({ url }); } catch (e) { window.open(url, '_blank'); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col px-6 py-8 overflow-y-auto">
      {/* 1. SUCCESS HEADER */}
      <div className="flex flex-col items-center text-center mb-8 mt-12">
        <div className="mb-6 relative">
          <Growbot size="xl" mood="happy" />
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1.5 border-4 border-gray-50 animate-bounce">
            <CheckCircle2 size={24} strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 leading-tight mb-3">
          Subscription Activated!
        </h1>
        <p className="text-sm text-gray-600 font-medium leading-relaxed max-w-xs">
          Welcome to the elite circle of Master Growers. Your AI assistant is ready.
        </p>
      </div>

      {/* 2. BENEFITS SUMMARY */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="bg-yellow-50 p-2 rounded-xl text-yellow-600"><Zap size={20} /></div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Instant Access</h3>
            <p className="text-xs text-gray-500 font-medium">Start diagnosing plants immediately.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="bg-green-50 p-2 rounded-xl text-green-600"><Shield size={20} /></div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Privacy First</h3>
            <p className="text-xs text-gray-500 font-medium">Your data is stored locally on your device.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="bg-gray-50 p-2 rounded-xl text-gray-600"><Lock size={20} /></div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Unlimited AI</h3>
            <p className="text-xs text-gray-500 font-medium">No limits on queries or analysis.</p>
          </div>
        </div>
      </div>

      {/* 3. ACTION BUTTON */}
      <div className="mt-auto">
        <button
          onClick={handleContinue}
          className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
        >
          Let's Grow
          <ArrowRight size={20} strokeWidth={3} />
        </button>

        <div className="flex justify-center gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-6">
          <button onClick={() => openLegalLink('https://www.mastergrowbot.com/terms-of-service')} className="hover:text-green-600 transition-colors">Terms</button>
          <button onClick={() => openLegalLink('https://www.mastergrowbot.com/privacy-policy')} className="hover:text-green-600 transition-colors">Privacy</button>
        </div>
      </div>
    </div>
  );
};

export default PostPaymentAuth;
