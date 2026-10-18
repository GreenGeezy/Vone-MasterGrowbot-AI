import React, { memo } from 'react';
import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  text: string;
  stars: number;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
}

const TestimonialCard: React.FC<TestimonialCardProps> = memo(({ testimonial }) => {
  return (
    <div className="w-full max-w-sm mt-5 px-2">
      <div className="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-0.5 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < testimonial.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
            />
          ))}
        </div>
        <p className="text-xs text-gray-600 font-medium leading-relaxed mb-2">
          &ldquo;{testimonial.text}&rdquo;
        </p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {testimonial.name}
        </p>
      </div>
    </div>
  );
});

TestimonialCard.displayName = 'TestimonialCard';

export default TestimonialCard;
