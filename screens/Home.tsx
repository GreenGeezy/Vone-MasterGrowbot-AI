import React, { useEffect, useState } from 'react';
import { Plant, Task } from '../types';
import PlantCard from '../components/PlantCard';
import Growbot from '../components/Growbot';
import { CheckCircle2, Circle, Sun } from 'lucide-react';
import { getDailyInsight } from '../services/geminiService';

interface HomeProps {
  plants: Plant[];
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onNavigateToPlant: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ plants, tasks, onToggleTask, onNavigateToPlant }) => {
  const [dailyInsight, setDailyInsight] = useState<string>("Checking your garden...");
  
  useEffect(() => {
    const fetchInsight = async () => {
      setTimeout(async () => {
          const insight = await getDailyInsight(plants[0]?.stage || "Seedling");
          setDailyInsight(insight);
      }, 500);
    };
    fetchInsight();
  }, []);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="pb-32 px-4 sm:px-8 pt-8 sm:pt-12 min-h-screen bg-surface font-sans">
      
      {/* 1. Header & Insight */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <Growbot size="md" mood="happy" className="flex-shrink-0" />
          <div className="flex-1">
             <span className="text-[10px] font-bold text-text-sub uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1 mb-2">
               <Sun size={12} className="text-primary" /> Daily Insight
             </span>
             <h1 className="text-xl sm:text-2xl font-semibold text-text-main leading-relaxed">
               "{dailyInsight}"
             </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
        {/* 2. Today's Actions */}
        <div>
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg sm:text-xl font-bold text-text-main">Today's Care</h2>
             <span className="text-xs font-bold text-text-sub bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
               {completedTasks.length}/{tasks.length} Done
             </span>
          </div>

          <div className="space-y-4">
            {activeTasks.length === 0 && completedTasks.length > 0 && (
               <div className="p-5 bg-green-50 text-primary rounded-[2rem] text-sm font-bold flex items-center gap-3 border border-primary/10">
                  <CheckCircle2 size={20} /> You're all caught up for today!
               </div>
            )}

            {tasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => onToggleTask(task.id)}
                className={`group flex items-center gap-4 p-5 rounded-[2rem] transition-all duration-300 cursor-pointer ${
                  task.completed 
                    ? 'bg-white/40 border border-transparent opacity-60' 
                    : 'bg-white shadow-soft hover:shadow-md border border-gray-100 hover:border-primary/20'
                }`}
              >
                <div className={`flex-shrink-0 transition-colors duration-300 ${
                    task.completed ? 'text-primary' : 'text-gray-300 group-hover:text-primary'
                }`}>
                   {task.completed ? <CheckCircle2 size={26} className="fill-current bg-white rounded-full" /> : <Circle size={26} />}
                </div>
                
                <span className={`text-base font-semibold transition-colors ${task.completed ? 'text-gray-400 line-through' : 'text-text-main'}`}>
                    {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. My Garden */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-main mb-6">Your Plants</h2>
          <div className="grid grid-cols-1 gap-4">
              {plants.map(plant => (
              <PlantCard 
                  key={plant.id} 
                  plant={plant} 
                  onPress={() => onNavigateToPlant(plant.id)} 
              />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;