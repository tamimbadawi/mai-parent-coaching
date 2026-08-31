import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';
import { faqs } from '../../data/content';
import { cn } from '../../lib/utils';

const previewFaqs = faqs.slice(0, 4);

export default function FAQTeaser() {
  const [openId, setOpenId] = useState<string | null>(previewFaqs[0]?.id ?? null);

  return (
    <section className="bg-cream py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <p className="text-sm font-medium text-sage-dark">Common questions</p>
          <h2 className="mt-3 font-serif text-3xl text-charcoal md:text-4xl">Before you book</h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1} className="mt-10 divide-y divide-beige/80">
          {previewFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="flex w-full items-start justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-charcoal">{faq.question}</span>
                  <ChevronDown
                    className={cn('mt-1 h-4 w-4 shrink-0 text-sage-dark transition', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <p className="pb-5 text-sm leading-relaxed text-warm-gray">{faq.answer}</p>
                )}
              </div>
            );
          })}
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="mt-8 text-center">
          <Link to="/faq" className="text-sm font-semibold text-sage-dark transition hover:text-sage">
            See all FAQs →
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
