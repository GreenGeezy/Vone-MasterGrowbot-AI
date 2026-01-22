import React, { useState } from 'react';
import { Calendar, Plus, Search, Sprout, AlertTriangle, X } from 'lucide-react';
import { Plant } from '../types';
import { STRAIN_DATABASE } from '../data/strains';

interface JournalProps {
  plants: Plant[];
  onAddEntry: (entry: any) => void;
}

const Journal: React.FC<JournalProps> = ({ plants, onAddEntry }) => {
  const [showStrainSearch, setShowStrainSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const activePlant = plants[0]; 

  const filteredStrains = STRAIN_DATABASE.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 pt-12 h-full overflow-y-auto pb-24 bg-surface">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-text-main">Journal</h1>
            <p className="text-sm text-gray-400">{activePlant?.strain || "Select Strain..."}</p>
        </div>
        <button onClick={() => setShowStrainSearch(true)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Search size={20} className="text-gray-600" />
        </button>
      </div>

      {showStrainSearch && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">Identify Genetics</h2>
                      <button onClick={() => setShowStrainSearch(false)}><X /></button>
                  </div>
                  <input 
                    className="w-full bg-gray-100 p-4 rounded-xl mb-4"
                    placeholder="Search e.g. Gorilla Glue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="flex-1 overflow-y-auto space-y-3">
                      {filteredStrains.map(strain => (
                          <button key={strain.id} className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/5 transition-colors">
                              <p className="font-bold text-text-main">{strain.name}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{strain.type}</span>
                                <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">{strain.thc_level} THC</span>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {!activePlant || activePlant.journal.length === 0 ? (
        <div className="text-center py-12 opacity-50">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-400">No journal entries yet.</p>
        </div>
      ) : (
        <div className="space-y-6 pl-4 border-l-2 border-gray-100 ml-2">
            {activePlant.journal.map((entry: any, index: number) => (
                <div key={index} className="relative bg-white p-5 rounded-2xl shadow-sm border border-gray-100 ml-4 animate-slide-up">
                    <div className="absolute top-6 -left-[29px] w-4 h-4 bg-white border-4 border-primary rounded-full" />
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/5 px-2 py-1 rounded-md">{entry.type || 'Log'}</span>
                        <span className="text-xs text-gray-300">{entry.date}</span>
                    </div>
                    {entry.image && (
                        <div className="w-full h-32 rounded-xl bg-gray-100 mb-3 overflow-hidden">
                            <img src={entry.image} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed">{entry.notes || entry.diagnosis}</p>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Journal;
