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

const TestimonialCard = memo(({ testimonial }: TestimonialCardProps) => (
  <div className="w-full max-w-sm mt-5 px-2">
    <div className="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-0.5 mb-2">
        {Array.from({ length: testimonial.stars }).map((_, i) => (
          <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      <p className="text-xs text-text-main font-medium leading-relaxed mb-2">
        "{testimonial.text}"
      </p>
      <p className="text-[10px] font-black text-text-sub uppercase tracking-wider">
        {testimonial.name}
      </p>
    </div>
  </div>
));

TestimonialCard.displayName = 'TestimonialCard';

export default TestimonialCard;
