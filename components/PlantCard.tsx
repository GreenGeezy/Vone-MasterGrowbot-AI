import React from 'react';
import { Plant } from '../types';
import { ChevronRight, Zap, Droplets } from 'lucide-react';

const PlantCard: React.FC<{ plant: Plant; onClick: () => void }> = ({ plant, onClick }) => {
  return (
    <div onClick={onClick} className="group relative w-full bg-white rounded-3xl p-3 cursor-pointer border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 relative">
            <img src={plant.imageUri} className="w-full h-full object-cover" />
            {plant.activeAlerts?.includes('thirsty') && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="bg-blue-500 p-1 rounded-full text-white"><Droplets size={12} /></div></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-text-main text-base truncate">{plant.name}</h3>
            {plant.strainDetails && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700">{plant.strainDetails.type}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-sub font-medium">
             <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px]">{plant.stage}</span>
             {plant.strainDetails?.thc_level && <span className="flex items-center gap-1 text-[10px] text-text-sub font-bold"><Zap size={10} className="text-primary" /> {plant.strainDetails.thc_level}</span>}
          </div>
        </div>
        <div className="pr-2 text-gray-300 group-hover:text-primary transition-colors"><ChevronRight size={20} /></div>
      </div>
    </div>
  );
};
export default PlantCard;
