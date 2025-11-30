
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
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="glass-panel pointer-events-auto rounded-[32px] px-6 py-3.5 flex items-center gap-1 shadow-glass bg-white/90 border border-white/60">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;
          
          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="group relative -mt-10 mx-2"
              >
                <div className="absolute inset-0 bg-primary blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 active:scale-95 bg-text-main text-white border border-white/20 relative overflow-hidden group-hover:-translate-y-1`}>
                    <Icon size={24} className="text-primary-light relative z-10" strokeWidth={2.5} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 group ${
                isActive ? 'bg-primary/5' : 'hover:bg-gray-50'
              }`}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`transition-colors duration-300 ${isActive ? 'text-primary' : 'text-text-sub group-hover:text-text-main'}`} 
              />
              {isActive && (
                 <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;