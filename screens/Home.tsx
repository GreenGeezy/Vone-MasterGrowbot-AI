import React, { useState, useEffect } from 'react';
import PlantCard from '../components/PlantCard';
import Growbot from '../components/Growbot';
import { Sun, CheckCircle2, Circle, Plus, Search, X } from 'lucide-react'; // Added icons
import { getDailyInsight } from '../services/geminiService';
import { STRAIN_DATABASE } from '../data/strains'; // Import Database
import StrainCard from '../components/StrainCard'; // Import StrainCard

const Home: React.FC<any> = ({ plants, tasks, onToggleTask, onNavigateToPlant, onAddPlant }) => {
  const pendingTasks = tasks.filter((t: any) => !t.isCompleted);
  const completedCount = tasks.filter((t: any) => t.isCompleted).length;

  // Search State
  const [showStrainSearch, setShowStrainSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredStrains = STRAIN_DATABASE.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));


  return (
    <div className="pb-32 px-6 pt-12 min-h-screen bg-surface font-sans">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Growbot size="md" mood={pendingTasks.length === 0 ? "happy" : "neutral"} />
          <h1 className="text-2xl font-black text-text-main mt-4">Daily Grow Tasks</h1>
          <p className="text-sm text-text-sub font-medium">{pendingTasks.length} tasks remaining today</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed</span>
          <div className="text-2xl font-black text-green-500">{completedCount}</div>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-8 bg-white rounded-[2rem] border border-gray-100 text-center shadow-sm">
            <Sun size={40} className="text-orange-400 mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">All Caught Up!</h3>
            <p className="text-xs text-gray-500 font-medium">Your garden is looking great. Enjoy the day.</p>
          </div>
        ) : (
          tasks.map((task: any) => (
            <div key={task.id} onClick={() => onToggleTask(task.id)} className={`flex items-center gap-4 p-5 rounded-2xl mb-3 shadow-sm transition-all active:scale-95 ${task.isCompleted ? 'bg-gray-50 border border-transparent opacity-60' : 'bg-white border border-gray-100'}`}>
              {task.isCompleted ? <CheckCircle2 className="text-green-500" fill="currentColor" color="white" size={24} /> : <Circle className="text-gray-300" size={24} />}
              <div className="flex-1">
                <span className={`block text-sm font-bold transition-all ${task.isCompleted ? "line-through text-gray-400" : "text-text-main"}`}>{task.title}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{task.source === 'ai_diagnosis' ? 'AI Recommended' : 'Routine'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-main">Your Plants</h2>
          <button onClick={() => setShowStrainSearch(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg shadow-green-200 active:scale-95 transition-transform">
            <Search size={14} /> Search Strain Database
          </button>
        </div>
        <div className="space-y-4">
          {plants.map((plant: any) => <PlantCard key={plant.id} plant={plant} onClick={() => onNavigateToPlant(plant.id)} />)}
        </div>
      </div>

      {/* Strain Search Modal (Reused from Journal) */}
      {showStrainSearch && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-gray-100 flex items-center gap-4">
            <button onClick={() => setShowStrainSearch(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search 100+ Strains..."
                className="w-full bg-gray-50 py-3 pl-10 pr-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredStrains.map(s => (
              <div key={s.id} onClick={() => { onAddPlant(s); setShowStrainSearch(false); setSearchQuery(''); }} className="cursor-pointer active:scale-95 transition-transform">
                <StrainCard strain={s} compact />
              </div>
            ))}
            {filteredStrains.length === 0 && (
              <div className="text-center py-10 opacity-50">
                <p>No strains found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Home;
