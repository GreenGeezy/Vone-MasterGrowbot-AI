import React, { useEffect, useState } from 'react';
import { Plant, Task } from '../types';
import PlantCard from '../components/PlantCard';
import { CheckCircle, Calendar, Sun, Droplets, Zap } from 'lucide-react';
import { getDailyInsight } from '../services/geminiService';

interface HomeProps {
  plants: Plant[];
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onNavigateToPlant: (plantId: string) => void;
}

const Home: React.FC<HomeProps> = ({ plants, tasks, onToggleTask, onNavigateToPlant }) => {
  const [dailyTip, setDailyTip] = useState<string>("Loading daily garden insight...");

  // AI INTEGRATION: Fetch Daily Insight on Mount
  useEffect(() => {
    const fetchTip = async () => {
        const stage = plants[0]?.stage || 'General';
        const tip = await getDailyInsight(stage);
        setDailyTip(tip);
    };
    fetchTip();
  }, [plants]);

  return (
    <div className="p-6 pt-12 space-y-8 pb-32">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-main">My Garden</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2">
            <Calendar size={14} /> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* AI INSIGHT CARD (Gemini Flash) */}
      <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 p-4 rounded-2xl border border-primary/20 flex gap-3 items-start">
          <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
              <Zap size={18} className="text-yellow-500 fill-yellow-500" />
          </div>
          <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Daily AI Insight</h3>
              <p className="text-sm text-gray-700 leading-relaxed italic">"{dailyTip}"</p>
          </div>
      </div>

      {/* Status Widgets */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <div className="min-w-[140px] bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <Sun size={20} className="text-orange-400" />
            <div>
                <p className="text-xs text-gray-400">Environment</p>
                <p className="font-bold text-text-main">Optimal</p>
            </div>
        </div>
        <div className="min-w-[140px] bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <Droplets size={20} className="text-blue-400" />
            <div>
                <p className="text-xs text-gray-400">Next Water</p>
                <p className="font-bold text-text-main">Tomorrow</p>
            </div>
        </div>
      </div>

      {/* Active Grows */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-main">Active Grows</h2>
        <div className="grid gap-4">
          {plants.map(plant => (
            <PlantCard key={plant.id} plant={plant} onClick={() => onNavigateToPlant(plant.id)} />
          ))}
        </div>
      </div>

      {/* Daily Checklist */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-text-main mb-6">Care Checklist</h2>
        <div className="space-y-4">
          {tasks.length === 0 ? (
             <p className="text-sm text-gray-400 text-center py-4">All tasks complete!</p>
          ) : (
              tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className="w-full flex items-center gap-4 group text-left"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    task.completed ? 'bg-primary border-primary text-white' : 'border-gray-200 text-transparent group-hover:border-primary'
                  }`}>
                    <CheckCircle size={14} />
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    task.completed ? 'text-gray-400 line-through' : 'text-text-main'
                  }`}>
                    {task.title}
                  </span>
                </button>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
