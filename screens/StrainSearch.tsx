import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Camera, Image as ImageIcon, Sparkles, Sprout, ChevronRight } from 'lucide-react';
import { STRAIN_DATABASE } from '../data/strains';
import { getCustomStrains, saveCustomStrain, uploadImage } from '../services/dbService';
import { getStrainInsights } from '../services/geminiService';
import { Strain } from '../types';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface StrainSearchProps {
    onAddPlant: (strain: Strain) => void; // Callback to add to Garden
}

const StrainSearch: React.FC<StrainSearchProps> = ({ onAddPlant }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'Custom'>('All');
    const [customStrains, setCustomStrains] = useState<Strain[]>([]);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedStrain, setSelectedStrain] = useState<Strain | null>(null);

    // New Strain Form
    const [newStrain, setNewStrain] = useState<Partial<Strain>>({ name: '', type: 'Hybrid', description: '' });
    const [newStrainImage, setNewStrainImage] = useState<string | null>(null); // Base64 or WebPath
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);

    useEffect(() => {
        loadCustomStrains();
    }, []);

    const loadCustomStrains = () => {
        setCustomStrains(getCustomStrains());
    };

    const filteredStrains = [
        ...(activeTab === 'All' ? STRAIN_DATABASE : []),
        ...customStrains
    ].filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // --- ACTIONS ---

    const handlePhoto = async (source: CameraSource) => {
        try {
            const image = await CapacitorCamera.getPhoto({
                quality: 80,
                resultType: CameraResultType.DataUrl, // Base64 for easy local storage
                source: source
            });
            if (image.dataUrl) setNewStrainImage(image.dataUrl);
        } catch (e) { console.log("Camera cancelled"); }
    };

    const handleSaveCustom = () => {
        if (!newStrain.name) return alert("Please enter a strain name.");

        const strainToSave = {
            ...newStrain,
            imageUri: newStrainImage, // Save the base64 string directly for offline support
            thc_level: 'Unknown',
            most_common_terpene: 'Unknown'
        };

        saveCustomStrain(strainToSave);
        loadCustomStrains();
        setShowAddModal(false);
        setNewStrain({ name: '', type: 'Hybrid', description: '' });
        setNewStrainImage(null);
    };

    const handleGetInsights = async () => {
        if (!selectedStrain) return;
        setIsAiLoading(true);
        setAiInsight(null);
        const result = await getStrainInsights(selectedStrain.name, selectedStrain.description);
        setAiInsight(result);
        setIsAiLoading(false);
    };

    // --- RENDER HELPERS ---

    // --- RENDER HELPERS ---

    // Curated high-quality cannabis/plant placeholders from Unsplash
    const PLACEHOLDER_IMAGES = [
        'https://images.unsplash.com/photo-1603909223429-69bb7aa8179b?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1615485925763-867c493ec73b?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1536768316335-976495f59051?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1588636906239-01c80f688029?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1595123550441-d377e017de6a?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1587328006240-629a738872e6?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1623951558913-68d1f2b694b8?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1613098731057-3f8d9560f73b?auto=format&fit=crop&q=80&w=800'
    ];

    const getStrainPlaceholder = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % PLACEHOLDER_IMAGES.length;
        return PLACEHOLDER_IMAGES[index];
    };

    const StrainCard = ({ strain, onClick }: { strain: Strain, onClick: () => void }) => {
        // Use deterministic placeholder based on name if no URI is present
        const [imgSrc, setImgSrc] = useState(strain.imageUri || getStrainPlaceholder(strain.name));

        return (
            <div onClick={onClick} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer">
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                    <img
                        src={imgSrc}
                        onError={() => setImgSrc(PLACEHOLDER_IMAGES[0])} // Fallback to first if deterministic fails
                        className="w-full h-full object-cover"
                        alt={strain.name}
                    />
                    {strain.userCreated && (
                        <div className="absolute top-0 right-0 bg-blue-500 w-3 h-3 rounded-bl-lg"></div>
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-gray-900 leading-tight">{strain.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase mt-0.5">{strain.type} • {strain.thc_level !== 'Unknown' ? strain.thc_level : 'Custom'}</p>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
            </div>
        );
    };

    const StrainDetailModal = ({ strain, onClose, onAdd }: { strain: Strain, onClose: () => void, onAdd: (s: Strain) => void }) => {
        const [imgSrc, setImgSrc] = useState(strain.imageUri || getStrainPlaceholder(strain.name));
        const [localAiInsight, setLocalAiInsight] = useState<string | null>(null);
        const [localIsLoading, setLocalIsLoading] = useState(false);

        // Reset image when strain changes (though component usually remounts if key changes)
        useEffect(() => {
            setImgSrc(strain.imageUri || getStrainPlaceholder(strain.name));
            setLocalAiInsight(null);
        }, [strain]);

        const handleAi = async () => {
            setLocalIsLoading(true);
            const result = await getStrainInsights(strain.name, strain.description);
            setLocalAiInsight(result);
            setLocalIsLoading(false);
        };

        return (
            <div className="fixed inset-0 z-[70] bg-white flex flex-col animate-in slide-in-from-right">
                <div className="relative h-72">
                    <img
                        src={imgSrc}
                        onError={() => setImgSrc(PLACEHOLDER_IMAGES[0])}
                        className="w-full h-full object-cover"
                        alt="Hero"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <button onClick={onClose} className="absolute top-12 right-6 p-2 bg-black/20 backdrop-blur-md rounded-full text-white"><X size={20} /></button>
                    <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{strain.type}</span>
                        <h1 className="text-4xl font-black mt-2 leading-none">{strain.name}</h1>
                    </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                            <div className="text-[10px] font-bold text-gray-400 uppercase">THC Content</div>
                            <div className="text-xl font-black text-gray-900 mt-1">{strain.thc_level || 'N/A'}</div>
                        </div>
                        <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Terpene</div>
                            <div className="text-xl font-black text-gray-900 mt-1 truncate">{strain.most_common_terpene || 'Mystery'}</div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            {strain.description || "No description provided for this strain."}
                        </p>
                    </div>

                    {/* AI INSIGHTS SECTION */}
                    <div className="mb-24">
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
                            <div className="bg-gray-50 p-5 rounded-2xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100 shadow-sm animate-in fade-in">
                                {localAiInsight}
                            </div>
                        )}
                    </div>
                </div>

                {/* ADD TO GARDEN FAB */}
                <div className="absolute bottom-8 right-6 left-6">
                    <button
                        onClick={() => {
                            onAdd(strain);
                            onClose();
                        }}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <Plus size={24} /> Add to Garden
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-surface min-h-screen pb-24 pt-12 px-6 flex flex-col font-sans">

            {/* 1. Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    What are you <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-700">growing?</span>
                </h1>
            </div>

            {/* 2. Search & Tabs */}
            <div className="flex gap-2 mb-6">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        placeholder="Search strains..."
                        className="w-full bg-white py-3 pl-12 pr-4 rounded-xl shadow-sm border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button onClick={() => setShowAddModal(true)} className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                    <Plus size={24} />
                </button>
            </div>

            {/* 3. List */}
            <div className="flex-1 space-y-3 overflow-y-auto -mx-6 px-6 pb-20">
                {customStrains.length > 0 && searchQuery === '' && (
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 mb-1">Your Genetics</h3>
                )}

                {filteredStrains.map((s, i) => (
                    <StrainCard key={s.id || i} strain={s} onClick={() => setSelectedStrain(s)} />
                ))}

                {filteredStrains.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <Sprout size={48} className="mx-auto mb-2 text-gray-300" />
                        <p className="font-bold text-gray-400">No strains found.</p>
                        <button onClick={() => setShowAddModal(true)} className="text-green-600 font-bold text-sm mt-2">Add Custom Strain</button>
                    </div>
                )}
            </div>

            {/* --- ADD MODAL --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">Add Genetics</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Image Upload */}
                            <div
                                onClick={() => handlePhoto(CameraSource.Prompt)}
                                className="w-full h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden"
                            >
                                {newStrainImage ? (
                                    <img src={newStrainImage} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <>
                                        <div className="bg-white p-3 rounded-full shadow-sm mb-2"><Camera size={24} className="text-gray-400" /></div>
                                        <span className="text-xs font-bold text-gray-400">Tap to add photo</span>
                                    </>
                                )}
                            </div>

                            <input
                                placeholder="Strain Name (e.g. Purple Haze)"
                                className="w-full bg-gray-50 p-4 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20"
                                value={newStrain.name}
                                onChange={e => setNewStrain({ ...newStrain, name: e.target.value })}
                            />

                            <div className="flex gap-2">
                                {['Indica', 'Sativa', 'Hybrid'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setNewStrain({ ...newStrain, type: type as any })}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-colors ${newStrain.type === type ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                placeholder="Notes / Description..."
                                rows={3}
                                className="w-full bg-gray-50 p-4 rounded-xl font-medium text-gray-600 outline-none resize-none text-sm"
                                value={newStrain.description}
                                onChange={e => setNewStrain({ ...newStrain, description: e.target.value })}
                            />

                            <button
                                onClick={handleSaveCustom}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-transform"
                            >
                                Save Strain
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DETAIL MODAL --- */}
            {/* --- DETAIL MODAL --- */}
            {selectedStrain && (
                <StrainDetailModal
                    strain={selectedStrain}
                    onClose={() => setSelectedStrain(null)}
                    onAdd={onAddPlant}
                />
            )}

        </div >
    );
};

export default StrainSearch;
