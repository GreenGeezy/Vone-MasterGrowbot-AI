import React, { useState, useEffect } from 'react';
import PlantCard from '../components/PlantCard';
import Growbot from '../components/Growbot';
import { Sun, CheckCircle2, Circle, Plus, Search, X, Trash2 } from 'lucide-react'; // Added icons
import { getDailyInsight } from '../services/geminiService';
import { STRAIN_DATABASE } from '../data/strains'; // Import Database
import StrainCard from '../components/StrainCard'; // Import StrainCard

const Home: React.FC<any> = ({ plants, tasks, onToggleTask, onEditTask, onDeleteTask, onDeletePlant, onNavigateToPlant, onAddPlant }) => {
  const pendingTasks = tasks.filter((t: any) => !t.isCompleted);
  const completedCount = tasks.filter((t: any) => t.isCompleted).length;

  const [insight, setInsight] = useState("Loading today's insight...");
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<'Once' | 'Daily' | 'Weekly'>('Once');
  // Search State
  const [showStrainSearch, setShowStrainSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrain, setSelectedStrain] = useState<any | null>(null); // New State for Details View
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
            <div
              key={task.id}
              onClick={() => {
                if (!task.isCompleted) {
                  setEditingTask(task);
                  setEditTitle(task.title || '');
                  setEditNotes(task.notes || '');
                  setEditRecurrence((task.recurrence && task.recurrence !== 'once') ? (task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1) as any) : 'Once');
                  setShowTaskEditor(true);
                }
              }}
              className={`flex items-center gap-4 p-5 rounded-2xl mb-3 shadow-sm transition-all active:scale-95 group cursor-pointer ${task.isCompleted ? 'bg-gray-50 border border-transparent opacity-60' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}
            >
              <div className="flex-1 flex items-center gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                  className="focus:outline-none"
                >
                  {task.isCompleted ? <CheckCircle2 className="text-green-500" fill="currentColor" color="white" size={24} /> : <Circle className="text-gray-300" size={24} />}
                </button>
                <div>
                  <span className={`block text-sm font-bold transition-all ${task.isCompleted ? "line-through text-gray-400" : "text-text-main"}`}>{task.title}</span>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{task.source === 'ai_diagnosis' ? 'AI Recommended' : 'Routine'}</span>
                    {task.recurrence && task.recurrence !== 'once' && (
                      <span className="text-[10px] text-blue-500 font-black uppercase tracking-wider bg-blue-50 px-1.5 rounded-md">
                        {task.recurrence}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onDeleteTask && onDeleteTask(task.id); }} className="text-gray-300 hover:text-red-500 p-2 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-main">Your Plants</h2>
          <button onClick={() => onAddPlant({ name: 'New Plant', image: '' })} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors">
            <Plus size={14} /> Add Plant
          </button>
        </div>
        <div className="space-y-4">
          {plants.map((plant: any) => <PlantCard key={plant.id} plant={plant} onClick={() => onNavigateToPlant(plant.id)} onDelete={() => onDeletePlant && onDeletePlant(plant.id)} />)}
        </div>
      </div>


      {/* Task Editor Modal */}
      {showTaskEditor && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-800 mb-4">Edit Grow Task</h3>

            <input
              className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-800 mb-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Task Title"
              value={editTitle}
              autoFocus
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <div className="flex gap-2 mb-3">
              {['Once', 'Daily', 'Weekly'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setEditRecurrence(opt as any)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${editRecurrence === opt ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <textarea
              className="w-full bg-gray-50 p-3 rounded-xl font-medium text-gray-600 mb-6 outline-none text-xs resize-none"
              rows={3}
              placeholder="Add notes..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTaskEditor(false);
                  setEditingTask(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editTitle.trim() && editingTask && onEditTask) {
                    await onEditTask(editingTask.id, editTitle, editNotes, editRecurrence.toLowerCase());
                    setShowTaskEditor(false);
                    setEditingTask(null);
                  }
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
