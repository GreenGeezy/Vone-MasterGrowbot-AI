import React from 'react';
import { Plant, Task, UserProfile } from '../types';
import PlantCard from '../components/PlantCard';
import { CheckCircle, Circle, Calendar, Sun, Droplets } from 'lucide-react';

interface HomeProps {
  plants: Plant[];
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onNavigateToPlant: (plantId: string) => void;
}

const Home: React.FC<HomeProps> = ({ plants, tasks, onToggleTask, onNavigateToPlant }) => {
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

      {/* Weather / Status Widget (Static for MVP) */}
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

      {/* Plants Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold text-text-main">Active Grows</h2>
        </div>
        <div className="grid gap-4">
          {plants.map(plant => (
            <PlantCard key={plant.id} plant={plant} onClick={() => onNavigateToPlant(plant.id)} />
          ))}
        </div>
      </div>

      {/* Daily Tasks */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-text-main mb-6">Daily Checklist</h2>
        <div className="space-y-4">
          {tasks.length === 0 ? (
             <p className="text-sm text-gray-400 text-center py-4">No tasks for today. Great job!</p>
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
