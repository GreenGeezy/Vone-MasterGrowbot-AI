import React, { useState, useEffect } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';
import { Strain } from '../types';
import { getStrainInsights } from '../services/geminiService';
import StrainReferenceDetails from './StrainReferenceDetails';
import sproutIcon from '../src/assets/images/sprout-icon.png';
import purpleGrowRoom from '../src/assets/images/purple-grow-room.jpg';

export const StrainDetailModal = ({ strain, onClose, onAdd }: { strain: Strain, onClose: () => void, onAdd: (s: Strain) => void }) => {
        const [imgSrc, setImgSrc] = useState(strain.imageUri || sproutIcon);
        const [localAiInsight, setLocalAiInsight] = useState<string | null>(null);
        const [localIsLoading, setLocalIsLoading] = useState(false);

        // Reset image when strain changes (though component usually remounts if key changes)
        useEffect(() => {
            setImgSrc(strain.imageUri || sproutIcon);
            setLocalAiInsight(null);
        }, [strain]);

        const handleAi = async () => {
            setLocalIsLoading(true);
            const result = await getStrainInsights(strain.name, strain.description);
            setLocalAiInsight(result);
            setLocalIsLoading(false);
        };

        return (
            <div className="fixed inset-0 z-[70] bg-white overflow-y-auto overscroll-contain animate-in slide-in-from-right pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                <div className="relative h-64">
                    <img
                        src={purpleGrowRoom}
                        className="w-full h-full object-cover"
                        alt="Hero"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <button aria-label="Back to strain library" onClick={onClose} className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-5 p-2 bg-black/50 rounded-full text-white"><X size={20} /></button>
                    <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-6 left-5 right-5 text-white">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{strain.type}</span>
                        <h1 className="text-3xl font-black mt-2 leading-tight break-words">{strain.name}</h1>
                    </div>
                </div>

                <div className="p-5 max-w-2xl mx-auto">
                    <div className="mb-8"><StrainReferenceDetails profile={strain} /></div>

                    {/* AI INSIGHTS SECTION */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles size={18} className="text-purple-500" /> AI Strain Intelligence
                            </h3>
                        </div>

                        {!localAiInsight ? (
                            <button
                                onClick={handleAi}
                                disabled={localIsLoading}
                                className="w-full py-4 bg-purple-50 text-purple-700 rounded-xl font-bold border border-purple-100 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                            >
                                {localIsLoading ? (
                                    <span className="animate-pulse">Analyzing Genetics...</span>
                                ) : (
                                    <>Generate Grow Tips</>
                                )}
                            </button>
                        ) : (
                            <div className={`p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap border shadow-sm animate-in fade-in ${localAiInsight?.startsWith('Error:') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                                {localAiInsight?.startsWith('Error:') ? (
                                    <>
                                        <div className="font-bold mb-1 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Connection Failed</div>
                                        {localAiInsight.replace('Error:', '')}
                                    </>
                                ) : (
                                    localAiInsight
                                )}
                            </div>
                        )}
                    </div>
                    {/* ADD TO GARDEN */}
                    <button
                        onClick={() => {
                            onAdd(strain);
                            onClose();
                        }}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <Plus size={24} /> Add to Garden
                    </button>
                </div>
            </div>
        );
    };

