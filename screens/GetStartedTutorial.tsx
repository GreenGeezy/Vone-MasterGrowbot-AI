import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, ScanLine, MessageSquare, Database, ClipboardCheck } from 'lucide-react';

interface GetStartedTutorialProps {
    onComplete: () => void;
}

const GetStartedTutorial: React.FC<GetStartedTutorialProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            id: 'welcome',
            title: "You're In!",
            subtitle: "Welcome to the elite circle of Master Growers.",
            icon: <CheckCircle2 size={64} className="text-green-500" />,
            desc: "Your grow journey just got a massive upgrade. Let's make sure you hit the ground running.",
            action: "Let's Go",
            color: "bg-green-50"
        },
        {
            id: 'scan',
            title: "Diagnose Instantly",
            subtitle: "Spot pests & issues before they spread.",
            icon: <ScanLine size={64} className="text-blue-500" />,
            desc: "Use the camera to scan leaves. Our AI detects nutrient deficiencies and pests in seconds.",
            action: "Next",
            color: "bg-blue-50"
        },
        {
            id: 'chat',
            title: "Ask Anything",
            subtitle: "Your pocket cultivation expert.",
            icon: <MessageSquare size={64} className="text-purple-500" />,
            desc: "Upload logs, photos, or ask complex questions. The AI remembers your garden's context.",
            action: "Next",
            color: "bg-purple-50"
        },
        {
            id: 'strains',
            title: "Unlock Genetic Intelligence",
            subtitle: "100+ Strains at Your Fingertips",
            icon: <Database size={64} className="text-orange-500" />,
            desc: "Select your specific strain to calibrate the AI. Get advice tailored to your plant's unique DNA and traits.",
            action: "Next",
            color: "bg-orange-50"
        },
        {
            id: 'journal',
            title: "Your Grow Command Center",
            subtitle: "Track, Log, and Optimize",
            icon: <ClipboardCheck size={64} className="text-teal-500" />,
            desc: "Manage daily tasks and keep a visual journal. Our AI analyzes your logs to predict yields and catch issues early.",
            action: "Start Growing",
            color: "bg-teal-50"
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const current = steps[step];

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            {/* Skip Button */}
            <button
                onClick={onComplete}
                className="absolute top-12 right-6 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
                Skip
            </button>

            {/* Main Card */}
            <div className={`w-full max-w-sm rounded-[3rem] p-8 shadow-2xl transition-all duration-500 ${current.color} border border-white/50 relative overflow-hidden`}>
                {/* Background Blur Blob */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/40 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm animate-bounce-slow">
                        {current.icon}
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-gray-900 leading-tight">
                            {current.title}
                        </h2>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                            {current.subtitle}
                        </p>
                    </div>

                    <p className="text-gray-600 font-medium leading-relaxed">
                        {current.desc}
                    </p>
                </div>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-2 mt-8 mb-8">
                {steps.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === step ? 'w-8 bg-gray-900' : 'w-2 bg-gray-200'}`}
                    />
                ))}
            </div>

            {/* Action Button */}
            <button
                onClick={handleNext}
                className="w-full max-w-xs bg-gray-900 text-white font-black text-lg py-5 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
                {current.action} <ChevronRight strokeWidth={3} size={20} />
            </button>
        </div>
    );
};

export default GetStartedTutorial;
