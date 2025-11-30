
import React, { useState } from 'react';
import { Award, Home, Zap, Ruler } from 'lucide-react';
import { UserProfile } from '../types';
import WelcomeCarousel from '../components/WelcomeCarousel';

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
    <div className="h-screen bg-surface overflow-hidden flex flex-col font-sans">
      
      {/* Progress Bar */}
      <div className="pt-12 px-8 pb-4 z-30">
        <div className="flex justify-between items-center mb-3">
           <span className="text-xs font-bold text-text-sub uppercase tracking-widest">
            Step {currentStepIndex + 1} of {STEPS.length}
           </span>
           <span className="text-xs font-bold text-primary">{currentStep.title}</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Animated Card Container */}
        <div className="w-full max-w-sm animate-in zoom-in-95 duration-500">
           
           <div className="flex justify-center mb-8">
               <div className="relative">
                   <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                   <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                       <StepIcon size={32} className="text-primary" />
                   </div>
               </div>
           </div>

           <h1 className="text-2xl font-extrabold text-center text-text-main mb-3 leading-tight">
             {currentStep.question}
           </h1>
           <p className="text-center text-text-sub text-xs font-medium mb-8">
             I'll use this to calibrate your AI assistant.
           </p>

           <div className="space-y-3">
             {currentStep.options.map((option) => (
               <button
                 key={option.value}
                 onClick={() => handleSelect(currentStep.id, option.value)}
                 className="w-full group bg-white hover:bg-primary/5 border border-gray-100 hover:border-primary/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
               >
                 <div className="text-left">
                    <span className="block text-base font-bold text-text-main group-hover:text-primary transition-colors">
                      {option.label}
                    </span>
                    <span className="block text-xs text-text-sub mt-0.5 font-medium">
                      {option.desc}
                    </span>
                 </div>
                 <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-primary flex items-center justify-center transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
               </button>
             ))}
           </div>

        </div>
      </div>

    </div>
  );
};

export default Onboarding;