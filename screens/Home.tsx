
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="pb-32 px-6 pt-12 min-h-screen bg-surface font-sans">
      
      {/* 1. Minimalist Header & Insight */}
      <div className="mb-10">
        <div className="flex items-start gap-4">
          <Growbot size="md" mood="happy" className="mt-1" />
          <div>
             <span className="text-[10px] font-bold text-text-sub uppercase tracking-widest flex items-center gap-1 mb-2">
               <Sun size={12} className="text-primary" /> Daily Insight
             </span>
             <h1 className="text-xl font-medium text-text-main leading-relaxed">
               "{dailyInsight}"
             </h1>
          </div>
        </div>
      </div>

      {/* 2. Today's Actions (Focus) */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-lg font-bold text-text-main">Today's Care</h2>
           <span className="text-xs font-bold text-text-sub bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
             {completedTasks.length}/{tasks.length} Done
           </span>
        </div>

        <div className="space-y-3">
          {activeTasks.length === 0 && completedTasks.length > 0 && (
             <div className="p-4 bg-green-50 text-primary rounded-2xl text-sm font-medium flex items-center gap-2">
                <CheckCircle2 size={18} /> You're all caught up for today!
             </div>
          )}

          {tasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => onToggleTask(task.id)}
              className={`group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 cursor-pointer ${
                task.completed 
                  ? 'bg-transparent' 
                  : 'bg-white shadow-sm hover:shadow-md border border-gray-100'
              }`}
            >
              <div className={`flex-shrink-0 transition-colors duration-300 ${
                  task.completed ? 'text-primary' : 'text-gray-300 group-hover:text-primary'
              }`}>
                 {task.completed ? <CheckCircle2 size={24} className="fill-current bg-white rounded-full" /> : <Circle size={24} />}
              </div>
              
              <span className={`text-sm font-medium transition-colors ${task.completed ? 'text-gray-400 line-through' : 'text-text-main'}`}>
                  {task.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. My Garden (Status) */}
      <div>
        <h2 className="text-lg font-bold text-text-main mb-4">Your Plants</h2>
        <div className="flex flex-col gap-3">
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
  );
};

export default Home;