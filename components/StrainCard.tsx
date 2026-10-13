import React from 'react';
import { Strain } from '../types';
import StrainReferenceDetails from './StrainReferenceDetails';

const StrainCard: React.FC<{ strain: Strain; compact?: boolean; onClick?: () => void }> = ({ strain, compact, onClick }) => {
   if (compact) {
      return (
         <button type="button" onClick={onClick} className="w-full bg-white border border-primary/10 rounded-lg p-3 shadow-sm text-left grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 active:scale-[0.99] transition-transform">
            <div className="min-w-0">
               <span className="text-[9px] font-black uppercase text-primary tracking-[0.15em] block mb-0.5">{strain.type}</span>
               <h4 className="text-sm font-extrabold text-text-main leading-tight break-words">{strain.name}</h4>
            </div>
            <div className="text-right text-xs text-text-sub">View details</div>
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
         <StrainReferenceDetails profile={strain} />
      </article>
   );
};
export default StrainCard;
