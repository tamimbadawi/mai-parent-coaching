import AnimatedSection from '../AnimatedSection';
import TestimonialCarousel from '../TestimonialCarousel';
import { testimonials } from '../../data/content';

export default function TestimonialsSection() {
  const pullQuote = testimonials[1];

  return (
    <section className="bg-cream py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-sage-dark">Stories from parents</p>
          <h2 className="mt-3 font-serif text-3xl text-charcoal md:text-4xl">Real families. Real change.</h2>
          {pullQuote && (
            <blockquote className="mt-8 font-serif text-xl leading-relaxed text-charcoal md:text-2xl">
              &ldquo;{pullQuote.content.split('.')[0]}.&rdquo;
              <footer className="mt-4 text-sm font-sans font-medium not-italic text-warm-gray">
                — {pullQuote.name}, {pullQuote.role}
              </footer>
            </blockquote>
          )}
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="mt-14">
          <TestimonialCarousel />
        </AnimatedSection>
      </div>
    </section>
  );
}
