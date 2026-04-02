import React from 'react';
import { ScanLine, Home, BookOpen, Dna, User, Zap } from 'lucide-react';
import { AppScreen } from '../types';
import { getTokenState, isAnnualPlanValid } from '../services/tokenService';

interface WebTopNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onOpenTokenShop: () => void;
}

const WebTopNav: React.FC<WebTopNavProps> = ({ currentScreen, onNavigate, onOpenTokenShop }) => {
  const state = getTokenState();
  const isAnnual = isAnnualPlanValid(state);
  const creditDisplay = isAnnual
    ? 'Pro'
    : state.free_uses_remaining > 0
    ? `${state.free_uses_remaining} free`
    : `${Math.floor(state.balance)} credits`;

  const tabClass = (screen: AppScreen) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
      currentScreen === screen ? 'bg-green-50 text-primary' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[720px] z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
          <ScanLine size={16} className="text-white" />
        </div>
        <span className="font-black text-text-main text-sm tracking-tight">MasterGrowbot</span>
        <span className="text-[10px] font-black text-primary bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest">AI</span>
      </div>

      {/* Center: Nav tabs */}
      <nav className="flex items-center gap-1">
        <button onClick={() => onNavigate(AppScreen.HOME)} className={tabClass(AppScreen.HOME)}>
          <Home size={16} /> Home
        </button>
        <button onClick={() => onNavigate(AppScreen.JOURNAL)} className={tabClass(AppScreen.JOURNAL)}>
          <BookOpen size={16} /> Journal
        </button>
        <button
          onClick={() => onNavigate(AppScreen.DIAGNOSE)}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            currentScreen === AppScreen.DIAGNOSE
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-gray-900 text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/25'
          }`}
        >
          <ScanLine size={16} /> Analyze
        </button>
        <button onClick={() => onNavigate(AppScreen.STRAINS)} className={tabClass(AppScreen.STRAINS)}>
          <Dna size={16} /> Strains
        </button>
      </nav>

      {/* Right: Credits + Profile */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpenTokenShop}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-primary rounded-full text-xs font-black hover:bg-green-100 transition-colors"
        >
          <Zap size={12} />
          {creditDisplay}
        </button>
        <button
          onClick={() => onNavigate(AppScreen.PROFILE)}
          className={`p-2 rounded-xl transition-all ${
            currentScreen === AppScreen.PROFILE ? 'bg-green-50 text-primary' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <User size={18} />
        </button>
      </div>
    </div>
  );
};

export default WebTopNav;
