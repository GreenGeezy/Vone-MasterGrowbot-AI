import React, { useState } from 'react';
import { Plant, JournalEntry } from '../types';
import { Plus, Search, Sprout, ChevronRight } from 'lucide-react';
import NoteCreator from '../components/NoteCreator';
import { STRAIN_DATABASE } from '../data/strains';

interface JournalProps {
  plants: Plant[];
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
}

const Journal: React.FC<JournalProps> = ({ plants, onAddEntry }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [showStrainSearch, setShowStrainSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Strains
  const filteredStrains = STRAIN_DATABASE.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-surface flex flex-col relative">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 bg-white border-b border-gray-100">
          <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-black text-text-main">Journal</h1>
              <button onClick={() => setShowCreator(true)} className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"><Plus size={24} /></button>
          </div>
          
          {/* Quick Stats or Plant Toggle would go here */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
             <button onClick={() => setShowStrainSearch(true)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 flex items-center gap-2">
                 <Search size={14} /> Strain Database
             </button>
          </div>
      </div>

      {/* Journal Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {plants[0]?.journal.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                  <Sprout size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-bold">No entries yet. Start logging!</p>
              </div>
          ) : (
              plants[0]?.journal.map((entry) => (
                  <div key={entry.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold uppercase text-gray-500">{entry.type}</span>
                          <span className="text-xs text-gray-400 font-medium">{entry.date}</span>
                      </div>
                      <h3 className="font-bold text-text-main mb-1">{entry.title}</h3>
                      <p className="text-sm text-text-sub leading-relaxed">{entry.notes}</p>
                      {entry.images && (
                          <div className="mt-3 flex gap-2 overflow-x-auto">
                              {entry.images.map((img, i) => (
                                  <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover" />
                              ))}
                          </div>
                      )}
                  </div>
              ))
          )}
      </div>

      {/* Note Creator Modal */}
      {showCreator && (
          <div className="absolute inset-0 z-50 bg-white">
              <NoteCreator onClose={() => setShowCreator(false)} onSave={(e) => { onAddEntry(e); setShowCreator(false); }} />
          </div>
      )}

      {/* Strain Search Modal */}
      {showStrainSearch && (
          <div className="absolute inset-0 z-50 bg-surface flex flex-col animate-in slide-in-from-bottom-10 duration-300">
              <div className="p-4 bg-white border-b border-gray-100 flex gap-3 items-center">
                  <div className="flex-1 relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search strains (e.g. Blue Dream)"
                        className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                      />
                  </div>
                  <button onClick={() => setShowStrainSearch(false)} className="text-xs font-bold text-gray-500">Close</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredStrains.map((strain, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                          <div>
                              <h4 className="font-bold text-text-main">{strain.name}</h4>
                              <p className="text-xs text-primary font-medium">{strain.type} • {strain.thc}% THC</p>
                          </div>
                          <ChevronRight size={18} className="text-gray-300" />
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default Journal;
