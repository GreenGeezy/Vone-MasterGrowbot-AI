import React from 'react';
import { Plant } from '../types';
import { ChevronRight, Clock, Droplets, Bug, AlertTriangle, Thermometer, Zap } from 'lucide-react';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void; // Changed 'onPress' to 'onClick' for React standard
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  return (
    <div 
      onClick={onClick} 
      className="group relative w-full bg-white rounded-3xl p-3 cursor-pointer border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.99]"
    >
      <div className="flex gap-4 items-center">
        {/* Plant Image */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
            {plant.imageUri ? (
                <img 
                src={plant.imageUri} 
                alt={plant.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Droplets size={24} />
                </div>
            )}
            
            {/* Status Indicator Overlay */}
            {plant.activeAlerts && plant.activeAlerts.length > 0 && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    {plant.activeAlerts.includes('thirsty') && <div className="bg-blue-500 p-1 rounded-full text-white"><Droplets size={12} className="fill-current" /></div>}
                    {plant.activeAlerts.includes('pest') && <div className="bg-red-500 p-1 rounded-full text-white"><Bug size={12} className="fill-current" /></div>}
                </div>
            )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-text-main text-base truncate">{plant.name}</h3>
            {/* Strain Info Pill */}
            {plant.strainDetails ? (
                 <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                     plant.strainDetails.type === 'Sativa' ? 'bg-yellow-100 text-yellow-700' :
                     plant.strainDetails.type === 'Indica' ? 'bg-purple-100 text-purple-700' :
                     'bg-green-100 text-green-700'
                 }`}>
                     {plant.strainDetails.type}
                 </span>
            ) : (
                plant.healthScore < 80 && !plant.activeAlerts?.length && (
                    <span className="w-2 h-2 rounded-full bg-alert-red animate-pulse"></span>
                )
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-text-sub font-medium">
             <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px]">
                {plant.stage}
             </span>
             {plant.strainDetails?.thc_level ? (
                 <span className="flex items-center gap-1 text-[10px] text-text-sub font-bold">
                     <Zap size={10} className="text-primary" /> {plant.strainDetails.thc_level}
                 </span>
             ) : (
                 <span className="flex items-center gap-1">
                    <Clock size={12} /> {Math.max(0, 90 - (plant.totalDays || 0))} days left
                 </span>
             )}
          </div>

           {/* Minimalist Alerts Row */}
           {plant.activeAlerts && plant.activeAlerts.length > 0 && (
                 <div className="flex gap-1 mt-1.5">
                    {plant.activeAlerts.includes('thirsty') && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md">Thirsty</span>}
                    {plant.activeAlerts.includes('pest') && <span className="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md">Pest Risk</span>}
                 </div>
            )}
        </div>
        
        {/* Subtle Action Icon */}
        <div className="pr-2 text-gray-300 group-hover:text-primary transition-colors">
            <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
};

export default PlantCard;
