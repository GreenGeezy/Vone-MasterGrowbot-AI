import React from 'react';
import { Strain } from '../types';
import { Dna, Zap, Wind, Info } from 'lucide-react';

interface StrainCardProps {
  strain: Strain;
  compact?: boolean;
}

const StrainCard: React.FC<StrainCardProps> = ({ strain, compact = false }) => {
  if (compact) {
    return (
       <div className="bg-white/80 backdrop-blur-sm border border-primary/10 rounded-xl p-3 shadow-sm flex items-center justify-between transition-all hover:bg-white active:scale-95">
          <div className="min-w-0 flex-1 pr-4">
             <span className="text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-[0.15em] block mb-0.5 truncate">{strain.type}</span>
             <h4 className="text-sm sm:text-base font-extrabold text-text-main leading-tight truncate">{strain.name}</h4>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-text-sub whitespace-nowrap bg-gray-50/50 px-2 py-1 rounded-lg">
             <Zap size={10} className="text-primary fill-current" /> {strain.thc_level} THC
          </div>
       </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-surface-highlight border border-white/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-soft relative overflow-hidden group transition-all duration-300 hover:shadow-card hover:border-primary/10">
      {/* Decorative background element - adapts to corner */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10 gap-3">
         <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm ${
                    strain.type === 'Sativa' ? 'bg-yellow-100 text-yellow-700' :
                    strain.type === 'Indica' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                }`}>
                    {strain.type}
                </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-text-main tracking-tight leading-tight truncate">{strain.name}</h3>
         </div>
         <div className="text-right flex-shrink-0 bg-white/40 backdrop-blur-md p-2 rounded-xl border border-white/60 shadow-sm">
             <div className="flex items-center justify-end gap-1 text-primary font-black text-base sm:text-lg leading-none mb-0.5">
                <Zap size={14} className="fill-current" /> {strain.thc_level}
             </div>
             <span className="text-[9px] sm:text-[10px] text-text-sub font-black uppercase tracking-[0.1em] block">Potency</span>
         </div>
      </div>

      <p className="text-xs sm:text-sm text-text-sub leading-relaxed font-medium mb-4 border-b border-gray-100/50 pb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
        {strain.description}
      </p>

      <div className="grid grid-cols-2 gap-4">
         <div className="flex items-center gap-2.5 sm:gap-3">
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Wind size={16} />
             </div>
             <div className="min-w-0">
                 <span className="block text-[8px] sm:text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Terpene</span>
                 <span className="block text-xs sm:text-sm font-bold text-text-main truncate">{strain.most_common_terpene}</span>
             </div>
         </div>
         <div className="flex items-center gap-2.5 sm:gap-3">
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Dna size={16} />
             </div>
             <div className="min-w-0">
                 <span className="block text-[8px] sm:text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">Lineage</span>
                 <span className="block text-xs sm:text-sm font-bold text-text-main truncate">Verified</span>
             </div>
         </div>
      </div>
      
      {/* Premium subtle bottom indicator */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

export default StrainCard;