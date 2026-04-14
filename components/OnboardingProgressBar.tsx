import React from 'react';

interface OnboardingProgressBarProps {
  current: number; // 1-based screen number
  total: number;   // total number of screens with progress bar (not all 12)
}

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({ current, total }) => {
  return (
    <div className="flex gap-1.5 w-full px-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full overflow-hidden bg-white/10"
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
