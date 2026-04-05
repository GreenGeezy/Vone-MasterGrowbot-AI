import React, { useState } from 'react';
import PlantCard from '../components/PlantCard';
import Growbot from '../components/Growbot';
import { Sun, CheckCircle2, Circle, Plus, Zap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getTokenState, isAnnualPlanValid } from '../services/tokenService';

const Home: React.FC<any> = ({ plants, tasks, onToggleTask, onNavigateToPlant, onAddPlant, onOpenTokenShop }) => {
  const pendingTasks = tasks.filter((t: any) => !t.isCompleted);
  const completedCount = tasks.filter((t: any) => t.isCompleted).length;
  const isWeb = Capacitor.getPlatform() === 'web';

  const tokenState = getTokenState();
  const isAnnual = isAnnualPlanValid(tokenState);
  const creditLabel = isAnnual
    ? 'Pro Plan'
    : tokenState.free_uses_remaining > 0
    ? `${tokenState.free_uses_remaining} free credit${tokenState.free_uses_remaining !== 1 ? 's' : ''} left`
    : `${Math.floor(tokenState.balance)} credit${Math.floor(tokenState.balance) !== 1 ? 's' : ''}`;

  const TaskList = () => (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="p-8 bg-white rounded-[2rem] border border-gray-100 text-center shadow-sm">
          <Sun size={40} className="text-orange-400 mx-auto mb-4 animate-spin-slow" />
          <h3 className="text-lg font-bold text-gray-800 mb-1">All Caught Up!</h3>
          <p className="text-xs text-gray-500 font-medium">Your garden is looking great. Enjoy the day.</p>
        </div>
      ) : (
        tasks.map((task: any) => (
          <div
            key={task.id}
            onClick={() => onToggleTask(task.id)}
            className={`flex items-center gap-4 p-5 rounded-2xl mb-3 shadow-sm transition-all cursor-pointer select-none ${
              task.isCompleted
                ? 'bg-gray-50 border border-transparent opacity-60 hover:opacity-80'
                : 'bg-white border border-gray-100 hover:border-green-200 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {task.isCompleted
              ? <CheckCircle2 className="text-green-500" fill="currentColor" color="white" size={24} />
              : <Circle className="text-gray-300" size={24} />
            }
            <div className="flex-1">
              <span className={`block text-sm font-bold transition-all ${task.isCompleted ? 'line-through text-gray-400' : 'text-text-main'}`}>
                {task.title}
              </span>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {task.source === 'ai_diagnosis' ? 'AI Recommended' : 'Routine'}
                </span>
                {task.recurrence && task.recurrence !== 'once' && (
                  <span className="text-[10px] text-blue-500 font-black uppercase tracking-wider bg-blue-50 px-1.5 rounded-md">
                    {task.recurrence}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const PlantsList = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-text-main">Your Plants</h2>
        <button
          onClick={() => onAddPlant({ name: 'New Plant', image: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors"
        >
          <Plus size={14} /> Add Plant
        </button>
      </div>
      <div className="space-y-4">
        {plants.map((plant: any) => (
          <PlantCard key={plant.id} plant={plant} onClick={() => onNavigateToPlant(plant.id)} />
        ))}
      </div>
    </>
  );

  return (
    <div className={`px-6 min-h-screen bg-surface font-sans ${isWeb ? 'pt-6 pb-8' : 'pt-12 pb-32'}`}>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <Growbot size="md" mood={pendingTasks.length === 0 ? 'happy' : 'neutral'} />
          <h1 className="text-2xl font-black text-text-main mt-4">Daily Grow Tasks</h1>
          <p className="text-sm text-text-sub font-medium">{pendingTasks.length} tasks remaining today</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed</span>
          <div className="text-2xl font-black text-green-500">{completedCount}</div>
          {isWeb && !isAnnual && (
            <div className="mt-2 flex flex-col items-end gap-1">
              <span className="text-[11px] text-gray-400 font-medium">{creditLabel}</span>
              <button
                onClick={onOpenTokenShop}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-emerald-700 transition-colors"
              >
                <Zap size={11} />
                Get More Credits
              </button>
            </div>
          )}
        </div>
      </div>

      {isWeb ? (
        <div className="grid grid-cols-2 gap-8 items-start">
          <div>
            <TaskList />
          </div>
          <div>
            <PlantsList />
          </div>
        </div>
      ) : (
        <>
          <TaskList />
          <div className="mt-8">
            <PlantsList />
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
