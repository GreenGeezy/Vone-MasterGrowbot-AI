import React from 'react';
import { Home, BookOpen, ScanLine, Dna, User } from 'lucide-react';
import { AppScreen } from '../types';
import { Capacitor } from '@capacitor/core';

interface BottomNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const isWeb = Capacitor.getPlatform() === 'web';

  const getIconColor = (screen: AppScreen) =>
    currentScreen === screen ? 'text-primary' : 'text-gray-400';

  const getContainerClass = (screen: AppScreen) => {
    const active = currentScreen === screen;
    return [
      'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150',
      active ? 'opacity-100' : 'opacity-55',
      isWeb
        ? `hover:opacity-100 hover:bg-green-50 ${active ? '' : 'hover:scale-105'}`
        : 'active:scale-95 hover:opacity-80',
    ].join(' ');
  };

  // On web: center nav inside the 430px app container, not full viewport width
  const navClass = isWeb
    ? 'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-2 pb-4 flex justify-between items-center z-50 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)]'
    : 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 pb-6 flex justify-between items-center shadow-lg-up z-50 rounded-t-3xl';

  return (
    <div className={navClass}>
      <button onClick={() => onNavigate(AppScreen.HOME)} className={getContainerClass(AppScreen.HOME)}>
        <Home size={22} className={getIconColor(AppScreen.HOME)} />
        <span className="text-[10px] font-bold text-text-sub">Home</span>
      </button>

      <button onClick={() => onNavigate(AppScreen.JOURNAL)} className={getContainerClass(AppScreen.JOURNAL)}>
        <BookOpen size={22} className={getIconColor(AppScreen.JOURNAL)} />
        <span className="text-[10px] font-bold text-text-sub">Journal</span>
      </button>

      <div className="relative -top-5">
        <button
          onClick={() => onNavigate(AppScreen.DIAGNOSE)}
          className="bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-primary/30 border-4 border-surface hover:scale-110 hover:shadow-2xl hover:bg-emerald-600 transition-all duration-200"
        >
          <ScanLine size={22} />
        </button>
      </div>

      <button
        onClick={() => onNavigate(AppScreen.STRAINS)}
        className={[
          'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150',
          currentScreen === AppScreen.STRAINS ? 'text-green-500 opacity-100' : 'text-gray-400 opacity-55',
          isWeb ? 'hover:opacity-100 hover:bg-green-50 hover:scale-105' : 'active:scale-95 hover:opacity-80',
        ].join(' ')}
      >
        <Dna size={22} />
        <span className="text-[10px] font-bold">Strains</span>
      </button>

      <button onClick={() => onNavigate(AppScreen.PROFILE)} className={getContainerClass(AppScreen.PROFILE)}>
        <User size={22} className={getIconColor(AppScreen.PROFILE)} />
        <span className="text-[10px] font-bold text-text-sub">Profile</span>
      </button>
    </div>
  );
};

export default BottomNav;
