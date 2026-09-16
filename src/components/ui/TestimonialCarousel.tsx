import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { testimonials } from '../data/content';
import { cn } from '../lib/utils';

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setCurrent(index);
    setIsAutoPlaying(false);
  };

  const prev = () => goTo((current - 1 + testimonials.length) % testimonials.length);
  const next = () => goTo((current + 1) % testimonials.length);

  return (
    <div
      className="relative max-w-4xl mx-auto"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="bg-ivory rounded-3xl p-8 md:p-12 shadow-sm border border-beige relative overflow-hidden">
        <Quote className="absolute top-6 right-6 w-12 h-12 text-sage/20" />

        <div className="relative min-h-[200px]">
          {testimonials.map((t, i) => (
            <div
              key={t.id}
              className={cn(
                'transition-all duration-700 ease-in-out',
                i === current
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'
              )}
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-5 h-5 fill-terracotta text-terracotta" />
                ))}
              </div>
              <p className="text-charcoal text-lg md:text-xl leading-relaxed mb-8 font-light italic">
                "{t.content}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center">
                  <span className="text-sage-dark font-serif text-lg">
                    {t.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-charcoal">{t.name}</p>
                  <p className="text-sm text-warm-gray">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-beige">
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all duration-300',
                  i === current ? 'bg-sage w-8' : 'bg-beige hover:bg-sand'
                )}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-beige flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white hover:border-sage transition-all duration-300"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-beige flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white hover:border-sage transition-all duration-300"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
