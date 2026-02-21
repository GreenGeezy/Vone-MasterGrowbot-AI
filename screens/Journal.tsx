import React, { useState } from 'react';
import { Calendar, Plus, X, CheckCircle2, Trash2 } from 'lucide-react';
import NoteCreator from '../components/NoteCreator';
import StrainCard from '../components/StrainCard';
import { analyzeGrowLog } from '../services/geminiService';
import { STRAIN_DATABASE } from '../data/strains';

const Journal: React.FC<any> = ({ plants, tasks = [], onAddEntry, onAddTask, onUpdatePlant, onDeleteTask, onDeleteEntry }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false); // New Task Modal

  const [showFabMenu, setShowFabMenu] = useState(false); // Speed dial toggle

  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskRecurrence, setTaskRecurrence] = useState<'Once' | 'Daily' | 'Weekly'>('Once');

  // Note View State
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const [selectedStrain, setSelectedStrain] = useState<any | null>(null); // New State for Preview Modal
  const plant = plants[0];

  const handleSaveWrapper = async (entry: any) => {
    // Ensure image property is correctly passed from NoteCreator
    const finalEntry = {
      ...entry,
      imageUri: entry.image || entry.imageUri // Handle potential property name mismatch
    };
    const aiData = await analyzeGrowLog(entry.notes);
    onAddEntry({ ...finalEntry, aiAnalysis: { summary: aiData } });
    setShowCreator(false);
  };

  const handleCreateTask = async () => {
    if (newTaskTitle.trim()) {
      await onAddTask(newTaskTitle, newTaskDate, 'user', { recurrence: taskRecurrence.toLowerCase() }); // Pass recurrence
      setShowTaskCreator(false);
      setNewTaskTitle('');
      setTaskRecurrence('Once'); // Reset
      setShowFabMenu(false);
    }
  };

  // Combine and Sort Feed
  const feedItems = [
    ...(plant?.journal || []).map((j: any) => ({ ...j, feedType: 'journal' })),
    ...tasks.map((t: any) => ({ ...t, feedType: 'task', date: t.dueDate })) // Map dueDate to date for sorting
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-surface min-h-screen pb-32 pt-12 relative px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main">Journal</h1>
      </div>

      <div className="mb-6">
        {plant?.strainDetails ? (
          <StrainCard strain={plant.strainDetails} />
        ) : (
          <div className="p-4 bg-orange-50 text-orange-800 rounded-xl font-bold text-xs border border-orange-100 flex justify-between items-center">
            <span>No strain selected.</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {feedItems.map((item: any) => {
          if (item.feedType === 'task') {
            return (
              <div key={`task-${item.id}`} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-blue-400 flex items-center justify-between opacity-80 group">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.date} • Task</div>
                  <div className={`font-bold ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); onDeleteTask && onDeleteTask(item.id); }} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                  {item.isCompleted && <CheckCircle2 size={18} className="text-green-500" />}
                </div>
              </div>
            );
          }
          // Journal Entry Render
          return (
            <div key={item.id} onClick={() => setSelectedEntry(item)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{item.date}</span>
                <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-md text-gray-600 uppercase">{item.type === 'chat' ? 'AI Log' : item.type}</span>
              </div>
              {item.notes && <div className="text-sm text-gray-700 leading-relaxed font-medium line-clamp-3">{item.notes}</div>}

              {(item.image || item.imageUri) && (
                <div className="mt-3 relative rounded-xl overflow-hidden group">
                  <img src={item.image || item.imageUri} className="w-full h-40 object-cover transform transition-transform group-hover:scale-105" alt="Journal entry" />
                </div>
              )}

              {item.aiAnalysis && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl text-xs text-green-800 font-medium flex gap-2">
                  <div className="mt-0.5"><Sparkles size={12} /></div>
                  {item.aiAnalysis.summary.replace(/"/g, '')}
                </div>
              )}
            </div>
          );
        })}

        {feedItems.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p>No entries yet.</p>
            <p className="text-xs mt-1">Tap the + button to start log.</p>
          </div>
        )}
      </div>

      {/* FAB with Speed Dial */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
        {showFabMenu && (
          <>
            <button onClick={() => { setShowFabMenu(false); setShowTaskCreator(true); }} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-in slide-in-from-bottom-2">
              <span className="text-xs">Add Task</span> <CheckCircle2 size={18} />
            </button>
            <button onClick={() => { setShowFabMenu(false); setShowCreator(true); }} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-in slide-in-from-bottom-2 delay-75">
              <span className="text-xs">Add Note</span> <Calendar size={18} />
            </button>
          </>
        )}
        <button onClick={() => setShowFabMenu(!showFabMenu)} className={`w-14 h-14 ${showFabMenu ? 'bg-gray-800' : 'bg-gray-900'} text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform`}>
          {showFabMenu ? <X size={24} /> : <Plus size={28} />}
        </button>
      </div>



      {/* Task Creator Modal */}
      {showTaskCreator && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-800 mb-4">New Grow Task</h3>

            {/* Title */}
            <input
              className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-800 mb-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Task Title (e.g. Flush Today)"
              value={newTaskTitle}
              autoFocus
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />

            {/* Recurrence Selection */}
            <div className="flex gap-2 mb-3">
              {['Once', 'Daily', 'Weekly'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTaskRecurrence(opt as any)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${taskRecurrence === opt ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mb-3 text-center">*Recurrence is a visual tag only.</p>

            {/* Notes */}
            <textarea
              className="w-full bg-gray-50 p-3 rounded-xl font-medium text-gray-600 mb-6 outline-none text-xs resize-none"
              rows={3}
              placeholder="Add notes..."
              id="task-notes-input" // Using ID to grab value in handleCreate because of state complexity in replace block
            />

            <div className="flex gap-3">
              <button onClick={() => setShowTaskCreator(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
              <button
                onClick={async () => {
                  if (newTaskTitle.trim()) {
                    const notes = (document.getElementById('task-notes-input') as HTMLTextAreaElement)?.value || '';
                    await onAddTask(newTaskTitle, new Date().toISOString().split('T')[0], 'user', { notes, recurrence: taskRecurrence.toLowerCase() });
                    setShowTaskCreator(false);
                    setNewTaskTitle('');
                    setTaskRecurrence('Once');
                    setShowFabMenu(false);
                  }
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreator && <NoteCreator onSave={handleSaveWrapper} onClose={() => setShowCreator(false)} />}

      {/* Expanded Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">

            {/* Image Header if present */}
            {(selectedEntry.image || selectedEntry.imageUri) && (
              <div className="relative h-64 bg-black">
                <img
                  src={selectedEntry.image || selectedEntry.imageUri}
                  className="w-full h-full object-cover opacity-90"
                  alt="Full view"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            <div className="p-8 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedEntry.date}</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">{selectedEntry.type}</h2>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {selectedEntry.notes && (
                <div className="text-base text-gray-700 leading-relaxed font-medium mb-6">
                  {selectedEntry.notes}
                </div>
              )}

              {selectedEntry.aiAnalysis && (
                <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-2 mb-2 text-green-700 font-bold uppercase text-xs tracking-wider">
                    <Sparkles size={14} /> AI Analysis
                  </div>
                  <p className="text-sm text-green-800 leading-relaxed font-medium">
                    {selectedEntry.aiAnalysis.summary.replace(/"/g, '')}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this journal entry?")) {
                    onDeleteEntry && onDeleteEntry(selectedEntry.id, plant?.id);
                    setSelectedEntry(null);
                  }
                }}
                className="px-4 py-3 text-red-500 font-bold flex items-center gap-2 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={18} /> Delete Note
              </button>
              <button onClick={() => setSelectedEntry(null)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Icon component helper if Sparkles isn't imported (it wasn't in original file, adding logic to import it)
import { Sparkles } from 'lucide-react';

export default Journal;
