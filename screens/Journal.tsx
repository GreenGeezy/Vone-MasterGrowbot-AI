import React from 'react';
import { Calendar, Plus, ChevronRight, Sprout, AlertTriangle } from 'lucide-react';
import { Plant } from '../types';

interface JournalProps {
  plants: Plant[];
  onAddEntry: (entry: any) => void;
}

const Journal: React.FC<JournalProps> = ({ plants, onAddEntry }) => {
  const activePlant = plants[0]; // MVP assumes single plant focus

  return (
    <div className="p-6 pt-12 h-full overflow-y-auto pb-24 bg-surface">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main">Journal</h1>
        <button 
            onClick={() => onAddEntry({ type: 'note', text: 'New manual entry' })}
            className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {!activePlant || activePlant.journal.length === 0 ? (
        <div className="text-center py-12 opacity-50">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-400">No journal entries yet.</p>
          <p className="text-xs text-gray-300 mt-2">Diagnoses and chat notes will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
            {/* Timeline Line (Visual only) */}
            <div className="relative space-y-6 pl-4 border-l-2 border-gray-100 ml-2">
                {activePlant.journal.map((entry: any, index: number) => (
                    <div key={index} className="relative bg-white p-5 rounded-2xl shadow-sm border border-gray-100 ml-4 animate-slide-up">
                        {/* Dot on timeline */}
                        <div className="absolute top-6 -left-[29px] w-4 h-4 bg-white border-4 border-primary rounded-full" />
                        
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/5 px-2 py-1 rounded-md">
                                {entry.type || 'Log'}
                            </span>
                            <span className="text-xs text-gray-300">{entry.date}</span>
                        </div>
                        
                        {entry.image && (
                            <div className="w-full h-32 rounded-xl bg-gray-100 mb-3 overflow-hidden">
                                <img src={entry.image} className="w-full h-full object-cover" alt="Entry" />
                            </div>
                        )}
                        
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {entry.notes || entry.diagnosis || "No notes added."}
                        </p>
                        
                        {entry.type === 'diagnosis' && !entry.result?.healthy && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-red-500 font-medium">
                                <AlertTriangle size={12} />
                                <span>Action Required</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default Journal;
