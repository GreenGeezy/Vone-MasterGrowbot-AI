import React, { useEffect, useState } from 'react';
import { Plant, Task } from '../types';
import PlantCard from '../components/PlantCard';
import Growbot from '../components/Growbot';
import { CheckCircle2, Circle, Sun } from 'lucide-react';
import { getDailyInsight } from '../services/geminiService';

const Home: React.FC<any> = ({ plants, tasks, onToggleTask, onNavigateToPlant }) => {
  const [dailyInsight, setDailyInsight] = useState<string>("Checking garden...");
  
  useEffect(() => {
    const fetchInsight = async () => {
      const insight = await getDailyInsight(plants[0]?.stage || "Seedling");
      setDailyInsight(insight);
    };
    fetchInsight();
  }, [plants]);

  return (
    <div className="pb-32 px-6 pt-12 min-h-screen bg-surface font-sans">
      <div className="mb-8 flex gap-4">
        <Growbot size="md" mood="happy" />
        <div>
             <span className="text-[10px] font-bold text-text-sub uppercase tracking-widest flex items-center gap-1 mb-1"><Sun size={12} className="text-primary" /> Daily Insight</span>
             <h1 className="text-xl font-semibold text-text-main">"{dailyInsight}"</h1>
        </div>
      </div>
      <div className="mb-8">
          <h2 className="text-lg font-bold text-text-main mb-4">Your Plants</h2>
          {plants.map((plant: any) => <PlantCard key={plant.id} plant={plant} onClick={() => onNavigateToPlant(plant.id)} />)}
      </div>
      <div>
          <h2 className="text-lg font-bold text-text-main mb-4">Tasks</h2>
          {tasks.map((task: any) => (
              <div key={task.id} onClick={() => onToggleTask(task.id)} className="flex items-center gap-4 p-4 bg-white rounded-2xl mb-3 shadow-sm">
                  {task.completed ? <CheckCircle2 className="text-primary" /> : <Circle className="text-gray-300" />}
                  <span className={task.completed ? "line-through text-gray-400" : "text-text-main font-bold"}>{task.title}</span>
              </div>
          ))}
      </div>
    </div>
  );
};
export default Home;
