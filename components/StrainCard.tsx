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
       <div className="bg-white/80 backdrop-blur-sm border border-primary/10 rounded-xl p-3 shadow-sm flex items-center justify-between">
          <div>
             <span className="text-[10px] font-bold uppercase text-primary tracking-wider block mb-0.5">{strain.type}</span>
             <h4 className="text-sm font-bold text-text-main leading-none">{strain.name}</h4>
          </div>
          <div className="flex gap-2 text-[10px] font-medium text-text-sub">
             <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Zap size={10} /> {strain.thc_level} THC</span>
          </div>
       </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-surface-highlight border border-white/50 rounded-2xl p-4 shadow-soft relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4"></div>
      
      <div className="flex justify-between items-start mb-3 relative z-10">
         <div>
            <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    strain.type === 'Sativa' ? 'bg-yellow-100 text-yellow-700' :
                    strain.type === 'Indica' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                }`}>
                    {strain.type}
                </span>
            </div>
            <h3 className="text-lg font-extrabold text-text-main">{strain.name}</h3>
         </div>
         <div className="text-right">
             <div className="flex items-center gap-1 text-primary font-bold text-sm">
                <Zap size={14} className="fill-current" /> {strain.thc_level}
             </div>
             <span className="text-[10px] text-text-sub font-mono uppercase">Potency</span>
         </div>
      </div>

      <p className="text-xs text-text-sub leading-relaxed font-medium mb-3 border-b border-gray-100 pb-3">
        {strain.description}
      </p>

      <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
             <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg">
                <Wind size={14} />
             </div>
             <div>
                 <span className="block text-[10px] text-gray-400 font-bold uppercase">Terpene</span>
                 <span className="block text-xs font-bold text-text-main">{strain.most_common_terpene}</span>
             </div>
         </div>
         <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                <Dna size={14} />
             </div>
             <div>
                 <span className="block text-[10px] text-gray-400 font-bold uppercase">Lineage</span>
                 <span className="block text-xs font-bold text-text-main">Verified</span>
             </div>
         </div>
      </div>
    </div>
  );
};

export default StrainCard;