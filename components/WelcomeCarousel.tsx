
import React, { useState } from 'react';
import { ArrowRight, TrendingUp, Sparkles, Trophy, Camera, ScanLine, Sprout, Search, ShieldCheck } from 'lucide-react';
import Growbot from './Growbot';

interface WelcomeCarouselProps {
  onStart: () => void;
}

const CARDS = [
  {
    id: 1,
    title: "Save Your Cannabis Plants in Seconds Just By Taking a Pic",
    description: "AI instantly analyzes plant health to detect issues early and help protect yield and quality for all types of growers.",
    microBenefit: "Trusted by Elite Growers Worldwide",
    payoff: "Grow confidently — no more guessing or unexpected plant loss.",
    mood: 'happy' as const,
    icon: Camera,
    color: 'text-primary',
    bg: 'bg-green-50'
  },
  {
    id: 2,
    title: "AI Plant Health Analysis for All Growers",
    description: "Identify deficiencies, pests, mold, nutrient stress, and environment problems with a single photo.",
    benefit: "Instant, accurate diagnostics for indoor, outdoor, and tent grows.",
    mood: 'alert' as const,
    icon: ScanLine,
    color: 'text-neon-blue',
    bg: 'bg-blue-50'
  },
  {
    id: 3,
    title: "Custom Grow Reports for Better Harvests",
    description: "Get personalized nutrient plans, feeding schedules, and grow optimization tips tailored to your strains and grow setup.",
    benefit: "Boost plant health, consistency, and overall grow success across every grow cycle.",
    mood: 'thinking' as const,
    icon: TrendingUp,
    color: 'text-deep-purple',
    bg: 'bg-purple-50'
  },
  {
    id: 4,
    title: "Strain Search & Expert Grow Profiles",
    description: "Access strain-specific data, difficulty levels, recommended settings, and best practices for each cultivar.",
    benefit: "Your AI grow coach and strain database help you make smarter decisions from seedling to harvest.",
    mood: 'speaking' as const,
    icon: Search,
    color: 'text-primary',
    bg: 'bg-emerald-50',
    isLast: true
  }
];

const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ onStart }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50 && activeIndex < CARDS.length - 1) {
      setActiveIndex(prev => prev + 1); // Swipe Left -> Next
    } else if (diff < -50 && activeIndex > 0) {
      setActiveIndex(prev => prev - 1); // Swipe Right -> Prev
    }
    setTouchStart(null);
  };

  const getCardStyle = (index: number) => {
    const offset = index - activeIndex;
    const isActive = offset === 0;
    
    // Alma-style math
    const scale = isActive ? 1 : 0.85;
    const opacity = isActive ? 1 : 0.4;
    const zIndex = isActive ? 20 : 10 - Math.abs(offset);
    const translateX = offset * 105; 
    const rotateY = offset * -5;

    return {
      transform: `perspective(1000px) translateX(${translateX}%) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
      transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
    };
  };

  return (
    <div className="h-screen bg-surface flex flex-col items-center justify-center overflow-hidden font-sans relative">
      
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[80px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-neon-blue/5 rounded-full blur-[80px]" />
      </div>

      {/* Carousel Area */}
      <div 
        className="relative w-full max-w-sm h-[75vh] flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {CARDS.map((card, index) => {
           return (
            <div
              key={card.id}
              className="absolute w-[85%] h-full top-0 left-0 right-0 bottom-0 m-auto flex"
              style={getCardStyle(index)}
            >
              <div className="w-full h-full bg-white rounded-[2.5rem] shadow-card border border-white/50 relative overflow-hidden flex flex-col items-center justify-between p-6 text-center">
                
                {/* Decorative Top Mesh */}
                <div className={`absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b ${card.bg === 'bg-green-50' ? 'from-green-100' : card.bg === 'bg-blue-50' ? 'from-blue-100' : 'from-purple-100'} to-transparent opacity-50`} />

                {/* Content Container */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-6">
                    
                    {/* Micro Benefit (Card 1) */}
                    {card.microBenefit && (
                        <div className="mb-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-gray-100 shadow-sm flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-primary" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-sub">{card.microBenefit}</span>
                        </div>
                    )}

                    {/* Mascot */}
                    <div className="mb-4 relative">
                        <div className="absolute inset-0 bg-white/50 blur-xl rounded-full scale-150 animate-pulse" />
                        <Growbot size="lg" mood={card.mood} />
                    </div>

                    {/* Title */}
                    <h2 className={`text-xl font-extrabold mb-3 leading-tight ${card.color} px-1`}>
                        {card.title}
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-text-sub font-medium leading-relaxed px-2 mb-4">
                        {card.description}
                    </p>

                    {/* Secondary Benefit Line (Cards 2, 3, 4) */}
                    {card.benefit && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 w-full">
                            <p className="text-xs text-text-main font-semibold leading-snug">
                                {card.benefit}
                            </p>
                        </div>
                    )}

                    {/* Emotional Payoff (Card 1) */}
                    {card.payoff && (
                        <p className="text-xs text-primary font-bold italic opacity-80 mt-2">
                            "{card.payoff}"
                        </p>
                    )}
                </div>

                {/* Footer Action */}
                <div className="relative z-10 w-full mt-auto pt-4">
                    {card.isLast ? (
                        <div className="flex flex-col gap-3">
                            <button 
                            onClick={onStart}
                            className="w-full py-4 bg-text-main text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-lg"
                            >
                            Get Started <ArrowRight size={24} />
                            </button>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Secure, Private, and AI-Powered
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 animate-pulse pb-4">
                            {/* Updated Size: text-2xl (was 5xl) */}
                            <span className="text-2xl font-black text-black tracking-tight">SWIPE</span>
                            {/* Updated Arrow: size 24 (was 48) */}
                            <ArrowRight size={24} className="text-black" />
                        </div>
                    )}
                </div>

              </div>
            </div>
           );
        })}
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-8 flex gap-3 z-20">
        {CARDS.map((_, idx) => (
          <div 
            key={idx}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              idx === activeIndex ? 'w-8 bg-text-main' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

    </div>
  );
};

export default WelcomeCarousel;