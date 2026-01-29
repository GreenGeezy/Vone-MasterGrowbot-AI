import React from 'react';
import { UserProfile } from '../types';
import { User, LogOut, Shield, Settings, ChevronRight } from 'lucide-react';

interface ProfileProps {
    userProfile: UserProfile | null;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
    onSignOut: () => void;
}

const Profile: React.FC<ProfileProps> = ({ userProfile, onUpdateProfile, onSignOut }) => {
    if (!userProfile) return null;

    const experiences: UserProfile['experience'][] = ['Novice', 'Intermediate', 'Expert'];
    const growModes: UserProfile['grow_mode'][] = ['Indoor', 'Outdoor', 'Greenhouse'];

    return (
        <div className="bg-gray-50 h-full overflow-y-auto pb-24 font-sans">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm mb-6 text-center">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                    <User size={40} className="text-green-600" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">My Grow Profile</h1>
                <div className="inline-flex items-center gap-1.5 bg-green-100 px-3 py-1 rounded-full">
                    <Shield size={12} className="text-green-700" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Pro Member</span>
                </div>
            </div>

            {/* Settings */}
            <div className="px-6 space-y-6">

                {/* Global Defaults Section */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings size={18} className="text-gray-400" />
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Global Defaults</h2>
                    </div>

                    <div className="space-y-5">
                        {/* Experience Level */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Skill Level</label>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-xl">
                                {experiences.map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => onUpdateProfile({ experience: level })}
                                        className={`py-3 rounded-lg text-[10px] font-black uppercase transition-all ${userProfile.experience === level ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Default Environment */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Default Environment</label>
                            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-xl">
                                {growModes.map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => onUpdateProfile({ grow_mode: mode })}
                                        className={`py-3 rounded-lg text-[10px] font-black uppercase transition-all ${userProfile.grow_mode === mode ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Actions */}
                <div className="space-y-3">
                    <button onClick={onSignOut} className="w-full py-4 bg-white text-gray-900 font-bold rounded-2xl flex items-center justify-center gap-2 border border-gray-200 active:scale-95 transition-transform">
                        <LogOut size={18} /> Sign Out
                    </button>
                    <button className="w-full py-4 text-red-400 font-bold text-xs uppercase tracking-widest hover:text-red-500">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
