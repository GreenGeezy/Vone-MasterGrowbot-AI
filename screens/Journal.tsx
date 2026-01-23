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
  const plant = plants[0];

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
            <button onClick={() => setShowStrainSearch(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-full text-xs font-bold uppercase"><Search size={14} /> Strain Search</button>
      </div>
      <div className="mb-6">
        {plant?.strainDetails ? <StrainCard strain={plant.strainDetails} /> : <div className="p-4 bg-orange-50 text-orange-800 rounded-xl font-bold text-xs">No strain selected</div>}
      </div>
      <div className="space-y-4">
         {plant?.journal.map((entry: any) => (
             <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm">
                 <div className="text-xs text-gray-400 font-bold mb-1">{entry.date}</div>
                 <div className="font-bold text-text-main">{entry.type}</div>
                 {entry.notes && <div className="text-sm text-gray-600">{entry.notes}</div>}
                 {entry.image && <img src={entry.image} className="mt-2 rounded-xl h-32 w-full object-cover" />}
             </div>
         ))}
      </div>
      <button onClick={() => setShowCreator(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-text-main text-white rounded-full flex items-center justify-center shadow-2xl"><Plus size={28} /></button>
      {showStrainSearch && (
        <div className="fixed inset-0 z-50 bg-white p-6">
            <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">Select Genetics</h2>
                <button onClick={() => setShowStrainSearch(false)}><X /></button>
            </div>
            <input placeholder="Search..." className="w-full bg-gray-50 p-4 rounded-xl mb-4" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <div className="space-y-4">
                {filteredStrains.map(s => <div key={s.id} onClick={() => { onUpdatePlant(plant.id, { strain: s.name, strainDetails: s }); setShowStrainSearch(false); }}><StrainCard strain={s} compact /></div>)}
            </div>
        </div>
      )}
      {showCreator && <NoteCreator onSave={handleSaveWrapper} onClose={() => setShowCreator(false)} />}
    </div>
  );
};
export default Journal;
