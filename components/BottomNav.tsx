import React from 'react';
import { Home, BookOpen, ScanLine, MessageSquare, User } from 'lucide-react';
import { AppScreen } from '../types';

interface BottomNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const getIconColor = (screen: AppScreen) => 
    currentScreen === screen ? 'text-primary' : 'text-gray-400';

  const getContainerClass = (screen: AppScreen) =>
    `flex flex-col items-center gap-1 p-2 transition-all active:scale-95 ${
      currentScreen === screen ? 'opacity-100' : 'opacity-60 hover:opacity-80'
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 pb-6 flex justify-between items-center shadow-lg-up z-50 rounded-t-3xl">
      <button onClick={() => onNavigate(AppScreen.HOME)} className={getContainerClass(AppScreen.HOME)}>
        <Home size={24} className={getIconColor(AppScreen.HOME)} />
        <span className="text-[10px] font-bold text-text-sub">Home</span>
      </button>

      <button onClick={() => onNavigate(AppScreen.JOURNAL)} className={getContainerClass(AppScreen.JOURNAL)}>
        <BookOpen size={24} className={getIconColor(AppScreen.JOURNAL)} />
        <span className="text-[10px] font-bold text-text-sub">Journal</span>
      </button>

      <div className="relative -top-6">
        <button 
          onClick={() => onNavigate(AppScreen.DIAGNOSE)}
          className="bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-primary/30 border-4 border-surface hover:scale-105 transition-transform"
        >
          <ScanLine size={24} />
        </button>
      </div>

      <button onClick={() => onNavigate(AppScreen.CHAT)} className={getContainerClass(AppScreen.CHAT)}>
        <MessageSquare size={24} className={getIconColor(AppScreen.CHAT)} />
        <span className="text-[10px] font-bold text-text-sub">Coach</span>
      </button>

      <button onClick={() => onNavigate(AppScreen.PROFILE)} className={getContainerClass(AppScreen.PROFILE)}>
        <User size={24} className={getIconColor(AppScreen.PROFILE)} />
        <span className="text-[10px] font-bold text-text-sub">Profile</span>
      </button>
    </div>
  );
};

export default BottomNav;
