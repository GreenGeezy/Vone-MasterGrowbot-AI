import React, { useState } from 'react';
import { Calendar, Plus, Search, X } from 'lucide-react';
import NoteCreator from '../components/NoteCreator';
import StrainCard from '../components/StrainCard';
import { analyzeGrowLog } from '../services/geminiService';
import { STRAIN_DATABASE } from '../data/strains';

const Journal: React.FC<any> = ({ plants, onAddEntry, onUpdatePlant }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [showStrainSearch, setShowStrainSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const plant = plants[0]; // Assuming single plant focus for now, consistent with existing

  const filteredStrains = STRAIN_DATABASE.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSaveWrapper = async (entry: any) => {
    const aiData = await analyzeGrowLog(entry.notes);
    onAddEntry({ ...entry, aiAnalysis: { summary: aiData } });
    setShowCreator(false);
  };

  return (
    <div className="bg-surface min-h-screen pb-32 pt-12 relative px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main">Journal</h1>
        <button onClick={() => setShowStrainSearch(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-full text-xs font-bold uppercase hover:bg-green-50 hover:text-green-700 transition-colors shadow-sm">
          <Search size={14} /> Strain Search
        </button>
      </div>

      <div className="mb-6">
        {plant?.strainDetails ? (
          <StrainCard strain={plant.strainDetails} />
        ) : (
          <div onClick={() => setShowStrainSearch(true)} className="p-4 bg-orange-50 text-orange-800 rounded-xl font-bold text-xs border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors flex justify-between items-center">
            <span>No strain selected. Tap to add.</span>
            <Plus size={16} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {plant?.journal.map((entry: any) => (
          <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{entry.date}</span>
              <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-md text-gray-600 uppercase">{entry.type}</span>
            </div>
            {entry.notes && <div className="text-sm text-gray-700 leading-relaxed font-medium">{entry.notes}</div>}

            {/* Journal Image Rendering */}
            {entry.image && (
              <div className="mt-3 relative rounded-xl overflow-hidden group">
                <img src={entry.image} className="w-full h-40 object-cover transform transition-transform group-hover:scale-105" alt="Journal entry" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            )}

            {/* AI Analysis Summary */}
            {entry.aiAnalysis && (
              <div className="mt-3 p-3 bg-green-50 rounded-xl text-xs text-green-800 font-medium flex gap-2">
                <div className="mt-0.5"><Sparkles size={12} /></div>
                {entry.aiAnalysis.summary.replace(/"/g, '')}
              </div>
            )}
          </div>
        ))}
        {plant?.journal.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p>No entries yet.</p>
            <p className="text-xs mt-1">Tap the + button to start log.</p>
          </div>
        )}
      </div>

      <button onClick={() => setShowCreator(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-40">
        <Plus size={28} />
      </button>

      {/* Strain Search Modal */}
      {showStrainSearch && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center gap-4">
            <button onClick={() => setShowStrainSearch(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search 100+ Strains..."
                className="w-full bg-gray-50 py-3 pl-10 pr-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredStrains.map(s => (
              <div key={s.id} onClick={() => { onUpdatePlant(plant.id, { strain: s.name, strainDetails: s }); setShowStrainSearch(false); }}>
                <StrainCard strain={s} compact />
              </div>
            ))}
            {filteredStrains.length === 0 && (
              <div className="text-center py-10 opacity-50">
                <p>No strains found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreator && <NoteCreator onSave={handleSaveWrapper} onClose={() => setShowCreator(false)} />}
    </div>
  );
};

// Simple Icon component helper if Sparkles isn't imported (it wasn't in original file, adding logic to import it)
import { Sparkles } from 'lucide-react';

export default Journal;
