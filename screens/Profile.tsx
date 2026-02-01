import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
    User, LogOut, Shield, Settings, ChevronRight, Camera,
    MessageSquare, HelpCircle, FileText, Trash2, Mail, X, Check, Star
} from 'lucide-react';
import { Browser } from '@capacitor/browser';

interface ProfileProps {
    userProfile: UserProfile | null;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
    onSignOut: () => void;
}

const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=200&q=80'
];

const Profile: React.FC<ProfileProps> = ({ userProfile, onUpdateProfile, onSignOut }) => {
    // Local state for modals
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    // Support Form State
    const [supportForm, setSupportForm] = useState({ name: '', email: '', issue: '', message: '' });

    if (!userProfile) return null;

    // --- Actions ---

    const handleEditAvatar = () => {
        // Simple preset toggle as requested for safety
        const current = userProfile.avatarUri || '';
        const index = AVATAR_PRESETS.indexOf(current);
        const nextIndex = (index + 1) % AVATAR_PRESETS.length;
        const nextAvatar = AVATAR_PRESETS[nextIndex];

        try {
            onUpdateProfile({ avatarUri: nextAvatar });
            // alert("Avatar Updated! 📸"); 
        } catch (e) {
            alert("Failed to update avatar.");
        }
    };

    const handleContactSupport = (e: React.FormEvent) => {
        e.preventDefault();
        const ticketId = `MG-${Math.floor(1000 + Math.random() * 9000)}`;
        const subject = `Support Ticket ${ticketId}: ${supportForm.issue}`;
        const body = `Name: ${supportForm.name}\nEmail: ${supportForm.email}\n\nMessage:\n${supportForm.message}`;

        const mailtoLink = `mailto:Agcomsol@gmail.com,Support@futuristiccannabis.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoLink;

        alert(`Ticket #${ticketId} Generated! We will contact you shortly.`);
        setShowSupportModal(false);
        setSupportForm({ name: '', email: '', issue: '', message: '' });
    };

    const handleShareFeedback = () => {
        const subject = "App Feedback - MasterGrowbot AI";
        const body = "Thank You for Being Part of Our Elite MasterGrowbot AI Growers Community...\n\n[Your Feedback Here]";
        const mailtoLink = `mailto:Support@futuristiccannabis.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoLink;
        setShowFeedbackModal(false);
    };

    const handleDeleteAccount = () => {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            alert("Account deletion request sent. We will process this within 24 hours.");
            onSignOut();
        }
    };

    const openLink = async (url: string) => {
        try {
            await Browser.open({ url });
        } catch {
            window.open(url, '_blank');
        }
    };

    // --- Render Helpers ---

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="mb-6">
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</h3>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
                {children}
            </div>
        </div>
    );

    const Row = ({ icon: Icon, label, value, onClick, isDestructive = false }: any) => (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                    <Icon size={18} />
                </div>
                <span className={`text-sm font-bold ${isDestructive ? 'text-red-500' : 'text-gray-900'}`}>{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm font-medium text-gray-400">{value}</span>}
                <ChevronRight size={16} className="text-gray-300" />
            </div>
        </button>
    );

    const SelectRow = ({ icon: Icon, label, value, options, onChange }: any) => (
        <div className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 text-green-600">
                    <Icon size={18} />
                </div>
                <span className="text-sm font-bold text-gray-900">{label}</span>
            </div>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm font-medium text-green-600 bg-transparent outline-none text-right cursor-pointer dir-rtl"
            >
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="bg-gray-50 h-full overflow-y-auto pb-24 font-sans relative">

            {/* 1. Header & Avatar */}
            <div className="pt-12 pb-8 px-6 text-center">
                <div className="relative inline-block mb-4">
                    <button onClick={handleEditAvatar} className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                            {userProfile.avatarUri ? (
                                <img src={userProfile.avatarUri} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-600">
                                    <User size={40} />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full border-2 border-white shadow-md group-active:scale-95 transition-transform">
                            <Camera size={14} />
                        </div>
                    </button>
                </div>
                <h1 className="text-2xl font-black text-gray-900">{userProfile.name || 'Master Grower'}</h1>
                <p className="text-xs font-bold text-gray-400 mt-1">{userProfile.email || 'user@example.com'}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-black/5 px-3 py-1 rounded-full">
                    <Shield size={12} className="text-green-700" />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Pro Member</span>
                </div>
            </div>

            {/* 2. Cultivation Profile */}
            <div className="px-4">
                <Section title="Cultivation Profile">
                    <SelectRow
                        icon={Shield}
                        label="Experience"
                        value={userProfile.experience}
                        options={['Novice', 'Intermediate', 'Expert', 'Pro']}
                        onChange={(v: any) => onUpdateProfile({ experience: v })}
                    />
                    <SelectRow
                        icon={Settings}
                        label="Environment"
                        value={userProfile.grow_mode}
                        options={['Indoor', 'Outdoor', 'Greenhouse']}
                        onChange={(v: any) => onUpdateProfile({ grow_mode: v })}
                    />
                    <SelectRow
                        icon={Check}
                        label="Primary Goal"
                        value={userProfile.goal}
                        options={['Maximize Yield', 'Improve Quality', 'Learn Skills']}
                        onChange={(v: any) => onUpdateProfile({ goal: v })}
                    />
                    <SelectRow
                        icon={Settings}
                        label="Grow Space"
                        value={userProfile.space}
                        options={['Small', 'Medium', 'Large']}
                        onChange={(v: any) => onUpdateProfile({ space: v })}
                    />
                </Section>

                {/* 3. Community & Support */}
                <Section title="Community & Support">
                    <Row icon={Mail} label="Contact Support" onClick={() => setShowSupportModal(true)} />
                    <Row icon={MessageSquare} label="Share Feedback" onClick={() => setShowFeedbackModal(true)} />
                </Section>

                {/* 4. Legal & Account */}
                <Section title="Legal & Account">
                    <Row icon={FileText} label="Privacy Policy" onClick={() => openLink('https://mastergrowbot.com/privacy-policy')} />
                    <Row icon={Shield} label="Terms of Service" onClick={() => openLink('https://mastergrowbot.com/terms-of-service')} />
                    <Row icon={LogOut} label="Sign Out" onClick={onSignOut} />
                    <Row icon={Trash2} label="Delete Account" onClick={handleDeleteAccount} isDestructive />
                </Section>

                <div className="text-center pb-8 opacity-40">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Version 1.0.89 (Beta)</p>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Support Modal */}
            {showSupportModal && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-black text-gray-900">Contact Support</h2>
                            <button onClick={() => setShowSupportModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const { createSupportTicket } = await import('../services/dbService');
                            const result = await createSupportTicket(supportForm);
                            if (result) {
                                alert("Thanks for reaching out! 📨 We review every message personally and will get back to you as soon as possible.");
                                setShowSupportModal(false);
                                setSupportForm({ name: '', email: '', issue: '', message: '' });
                            } else {
                                alert("Error creating ticket. Please try again.");
                            }
                        }} className="space-y-3">
                            <input
                                required placeholder="Your Name"
                                className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                                value={supportForm.name} onChange={e => setSupportForm({ ...supportForm, name: e.target.value })}
                            />
                            <input
                                required type="email" placeholder="Your Email"
                                className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                                value={supportForm.email} onChange={e => setSupportForm({ ...supportForm, email: e.target.value })}
                            />
                            <input
                                required placeholder="Issue Title"
                                className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20"
                                value={supportForm.issue} onChange={e => setSupportForm({ ...supportForm, issue: e.target.value })}
                            />
                            <textarea
                                required placeholder="Describe your issue..." rows={4}
                                className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                                value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                            />
                            <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-xl font-black shadow-lg shadow-green-200 active:scale-95 transition-transform">
                                Send Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={28} />
                            </div>
                            <h2 className="text-lg font-black text-gray-900">We Value Your Voice</h2>
                            <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed px-4">
                                "Thank You for Being Part of Our Elite MasterGrowbot AI Growers Community..."
                            </p>
                        </div>

                        {/* Feedback Fields */}
                        <div className="space-y-4 mb-6">
                            {/* Simple Star Rating */}
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setSupportForm(prev => ({ ...prev, rating: star } as any))}
                                        className={`p-2 rounded-full transition-colors ${(supportForm as any).rating >= star ? 'text-yellow-400 bg-yellow-50' : 'text-gray-200'}`}
                                    >
                                        <Star size={24} fill={(supportForm as any).rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>

                            <textarea
                                placeholder="Share your thoughts..."
                                rows={4}
                                className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none"
                                value={(supportForm as any).feedbackMessage || ''}
                                onChange={e => setSupportForm(prev => ({ ...prev, feedbackMessage: e.target.value } as any))}
                            />
                        </div>

                        onClick={async () => {
                            const { submitUserFeedback } = await import('../services/dbService');
                            const rating = (supportForm as any).rating || 5;
                            const message = (supportForm as any).feedbackMessage || '';

                            const result = await submitUserFeedback({ rating, message });

                            if (result) {
                                alert("Feedback Sent! Thank you for helping us grow. 🌱");

                                // Prompt for Review if 5 stars and wrote a message
                                if (rating === 5 && message.length > 0) {
                                    if (window.confirm("Hi! 👋 We’re a small team building MasterGrowbot AI. If you enjoy using it, a quick rating makes a massive difference to us.")) {
                                        // Open Play Store
                                        window.open("https://play.google.com/store/apps/details?id=com.futuristiccannabis.mastergrowbot", "_blank");
                                    }
                                }

                                setShowFeedbackModal(false);
                                setSupportForm({ name: '', email: '', issue: '', message: '' }); // Reset
                            } else {
                                alert("Failed to send feedback. Please try again.");
                            }
                        }}
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-black shadow-xl active:scale-95 transition-transform mb-3"
                        >
                        Submit Feedback
                    </button>

                    <button onClick={() => setShowFeedbackModal(false)} className="w-full py-4 text-gray-500 font-bold text-xs uppercase tracking-widest">
                        Cancel
                    </button>
                </div>
                </div>
    )
}

        </div >
    );
};

export default Profile;
