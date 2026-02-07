import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
    User, LogOut, Shield, Settings, ChevronRight, Camera,
    MessageSquare, FileText, Trash2, Mail, X, Check, Star, Edit2, Flame, Image as ImageIcon, Smile, ScanLine
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface ProfileProps {
    userProfile: UserProfile | null;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
    onSignOut: () => void;
    onViewTutorial?: () => void;
}

// "Cool" Animated/Styled Grower Avatars (Local Assets)
const COOL_AVATARS = [
    '/assets/avatars/the_alchemist.png',  // The Alchemist
    '/assets/avatars/the_bot.png',        // The Bot
    '/assets/avatars/neon_leaf.png',      // Neon Leaf
    '/assets/avatars/grow_tent_king.png', // Grow Tent King
    '/assets/avatars/macro_trichome.png', // Macro Trichome
    '/assets/avatars/hydro_bucket.png'    // Hydro Bucket
];

const Profile: React.FC<ProfileProps> = ({ userProfile, onUpdateProfile, onSignOut, onViewTutorial }) => {
    // Local state for modals
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false); // Modal 1: Selection Menu
    const [showPresetGrid, setShowPresetGrid] = useState(false); // Modal 2: Preset Grid

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    // --- AUTO-SYNC EMAIL ---
    React.useEffect(() => {
        const syncEmail = async () => {
            const { supabase } = await import('../services/supabaseClient');
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email && user.email !== userProfile?.email) {
                console.log("Syncing Profile Email:", user.email);
                onUpdateProfile({ email: user.email });
            }
        };
        syncEmail();
    }, []); // Run once on mount

    // Support Form State
    const [supportForm, setSupportForm] = useState({ name: '', email: '', issue: '', message: '' });

    if (!userProfile) return null;

    // --- Actions ---

    const handleCameraAction = async (source: CameraSource) => {
        try {
            const image = await CapacitorCamera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Uri,
                source: source
            });

            if (image.webPath) {
                onUpdateProfile({ avatarUri: image.webPath });
                setShowAvatarMenu(false);
            }
        } catch (error) {
            console.error("Camera Error:", error);
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

    const handleDeleteAccount = async () => { // Async to handle submission
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone and all data will be removed within 24 hours.")) {

            // 1. Send actual deletion request to support system
            try {
                const subject = "ACCOUNT DELETION REQUEST";
                const body = `User: ${userProfile.email} (${userProfile.id})\nRequest Date: ${new Date().toISOString()}\n\nPlease delete all data associated with this user logic.`;

                // Use the existing email trigger logic (using mailto as fallback immediate action + db log)
                const mailtoLink = `mailto:Support@futuristiccannabis.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                // Ideally log to DB if possible, but Email is the required "initiation" step
                const { submitUserFeedback } = await import('../services/dbService');
                // We log it as feedback with a special flag/rating to ensure it's captured in DB
                await submitUserFeedback({ rating: 0, message: "ACCOUNT_DELETION_REQUEST" });

                // Open Mail Client to ensure user sends the verification email
                window.location.href = mailtoLink;

                alert("Deletion request generated. Please send the pre-filled email to confirm your identity. We will process this immediately.");
                onSignOut();
            } catch (e) {
                console.error("Deletion error:", e);
                // Fallback
                alert("Please email Support@futuristiccannabis.ai to complete your deletion request.");
                onSignOut();
            }
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
            <div className="pt-12 pb-8 px-6 text-center relative">

                {/* Streak Badge */}
                {userProfile.streak && userProfile.streak > 0 && (
                    <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <div className="bg-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10 relative">
                                    <Flame size={24} fill="currentColor" className="animate-pulse" />
                                </div>
                                {(userProfile.streak % 7 === 0 || userProfile.streak === 30) && (
                                    <>
                                        <div className="absolute -top-10 -left-10 text-4xl animate-bounce delay-100">🎈</div>
                                        <div className="absolute -top-8 -right-8 text-4xl animate-bounce delay-300">🎈</div>
                                    </>
                                )}
                            </div>
                            <div className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full -mt-2 z-20 border border-white">
                                {userProfile.streak} Day Rating
                            </div>
                        </div>
                    </div>
                )}

                <div className="relative inline-block mb-4">
                    <button onClick={() => setShowAvatarMenu(true)} className="relative group">
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

                {/* Name Editing Section */}
                <div className="flex items-center justify-center gap-2 mb-1">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="text-xl font-black text-gray-900 bg-white border-b-2 border-green-500 outline-none text-center w-48"
                            />
                            <button onClick={() => {
                                onUpdateProfile({ name: tempName });
                                setIsEditingName(false);
                            }} className="p-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-full">
                                <Check size={16} />
                            </button>
                            <button onClick={() => setIsEditingName(false)} className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full">
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-gray-900">{userProfile.name || 'Master Grower'}</h1>
                            <button onClick={() => { setTempName(userProfile.name || ''); setIsEditingName(true); }} className="text-gray-300 hover:text-gray-600">
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

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
                    <Row icon={ScanLine} label="View Tutorial" onClick={() => onViewTutorial && onViewTutorial()} />
                    <Row icon={Star} label="Rate on App Store" onClick={() => openLink('https://play.google.com/store/apps/details?id=com.mastergrowbot.app')} />
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

            {/* AVATAR MENU MODAL */}
            {showAvatarMenu && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-5">
                        <h3 className="text-center text-lg font-black text-gray-900 mb-6">Update Profile Picture</h3>

                        <div className="space-y-3">
                            <button onClick={() => handleCameraAction(CameraSource.Camera)} className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center gap-3 transition-colors">
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Camera size={20} /></div>
                                <span className="font-bold text-gray-800">Take Photo</span>
                            </button>

                            <button onClick={() => handleCameraAction(CameraSource.Photos)} className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center gap-3 transition-colors">
                                <div className="bg-purple-100 text-purple-600 p-2 rounded-xl"><ImageIcon size={20} /></div>
                                <span className="font-bold text-gray-800">Upload Image</span>
                            </button>

                            <button onClick={() => { setShowAvatarMenu(false); setShowPresetGrid(true); }} className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center gap-3 transition-colors">
                                <div className="bg-green-100 text-green-600 p-2 rounded-xl"><Smile size={20} /></div>
                                <span className="font-bold text-gray-800">Select Growing Avatar</span>
                            </button>
                        </div>

                        <button onClick={() => setShowAvatarMenu(false)} className="w-full mt-6 py-3 font-bold text-gray-400 text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {/* PRESET GRID MODAL */}
            {showPresetGrid && (
                <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-900">Choose Avatar</h3>
                            <button onClick={() => setShowPresetGrid(false)} className="p-2 bg-gray-50 rounded-full"><X size={16} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-1">
                            {COOL_AVATARS.map((url, i) => {
                                const isSelected = userProfile.avatarUri === url;
                                return (
                                    <button key={i} onClick={() => {
                                        onUpdateProfile({ avatarUri: url });
                                        setShowPresetGrid(false);
                                    }} className={`aspect-square rounded-2xl overflow-hidden border-4 transition-all relative group ${isSelected ? 'border-green-500 shadow-lg scale-95' : 'border-transparent hover:border-green-200'}`}>
                                        <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Avatar ${i}`} onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')} />
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-md">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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
                            const ticketId = `MG-${Math.floor(1000 + Math.random() * 9000)}`;
                            const subject = `Support Ticket ${ticketId}: ${supportForm.issue}`;
                            const body = `Name: ${supportForm.name}\nEmail: ${supportForm.email}\n\nMessage:\n${supportForm.message}`;
                            const mailtoLink = `mailto:Agcomsol@gmail.com,Support@futuristiccannabis.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                            const { createSupportTicket } = await import('../services/dbService');
                            createSupportTicket(supportForm).catch(console.error);

                            window.location.href = mailtoLink;
                            alert(`Ticket #${ticketId} Created! 📨 Opening your email client...`);
                            setShowSupportModal(false);
                            setSupportForm({ name: '', email: '', issue: '', message: '' });
                        }} className="space-y-3">
                            <input required placeholder="Your Name" className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20" value={supportForm.name} onChange={e => setSupportForm({ ...supportForm, name: e.target.value })} />
                            <input required type="email" placeholder="Your Email" className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20" value={supportForm.email} onChange={e => setSupportForm({ ...supportForm, email: e.target.value })} />
                            <input required placeholder="Issue Title" className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20" value={supportForm.issue} onChange={e => setSupportForm({ ...supportForm, issue: e.target.value })} />
                            <textarea required placeholder="Describe your issue..." rows={4} className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20 resize-none" value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} />
                            <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-xl font-black shadow-lg shadow-green-200 active:scale-95 transition-transform">Send Ticket</button>
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
                            <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed px-4">"Thank You for Being Part of Our Elite MasterGrowbot AI Growers Community..."</p>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setSupportForm(prev => ({ ...prev, rating: star } as any))} className={`p-2 rounded-full transition-colors ${(supportForm as any).rating >= star ? 'text-yellow-400 bg-yellow-50' : 'text-gray-200'}`}>
                                        <Star size={24} fill={(supportForm as any).rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                            <textarea placeholder="Share your thoughts..." rows={4} className="w-full bg-gray-50 p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none" value={(supportForm as any).feedbackMessage || ''} onChange={e => setSupportForm(prev => ({ ...prev, feedbackMessage: e.target.value } as any))} />
                        </div>

                        <button onClick={async () => {
                            const rating = (supportForm as any).rating || 5;
                            const message = (supportForm as any).feedbackMessage || '';

                            // 1. Submit to Supabase
                            const { submitUserFeedback } = await import('../services/dbService');
                            await submitUserFeedback({ rating, message }).catch(console.error);

                            alert("Feedback Sent! Thank you for helping us grow. 🌱");

                            // 2. Neutral Prompt (Policy Compliant)
                            if (window.confirm("Thanks for your feedback! Would you like to leave a public review on the App Store?")) {
                                window.open("https://play.google.com/store/apps/details?id=com.mastergrowbot.app", "_blank");
                            }

                            setShowFeedbackModal(false);
                            setSupportForm({ name: '', email: '', issue: '', message: '' });
                        }} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black shadow-xl active:scale-95 transition-transform mb-3">Submit Feedback</button>

                        <button onClick={() => setShowFeedbackModal(false)} className="w-full py-4 text-gray-500 font-bold text-xs uppercase tracking-widest">Cancel</button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Profile;
