import React, { useEffect, useState } from 'react';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { ChevronRight, CheckCircle } from 'lucide-react';

interface PersonalizedSolutionProps {
  painPoints: string[];
  goal: string;
  experienceLevel: string;
  onNext: () => void;
  onBack: () => void;
}

const PAIN_POINT_SOLUTIONS: Record<string, { icon: string; title: string; solution: string }> = {
  nutrient_deficiencies: {
    icon: '🍂',
    title: 'Nutrient Detective',
    solution: 'AI scans your plant photos and identifies deficiencies before they cause permanent damage.',
  },
  pests_disease: {
    icon: '🐛',
    title: 'Pest & Disease Shield',
    solution: 'Early detection alerts keep pests and disease from spreading through your grow.',
  },
  poor_yield: {
    icon: '📈',
    title: 'Yield Optimizer',
    solution: 'Personalized feeding schedules and training tips designed to help you get the most from every plant.',
  },
  overwatering: {
    icon: '💧',
    title: 'Watering Coach',
    solution: 'Smart reminders calibrated to your plant size, soil type, and growth stage.',
  },
  light_problems: {
    icon: '☀️',
    title: 'Light Management',
    solution: 'Optimal light schedules and DLI targets for every stage of your grow.',
  },
  training: {
    icon: '✂️',
    title: 'Training Guides',
    solution: 'Step-by-step LST, topping, and SCRoG tutorials with visual guides for your setup.',
  },
};

const GOAL_MESSAGES: Record<string, string> = {
  max_yield: "We'll focus on maximizing every gram with expert training and feeding protocols.",
  top_quality: "We'll dial in your environment and finishing techniques for top-shelf results.",
  learn_skills: "We'll explain the why behind every recommendation so you grow as a grower.",
  low_maintenance: "We'll simplify your grows with automation-friendly schedules and easy routines.",
  stealth: "We'll keep your setup compact, odor-controlled, and off the radar.",
};

const EXP_MESSAGES: Record<string, string> = {
  first_grow: "First-timer? We've got you covered with beginner-friendly step-by-step guidance.",
  beginner: "Building on your early experience with targeted tips to level up fast.",
  intermediate: "Filling the gaps in your technique to push you from good to great.",
  advanced: "Fine-tuning the details that separate good grows from exceptional ones.",
  expert: "Data-driven insights to optimize your existing processes and consistency.",
};

const PersonalizedSolution: React.FC<PersonalizedSolutionProps> = ({
  painPoints, goal, experienceLevel, onNext, onBack
}) => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setStep(prev => prev < 3 ? prev + 1 : prev);
    }, 400);
    return () => clearInterval(interval);
  }, [visible]);

  const relevantSolutions = painPoints
    .filter(p => p !== 'none' && PAIN_POINT_SOLUTIONS[p])
    .slice(0, 3)
    .map(p => PAIN_POINT_SOLUTIONS[p]);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10 font-sans">
      <div className="mb-8">
        <OnboardingProgressBar current={5} total={9} />
      </div>

      <div className="mb-6">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold mb-4 flex items-center gap-1">
          ← Back
        </button>
        <p className="text-[#059669] text-sm font-bold uppercase tracking-widest mb-2">Step 5 of 9</p>
        <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
          Your personalized<br />
          <span className="text-[#059669]">grow plan is ready</span>
        </h1>
        <p className="text-slate-500 text-sm">Based on your answers, here's how MasterGrowbot helps you specifically.</p>
      </div>

      {/* Personalization Card */}
      <div className={`bg-[#ECFDF5] border border-[#059669]/30 rounded-2xl p-4 mb-5 shadow-sm transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-[#059669] text-xs font-black uppercase tracking-widest mb-2">Your Profile</div>
        <div className="text-slate-900 text-sm font-semibold mb-1">{EXP_MESSAGES[experienceLevel] || "We'll personalize guidance for your level."}</div>
        <div className="text-slate-600 text-xs">{GOAL_MESSAGES[goal] || "We'll tailor your experience to your goals."}</div>
      </div>

      {/* Solutions */}
      <div className="flex-1 space-y-3">
        {relevantSolutions.length > 0 ? (
          <>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Solutions built for your challenges:</div>
            {relevantSolutions.map((sol, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 transition-all duration-500 ${
                  step > i ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
              >
                <span className="text-2xl leading-none mt-0.5">{sol.icon}</span>
                <div className="flex-1">
                  <div className="text-slate-900 font-black text-sm mb-1">{sol.title}</div>
                  <div className="text-slate-500 text-xs leading-relaxed">{sol.solution}</div>
                </div>
                <CheckCircle size={18} className="text-[#059669] flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-3">
            {[
              { icon: '🔬', title: 'AI Plant Diagnosis', text: 'Instant analysis of any plant issue, right from your camera.' },
              { icon: '📅', title: 'Smart Grow Journal', text: 'Track every grow with AI-powered insights and task reminders.' },
              { icon: '🌱', title: 'Strain Intelligence', text: 'Expert grow tips for hundreds of strains in your pocket.' },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 transition-all duration-500 ${step > i ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${i * 150}ms` }}>
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-slate-900 font-black text-sm mb-1">{item.title}</div>
                  <div className="text-slate-500 text-xs">{item.text}</div>
                </div>
                <CheckCircle size={18} className="text-[#059669] flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        className="mt-6 w-full py-5 bg-[#059669] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-[#059669]/30"
      >
        Let's Set Up My Grow <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default PersonalizedSolution;
