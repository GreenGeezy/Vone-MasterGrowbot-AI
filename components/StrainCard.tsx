import React from 'react';
import { Strain } from '../types';
import { Leaf, Zap } from 'lucide-react';
import { formatStrainValue } from '../utils/strainSearch';

const StrainCard: React.FC<{ strain: Strain; compact?: boolean; onClick?: () => void }> = ({ strain, compact, onClick }) => {
   if (compact) {
      return (
         <button type="button" onClick={onClick} className="w-full bg-white border border-primary/10 rounded-lg p-3 shadow-sm text-left grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 active:scale-[0.99] transition-transform">
            <div className="min-w-0">
               <span className="text-[9px] font-black uppercase text-primary tracking-[0.15em] block mb-0.5">{strain.type}</span>
               <h4 className="text-sm font-extrabold text-text-main leading-tight break-words">{strain.name}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right shrink-0">
               <div><span className="block text-[9px] font-bold uppercase text-gray-400">Est. THC</span><span className="text-xs font-black text-text-main">{formatStrainValue(strain.thc_level)}</span></div>
               <div><span className="block text-[9px] font-bold uppercase text-gray-400">Est. CBD</span><span className="text-xs font-black text-text-main">{formatStrainValue(strain.cbd_level)}</span></div>
            </div>
         </button>
      );
   }
   return (
      <article onClick={onClick} className="bg-white border border-gray-100 rounded-lg p-5 shadow-soft overflow-hidden">
         <div className="flex justify-between items-start gap-4 mb-4">
            <div className="min-w-0">
               <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-green-100 text-green-700">{strain.type}</span>
               <h3 className="text-xl font-black text-text-main mt-1 leading-tight break-words">{strain.name}</h3>
            </div>
         </div>
         <div className="grid grid-cols-2 border-y border-gray-100 py-3 mb-4">
            <div className="pr-3 border-r border-gray-100"><span className="block text-[9px] font-bold uppercase text-gray-400">Estimated THC</span><span className="flex items-center gap-1 text-base font-black text-text-main"><Zap size={13} className="text-green-600" />{formatStrainValue(strain.thc_level)}</span></div>
            <div className="pl-3"><span className="block text-[9px] font-bold uppercase text-gray-400">Estimated CBD</span><span className="text-base font-black text-text-main">{formatStrainValue(strain.cbd_level)}</span></div>
         </div>
         <div className="flex items-start gap-2 mb-4"><Leaf size={15} className="text-orange-500 mt-0.5 shrink-0" /><div><span className="block text-[9px] font-bold uppercase text-gray-400">Primary Terpene</span><span className="text-xs font-bold text-text-main break-words">{formatStrainValue(strain.most_common_terpene)}</span></div></div>
         <h4 className="text-xs font-black text-text-main mb-1">About This Strain</h4>
         <p className="text-xs text-text-sub leading-relaxed font-medium whitespace-pre-wrap break-words">{formatStrainValue(strain.description)}</p>
      </article>
   );
};
export default StrainCard;
