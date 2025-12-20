import React, { useState, useMemo, useEffect } from 'react';
import { Plant, JournalEntry, Strain } from '../types';
import { 
  ScanLine, 
  MessageSquare, 
  StickyNote,
  Leaf,
  Calendar,
  Plus,
  PenTool,
  Droplets,
  Utensils,
  Scissors,
  Thermometer,
  Sparkles,
  TrendingUp,
  Camera,
  Search,
  X,
  Share2,
  Info,
  ChevronRight
} from 'lucide-react';
import NoteCreator from '../components/NoteCreator';
import StrainCard from '../components/StrainCard';
import Growbot from '../components/Growbot'; 
import { analyzeGrowLog } from '../services/geminiService';
import { STRAIN_DATABASE } from '../data/strains';
import { generatePublicLink, shareContent } from '../services/shareService';

interface JournalProps {
  plants: Plant[];
  tasks?: any;
  onToggleTask?: any;
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  onUpdatePlant?: (plantId: string, updates: Partial<Plant>) => void;
}

const Journal: React.FC<JournalProps> = ({ plants, onAddEntry, onUpdatePlant }) => {
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(0);
  const [showCreator, setShowCreator] = useState(false);
  const [showStrainSearch, setShowStrainSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Onboarding Tooltip State
  const [showSearchTooltip, setShowSearchTooltip] = useState(false);

  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('has_seen_strain_tooltip');
    if (!hasSeenTooltip) {
      setShowSearchTooltip(true);
    }
  }, []);

  const dismissTooltip = () => {
    localStorage.setItem('has_seen_strain_tooltip', 'true');
    setShowSearchTooltip(false);
  };
  
  const plant = plants[selectedPlantIndex];

  // Filter strains for search
  const filteredStrains = useMemo(() => {
    if (!searchQuery) return STRAIN_DATABASE;
    return STRAIN_DATABASE.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSelectStrain = (strain: Strain) => {
      if (plant && onUpdatePlant) {
          onUpdatePlant(plant.id, {
              strain: strain.name,
              strainDetails: strain
          });
          setShowStrainSearch(false);
          setSearchQuery('');
      }
  };

  const handleCreateCustomStrain = () => {
    if (plant && onUpdatePlant && searchQuery.trim()) {
        onUpdatePlant(plant.id, {
            strain: searchQuery.trim(),
            // Clear strain details since it's custom/unknown
            strainDetails: undefined 
        });
        setShowStrainSearch(false);
        setSearchQuery('');
    }
  };

  const handleShareEntry = async (entry: JournalEntry) => {
      const url = generatePublicLink('journal', entry.id);
      const shareText = `Check out my grow journal entry for ${plant?.name || 'my plant'}! \n\n${entry.title}: ${entry.notes || ''}`;
      
      const { success, method } = await shareContent(entry.title, shareText, url);
      
      if (success && method === 'clipboard') {
          alert('Link copied to clipboard!');
      }
  };

  if (!plant) return <div className="p-6 text-center text-text-sub">No plants active.</div>;

  // Combine Journal Entries + Weekly Summaries into one "Feed"
  const feedItems = [...plant.journal].sort((a, b) => 
     new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleSaveWrapper = async (entry: Omit<JournalEntry, 'id' | 'date'>) => {
     let aiData = undefined;
     if (entry.type === 'note' && (entry.notes || entry.imageUri)) {
        const imageBase64 = entry.imageUri ? entry.imageUri.split(',')[1] : undefined;
        aiData = await analyzeGrowLog(entry.notes || "", (entry.tags || []) as string[], imageBase64);
     }
     onAddEntry({
         ...entry,
         aiAnalysis: aiData
     });
     setShowCreator(false);
  };

  const getTagIcon = (tag: string) => {
     switch(tag) {
         case 'water': return <Droplets size={10} />;
         case 'feed': return <Utensils size={10} />;
         case 'prune': return <Scissors size={10} />;
         case 'env': return <Thermometer size={10} />;
         case 'photo': return <Camera size={10} />;
         default: return <Leaf size={10} />;
     }
  };

  const renderTimelineItem = (entry: JournalEntry, index: number) => {
    let Icon = StickyNote;
    let colorClass = "bg-gray-100 text-gray-500";
    let borderColor = "border-l-gray-200";

    if (entry.type === 'diagnosis') {
        Icon = ScanLine;
        colorClass = "bg-red-50 text-alert-red";
        borderColor = "border-l-red-200";
    } else if (entry.type === 'chat') {
        Icon = MessageSquare;
        colorClass = "bg-blue-50 text-neon-blue";
        borderColor = "border-l-blue-200";
    } else if (entry.drawingUri) {
        Icon = PenTool;
        colorClass = "bg-emerald-50 text-primary";
        borderColor = "border-l-emerald-200";
    } else if (entry.tags && entry.tags.length > 0) {
        if (entry.tags.includes('water')) { colorClass = "bg-blue-50 text-blue-500"; Icon = Droplets; }
        else if (entry.tags.includes('feed')) { colorClass = "bg-yellow-50 text-yellow-600"; Icon = Utensils; }
        else if (entry.tags.includes('prune')) { colorClass = "bg-orange-50 text-orange-500"; Icon = Scissors; }
        else if (entry.tags.includes('env')) { colorClass = "bg-purple-50 text-deep-purple"; Icon = Thermometer; }
    }

    return (
      <div key={entry.id} className="relative pl-8 pb-8 last:pb-0">
        {index !== feedItems.length - 1 && (
            <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-gray-100"></div>
        )}
        
        <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ${colorClass} shadow-sm z-10`}>
            <Icon size={12} />
        </div>

        <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition-shadow ${
            entry.type === 'chat' || entry.type === 'diagnosis' || entry.drawingUri ? 'border-l-4 ' + borderColor : ''
        }`}>
           <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider flex items-center gap-1">
                 <Calendar size={10} /> {entry.date}
              </span>
              <div className="flex gap-2 items-center">
                <div className="flex gap-1">
                    {entry.tags?.map(t => (
                        <span key={t} className="p-1 rounded-full bg-gray-100 text-gray-500">{getTagIcon(t)}</span>
                    ))}
                </div>
                {/* Share Button */}
                <button 
                  onClick={() => handleShareEntry(entry)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary transition-colors"
                >
                    <Share2 size={14} />
                </button>
              </div>
           </div>

           <h3 className="font-bold text-text-main text-sm mb-1">{entry.title}</h3>
           
           {entry.notes && (
               <p className="text-xs text-text-sub leading-relaxed font-medium whitespace-pre-line mb-2">
                   {entry.notes}
               </p>
           )}

           {entry.aiAnalysis && (
               <div className={`mt-3 p-3 rounded-xl border ${entry.aiAnalysis.healthIndicator === 'concern' || entry.aiAnalysis.healthIndicator === 'critical' ? 'bg-red-50 border-red-100' : 'bg-primary/5 border-primary/10'}`}>
                   <div className="flex items-center gap-2 mb-1">
                       <Sparkles size={12} className={entry.aiAnalysis.healthIndicator === 'good' ? "text-primary" : "text-alert-red"} />
                       <span className={`text-[10px] font-bold uppercase tracking-wider ${entry.aiAnalysis.healthIndicator === 'good' ? "text-primary" : "text-alert-red"}`}>AI Insight</span>
                   </div>
                   <p className="text-xs font-bold text-text-main mb-1">{entry.aiAnalysis.summary}</p>
                   {entry.aiAnalysis.yieldPrediction && (
                        <div className="flex items-center gap-1 text-[10px] text-text-sub mt-2 border-t border-black/5 pt-2">
                            <TrendingUp size={10} /> {entry.aiAnalysis.yieldPrediction}
                        </div>
                   )}
               </div>
           )}

           {entry.type === 'chat' && entry.originalQuestion && (
               <div className="mt-3 pt-2 border-t border-gray-50">
                   <p className="text-[10px] text-gray-400 italic">" {entry.originalQuestion} "</p>
               </div>
           )}

           {entry.drawingUri && (
                <div className="mt-3 rounded-xl overflow-hidden bg-white border border-gray-100 p-2">
                    <img src={entry.drawingUri} alt="User sketch" className="w-full max-h-60 object-contain" />
                </div>
           )}

           {entry.imageUri && !entry.drawingUri && (
               <div className="mt-3 rounded-xl overflow-hidden h-32 w-full bg-gray-100 relative">
                   <img src={entry.imageUri} alt="Entry attachment" className="w-full h-full object-cover" />
               </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface min-h-screen pb-32 font-sans pt-12 relative">
      
      {/* 1. Header & Plant Switcher */}
      <div className="px-6 mb-4">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-text-main">Journal</h1>
            <button 
                onClick={() => setShowStrainSearch(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-full text-text-sub hover:text-primary shadow-sm active:scale-95 transition-all"
            >
                <span className="text-xs font-bold uppercase tracking-wide">Strain Search</span>
                <Search size={18} />
            </button>
        </div>

        {/* Minimalist Plant Select */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mb-4">
          {plants.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlantIndex(idx)}
              className={`flex-shrink-0 flex items-center gap-3 pr-4 p-1.5 rounded-full transition-all border ${
                idx === selectedPlantIndex 
                ? 'bg-white border-primary shadow-sm' 
                : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={p.imageUri} className="w-8 h-8 rounded-full object-cover bg-gray-200" alt="" />
              <div className="text-left">
                  <span className={`block text-xs font-bold leading-none ${idx === selectedPlantIndex ? 'text-text-main' : 'text-text-sub'}`}>{p.name}</span>
                  <span className="text-[10px] text-primary font-medium">{p.stage}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 2. Enhanced Search Bar / Strain Header */}
        <div className="relative z-20">
            {plant.strain ? (
                // Selected State
                <div className="flex items-center justify-between bg-white/80 border border-primary/20 rounded-2xl p-3 shadow-sm">
                    <div>
                        <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider block mb-0.5">Selected Strain</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-primary">{plant.strain}</span>
                            {!plant.strainDetails && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Custom</span>}
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowStrainSearch(true)}
                        className="text-[10px] font-bold text-text-sub hover:text-primary px-3 py-1.5 bg-gray-50 hover:bg-white rounded-lg border border-gray-100 transition-all"
                    >
                        Change
                    </button>
                </div>
            ) : (
                // Empty State Search Bar
                <div className="relative">
                    <button 
                        onClick={() => setShowStrainSearch(true)}
                        className="w-full bg-white rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm border border-gray-100 hover:border-primary/30 transition-all text-left group"
                    >
                        <Search size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-gray-400 group-hover:text-text-sub">Search cannabis strains (or type custom)</span>
                    </button>

                    {/* Onboarding Tooltip */}
                    {showSearchTooltip && (
                        <div className="absolute top-full mt-3 left-0 w-full z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-primary text-white p-4 rounded-xl shadow-xl relative">
                                {/* Triangle Arrow */}
                                <div className="absolute -top-2 left-6 w-4 h-4 bg-primary rotate-45 transform"></div>
                                
                                <div className="flex items-start gap-3 relative z-10">
                                    <Info size={20} className="mt-0.5 flex-shrink-0 text-white/80" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold leading-snug mb-1">Identify Your Genetics</p>
                                        <p className="text-xs text-white/90 leading-relaxed mb-3">
                                            Tap above to search cannabis strains or add a custom strain name to unlock tailored AI advice.
                                        </p>
                                        <button 
                                            onClick={dismissTooltip}
                                            className="text-[10px] font-black uppercase tracking-wider bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Got it
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Strain Info Card (if details available) */}
      {plant.strainDetails && (
         <div className="px-6 mb-6 animate-in slide-in-from-top-4">
             <StrainCard strain={plant.strainDetails} />
         </div>
      )}

      {/* 3. Empty State CTA (If no strain selected) */}
      {!plant.strain && (
          <div className="px-6 mb-6">
              <div 
                onClick={() => setShowStrainSearch(true)}
                className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                  <div className="bg-orange-100 p-2 rounded-full text-orange-500">
                      <ScanLine size={18} />
                  </div>
                  <div className="flex-1">
                      <p className="text-xs font-bold text-orange-800">No strain selected</p>
                      <p className="text-[10px] text-orange-600 font-medium">Tap to add strain info for better AI tips.</p>
                  </div>
                  <ChevronRight size={16} className="text-orange-300" />
              </div>
          </div>
      )}

      {/* 4. The Feed (Timeline) */}
      <div className="px-6">
         {feedItems.length > 0 ? (
            <div className="mt-2">
               {feedItems.map((entry, index) => renderTimelineItem(entry, index))}
               
               <div className="pl-8 pt-4 pb-8">
                   <div className="text-center p-4">
                       <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mb-2">
                          <Leaf size={14} />
                       </div>
                       <p className="text-xs text-gray-400 font-medium">Plant Sprouted • {plant.totalDays} days ago</p>
                   </div>
               </div>
            </div>
         ) : (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="mb-4">
                    <Growbot size="xl" mood="neutral" />
                 </div>
                 <p className="text-sm font-bold text-gray-400">Your journal is empty.</p>
                 <p className="text-xs text-gray-300 mt-1 mb-6">Start logging your journey today.</p>
                 <button 
                    onClick={() => setShowCreator(true)}
                    className="px-6 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-primary shadow-sm"
                 >
                    Create First Entry
                 </button>
             </div>
         )}
      </div>

      {/* 5. Floating Action Button for New Note with Label */}
      <div className="fixed bottom-24 right-6 flex flex-col items-center gap-2 z-40">
          <span className="text-[10px] font-bold text-text-sub uppercase tracking-wider bg-white/80 backdrop-blur px-2 py-1 rounded-md shadow-sm border border-gray-100">New Note</span>
          <button
            onClick={() => setShowCreator(true)}
            className="w-14 h-14 bg-text-main text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-800"
          >
            <Plus size={28} />
          </button>
      </div>

      {/* Note Creator Modal */}
      {showCreator && (
        <NoteCreator 
            onSave={handleSaveWrapper} 
            onClose={() => setShowCreator(false)} 
        />
      )}

      {/* Optimized Responsive Strain Search Modal */}
      {showStrainSearch && (
        <div className="fixed inset-0 z-50 bg-surface/98 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
            {/* Modal Header - Fixed */}
            <div className="px-4 pt-12 pb-4 bg-white/50 backdrop-blur-sm border-b border-gray-100 flex-shrink-0">
                <div className="max-w-screen-xl mx-auto flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-text-main tracking-tight">Select Genetics</h2>
                    <button 
                        onClick={() => setShowStrainSearch(false)} 
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-text-main transition-colors shadow-sm"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Search Bar Container - Fixed inside Header */}
                <div className="max-w-screen-xl mx-auto">
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-card border border-gray-100 flex items-center gap-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <Search size={20} className="text-gray-400 flex-shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search strains or type custom..."
                            className="flex-1 bg-transparent outline-none text-text-main font-bold text-sm sm:text-base placeholder-gray-300 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Results Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-surface/50">
                <div className="max-w-screen-xl mx-auto p-4 sm:p-6 pb-24">
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 w-full">
                        {/* Custom Strain Option - High Emphasis */}
                        {searchQuery.trim().length > 0 && (
                            <button 
                                onClick={handleCreateCustomStrain}
                                className="w-full bg-primary/5 border border-primary/20 p-4 sm:p-6 rounded-[2rem] flex items-center gap-4 text-left hover:bg-primary/10 transition-all group shadow-sm active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center text-primary shadow-soft group-hover:scale-110 transition-transform flex-shrink-0">
                                    <Plus size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block text-sm sm:text-base font-black text-primary uppercase tracking-wide">Add Custom Strain</span>
                                    <span className="block text-xs sm:text-sm text-text-sub font-medium truncate">"{searchQuery}"</span>
                                </div>
                                <ChevronRight size={20} className="text-primary/40 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        {/* Results Heading */}
                        {filteredStrains.length > 0 && (
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] sm:text-xs font-black text-text-sub uppercase tracking-[0.2em] ml-2">
                                    Database Matches ({filteredStrains.length})
                                </span>
                            </div>
                        )}

                        {/* Filtered Database Results */}
                        <div className="space-y-4">
                            {filteredStrains.map((strain) => (
                                <div 
                                    key={strain.name} 
                                    onClick={() => handleSelectStrain(strain)}
                                    className="cursor-pointer active:scale-[0.99] transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-2xl"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSelectStrain(strain)}
                                >
                                    <StrainCard strain={strain} />
                                </div>
                            ))}
                        </div>
                        
                        {/* No Results Fallback */}
                        {filteredStrains.length === 0 && searchQuery.trim() === '' && (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                    <Search size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-text-main mb-1">Search Strains</h3>
                                <p className="text-sm text-text-sub max-w-[240px]">
                                    Enter a name like "GG4" or "White Widow" to see expert grow data.
                                </p>
                            </div>
                        )}

                        {filteredStrains.length === 0 && searchQuery.trim() !== '' && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-sm font-medium text-text-sub">No exact database matches found.</p>
                                <p className="text-xs text-gray-400 mt-1">Try adding it as a custom strain above!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modal Bottom Blur Overlay (Native-like feel) */}
            <div className="h-12 bg-gradient-to-t from-surface to-transparent fixed bottom-0 left-0 right-0 pointer-events-none z-10"></div>
        </div>
      )}

    </div>
  );
};

export default Journal;