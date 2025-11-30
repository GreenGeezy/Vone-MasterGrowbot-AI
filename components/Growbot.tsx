
import React, { useEffect, useState } from 'react';

interface GrowbotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  mood?: 'happy' | 'thinking' | 'alert' | 'speaking' | 'neutral' | 'confused' | 'success';
  className?: string;
}

const Growbot: React.FC<GrowbotProps> = ({ size = 'md', mood = 'happy', className = '' }) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Blinking Logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4000 + Math.random() * 2000); 

    return () => clearInterval(blinkInterval);
  }, []);

  const sizePx = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 120,
    '2xl': 180
  };

  const currentSize = sizePx[size];

  // Dynamic transforms for "Poses"
  const getPoseTransform = () => {
    switch (mood) {
      case 'neutral': return 'rotate(5, 50, 50)'; 
      case 'thinking': return 'translate(0, 2)'; 
      case 'success': return 'translate(0, -2)'; 
      default: return '';
    }
  };

  // Eyes Logic (Purple, Large)
  const renderEyes = () => {
    if (mood === 'confused') {
        return (
            <g>
                <text x="35" y="52" fontSize="14" fill="#6D28D9" fontFamily="monospace" fontWeight="bold">@</text>
                <text x="58" y="52" fontSize="14" fill="#6D28D9" fontFamily="monospace" fontWeight="bold">@</text>
            </g>
        );
    }

    if (mood === 'success') {
        // Winking
        return (
            <g>
                {/* Left Eye */}
                <circle cx="38" cy="48" r="8" fill="#4C1D95" />
                <circle cx="40" cy="46" r="3" fill="white" opacity="0.9" />
                {/* Right Eye (Wink) */}
                <path d="M58 48 Q66 54 74 48" stroke="#4C1D95" strokeWidth="4" strokeLinecap="round" />
            </g>
        );
    }

    if (isBlinking) {
        return (
            <g>
               <path d="M30 48 Q38 52 46 48" stroke="#4C1D95" strokeWidth="4" strokeLinecap="round" />
               <path d="M58 48 Q66 52 74 48" stroke="#4C1D95" strokeWidth="4" strokeLinecap="round" />
            </g>
        );
    }

    // Default Big Purple Eyes
    return (
        <g className={mood === 'alert' ? 'animate-pulse' : ''}>
            <circle cx="38" cy="48" r="9" fill="#4C1D95" stroke="#2E1065" strokeWidth="1" />
            <circle cx="38" cy="48" r="6" fill="#7C3AED" />
            <circle cx="41" cy="45" r="3" fill="white" />
            
            <circle cx="66" cy="48" r="9" fill="#4C1D95" stroke="#2E1065" strokeWidth="1" />
            <circle cx="66" cy="48" r="6" fill="#7C3AED" />
            <circle cx="69" cy="45" r="3" fill="white" />
        </g>
    );
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow Aura */}
      <div 
        className={`absolute inset-0 rounded-full blur-xl opacity-50 transition-colors duration-500 ${
            mood === 'alert' ? 'bg-alert-red' : 'bg-green-400'
        }`} 
        style={{ transform: 'scale(1.1)' }}
      />

      <svg 
        width={currentSize} 
        height={currentSize} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-2xl transition-transform duration-500 ease-out"
        style={{ transform: getPoseTransform() }}
      >
        <defs>
          <linearGradient id="headGradient" x1="50" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ADE80"/>
            <stop offset="100%" stopColor="#059669"/>
          </linearGradient>
        </defs>

        {/* --- HEADPHONES --- */}
        {/* Band */}
        <path d="M15 50 C15 25 25 10 50 10 C75 10 85 25 85 50" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
        {/* Cups */}
        <rect x="8" y="42" width="12" height="24" rx="4" fill="#1F2937" stroke="#111827" strokeWidth="2" />
        <rect x="80" y="42" width="12" height="24" rx="4" fill="#1F2937" stroke="#111827" strokeWidth="2" />
        {/* Lights */}
        <circle cx="14" cy="54" r="2" fill="#34D399" className="animate-pulse"/>
        <circle cx="86" cy="54" r="2" fill="#34D399" className="animate-pulse"/>

        {/* --- HEAD --- */}
        <rect x="22" y="28" width="56" height="48" rx="14" fill="url(#headGradient)" stroke="#065F46" strokeWidth="2" />
        {/* Highlight */}
        <ellipse cx="35" cy="35" rx="8" ry="4" fill="white" opacity="0.3" transform="rotate(-20 35 35)" />

        {/* --- FACE FEATURES --- */}
        {renderEyes()}
        
        {/* Mouth */}
        {mood === 'happy' || mood === 'success' || mood === 'thinking' ? (
             <path d="M42 62 Q50 68 58 62" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" />
        ) : (
             <path d="M44 64 H56" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* --- LEAF ON TOP (5 Leaflets, Thicker) --- */}
        <g transform="translate(50, 28) scale(1.1)">
           {/* Center Leaf (Top) */}
           <path d="M0 0 Q-5 -15 0 -35 Q5 -15 0 0" fill="#22C55E" stroke="#064E3B" strokeWidth="0.5" />
           
           {/* Inner Pair */}
           <g transform="rotate(-30)">
             <path d="M0 0 Q-4 -12 0 -28 Q4 -12 0 0" fill="#22C55E" stroke="#064E3B" strokeWidth="0.5" />
           </g>
           <g transform="rotate(30)">
             <path d="M0 0 Q-4 -12 0 -28 Q4 -12 0 0" fill="#22C55E" stroke="#064E3B" strokeWidth="0.5" />
           </g>

           {/* Outer Pair (Smaller) */}
           <g transform="rotate(-70)">
             <path d="M0 0 Q-3 -8 0 -18 Q3 -8 0 0" fill="#22C55E" stroke="#064E3B" strokeWidth="0.5" />
           </g>
           <g transform="rotate(70)">
             <path d="M0 0 Q-3 -8 0 -18 Q3 -8 0 0" fill="#22C55E" stroke="#064E3B" strokeWidth="0.5" />
           </g>
        </g>

      </svg>
    </div>
  );
};

export default Growbot;