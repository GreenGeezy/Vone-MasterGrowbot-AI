import React from 'react';
import { Home, BookOpen, ScanLine, MessageSquare, User } from 'lucide-react';
import { AppScreen } from '../types';

interface BottomNavProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: AppScreen.HOME, icon: Home, label: 'Home' },
    { id: AppScreen.JOURNAL, icon: BookOpen, label: 'Journal' },
    { id: AppScreen.DIAGNOSE, icon: ScanLine, label: 'Scan', highlight: true },
    { id: AppScreen.CHAT, icon: MessageSquare, label: 'Coach' },
    { id: AppScreen.ACCOUNT, icon: User, label: 'Account' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-auto">
      <div className="glass-panel rounded-[32px] px-6 py-3.5 flex items-center gap-4 shadow-glass bg-white/95 border border-white/60 backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;
          
          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="group relative -mt-10 mx-1"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl bg-text-main text-white`}>
                    <Icon size={24} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`p-2 rounded-xl transition-all ${isActive ? 'text-primary' : 'text-gray-400'}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
