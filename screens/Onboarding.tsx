import React, { useState } from 'react';
import { Award, Home, Zap, Ruler, Sparkles, Leaf } from 'lucide-react';
import { UserProfile } from '../types';
import WelcomeCarousel from '../components/WelcomeCarousel';
import Growbot from '../components/Growbot';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const STEPS = [
  {
    id: 'experience',
    title: "Experience Level",
    question: "How would you describe your growing experience?",
    icon: Award,
    options: [
      { value: 'Novice', label: 'First Time Grower', desc: 'I need step-by-step guidance.' },
      { value: 'Intermediate', label: 'Casual Grower', desc: 'I know the basics, looking to improve.' },
      { value: 'Expert', label: 'Master Grower', desc: 'I want data and advanced optimization.' }
    ]
  },
  {
    id: 'grow_mode',
    title: "Environment",
    question: "Where are you planting your garden?",
    icon: Home,
    options: [
      { value: 'Indoor', label: 'Indoor', desc: 'Tent, closet, or grow room.' },
      { value: 'Outdoor', label: 'Outdoor', desc: 'Backyard, garden, or balcony.' },
      { value: 'Greenhouse', label: 'Greenhouse', desc: 'Controlled sunlight & climate.' }
    ]
  },
  {
    id: 'goal',
    title: "Primary Goal",
    question: "What is your main objective for this harvest?",
    icon: Zap,
    options: [
      { value: 'Maximize Yield', label: 'Maximize Yield', desc: 'I want the biggest harvest possible.' },
      { value: 'Improve Quality', label: 'Improve Quality', desc: 'I want top-shelf potency and flavor.' },
      { value: 'Learn Skills', label: 'Learn Skills', desc: 'I want to master the art of growing.' }
    ]
  },
  {
    id: 'space',
    title: "Grow Space",
    question: "What is the scale of your operation?",
    icon: Ruler,
    options: [
      { value: 'Small', label: 'Small', desc: '1-4 Plants (Personal/Hobbyist)' },
      { value: 'Medium', label: 'Medium', desc: '5-50 Plants (Craft Grower)' },
      { value: 'Large', label: 'Large', desc: '50-500 Plants (Commercial Cultivation)' }
    ]
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  const handleSelect = (stepId: string, value: string) => {
    const updatedProfile = { ...profile, [stepId]: value };
    setProfile(updatedProfile);

    // Auto-advance delay
    setTimeout(() => {
      if (currentStepIndex < STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        onComplete(updatedProfile as UserProfile);
      }
    }, 400);
  };

  const currentStep = STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  if (showIntro) {
    return <WelcomeCarousel onStart={() => setShowIntro(false)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden relative font-sans">
      
      {/* B. FAINT BACKGROUND ILLUSTRATION */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Leaf size={500} strokeWidth={0.5} className="absolute -right-40 top-[15%] text-primary opacity-[0.03] rotate-12" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-neon-blue/5 rounded-full blur-[120px]" />
          <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* C. MASTERGROWBOT AVATAR IN CORNER */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
           <div className="relative animate-in slide-in-from-bottom-20 duration-1000">
              <div className="absolute -top-10 -left-10 bg-white px-3 py-1.5 rounded-2xl rounded-br-none shadow-sm border border-gray-100 animate-bounce duration-[2000ms]">
                  <span className="text-[10px] font-black text-primary uppercase tracking-wide">I'm Learning About You</span>
              </div>
              <Growbot size="lg" mood="happy" />
           </div>
      </div>

      {/* PAGINATION HEADER - NUMBERED STEPS */}
      <div className="pt-10 px-4 pb-4 w-full z-30 bg-transparent relative flex-shrink-0">
        <div className="flex justify-center items-center gap-6">
           {STEPS.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              const stepNum = idx + 1;
              
              return (
                <div key={step.id} className="relative">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 ${
                      isActive 
                        ? 'bg-primary border-primary text-white scale-110 shadow-lg' 
                        : isPast 
                          ? 'bg-primary/20 border-primary/20 text-primary' 
                          : 'bg-transparent border-gray-200 text-gray-300'
                   }`}>
                      {stepNum}
                   </div>
                </div>
              );
           })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-y-auto z-10 w-full">
        
        {/* A. BADGE ABOVE QUIZ */}
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700 delay-150">
             <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-primary/10 shadow-sm">
                <Sparkles size={14} className="text-primary fill-primary/20" />
                <span className="text-xs font-bold text-text-sub tracking-wide">
                    This helps personalize your AI Grow Coach
                </span>
             </div>
        </div>

        {/* Animated Card Container */}
        <div 
          key={currentStep.id}
          className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-500"
        >
           {/* STYLED CONTAINER WRAPPER */}
           <div className="bg-gradient-to-br from-[#F4FFFB] to-[#E9FFF4] p-4 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-white/60 backdrop-blur-sm">
               <div className="flex justify-center mb-6 mt-4">
                   <div className="relative group">
                       <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                       <div className="relative bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 transition-transform duration-500 hover:scale-105 animate-in fade-in zoom-in-75 duration-700">
                           <StepIcon size={94} color="#059669" className="animate-pulse" />
                       </div>
                   </div>
               </div>

               <h2 className="text-2xl font-extrabold text-center text-text-main mb-3 leading-tight px-2">
                 {currentStep.question}
               </h2>
               
               <p className="text-center text-text-sub text-sm font-medium mb-10 opacity-90 leading-relaxed">
                 I'll use this to calibrate your AI assistant.
               </p>

               <div className="flex flex-col gap-3">
                 {currentStep.options.map((option) => (
                   <button
                     key={option.value}
                     onClick={() => handleSelect(currentStep.id, option.value)}
                     className="w-full bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform hover:border-primary/30 group animate-in slide-in-from-bottom-2 duration-500 fade-in"
                   >
                     <div className="flex-1 mr-4 text-left">
                        <span className="block text-base font-bold text-text-main mb-1 group-hover:text-primary transition-colors">
                          {option.label}
                        </span>
                        <span className="block text-xs text-text-sub font-medium">
                          {option.desc}
                        </span>
                     </div>
                     <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex justify-center items-center group-hover:border-primary/50">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                   </button>
                 ))}
               </div>
           </div>

        </div>
      </div>

    </div>
  );
};

export default Onboarding;