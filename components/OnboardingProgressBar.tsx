import React from 'react';

interface OnboardingProgressBarProps {
  current: number; // 1-based screen number
  total: number;   // total number of screens with progress bar (questionnaire + demo = 9)
}

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({ current, total }) => {
  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-200"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              i < current ? 'bg-[#059669] w-full' : 'w-0'
            }`}
          />
        </div>
      ))}
    </div>
  );
};

export default OnboardingProgressBar;
