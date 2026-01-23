import React from 'react';
import { Strain } from '../types';
import { Dna, Zap, Wind } from 'lucide-react';

const StrainCard: React.FC<{ strain: Strain; compact?: boolean; onClick?: () => void }> = ({ strain, compact, onClick }) => {
  if (compact) {
    return (
       <div onClick={onClick} className="bg-white/80 backdrop-blur-sm border border-primary/10 rounded-xl p-3 shadow-sm flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
             <span className="text-[9px] font-black uppercase text-primary tracking-[0.15em] block mb-0.5">{strain.type}</span>
             <h4 className="text-sm font-extrabold text-text-main truncate">{strain.name}</h4>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-text-sub bg-gray-50 px-2 py-1 rounded-lg"><Zap size={10} className="text-primary" /> {strain.thc_level}</div>
       </div>
    );
  }
  return (
    <div onClick={onClick} className="bg-gradient-to-br from-white to-surface-highlight border border-white/50 rounded-[1.5rem] p-6 shadow-soft relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
         <div>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-green-100 text-green-700">{strain.type}</span>
            <h3 className="text-2xl font-black text-text-main">{strain.name}</h3>
         </div>
         <div className="text-right"><div className="flex items-center justify-end gap-1 text-primary font-black text-lg"><Zap size={14} /> {strain.thc_level}</div></div>
      </div>
      <p className="text-xs text-text-sub leading-relaxed font-medium mb-4">{strain.description}</p>
      <div className="flex items-center gap-3"><Wind size={16} className="text-orange-500" /><span className="text-xs font-bold text-text-main">{strain.most_common_terpene}</span></div>
    </div>
  );
};
export default StrainCard;
