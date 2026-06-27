import { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedSection from '../components/AnimatedSection';
import { faqs } from '../data/content';
import { cn } from '../lib/utils';

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...new Set(faqs.map((f) => f.category))];

  const filtered = activeCategory === 'All'
    ? faqs
    : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">FAQ</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Questions & Answers
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Everything you need to know about coaching, courses, and working together. Can't find your answer? Just reach out.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 bg-ivory border-b border-beige">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  activeCategory === cat
                    ? 'bg-sage text-white'
                    : 'bg-cream text-warm-gray hover:bg-beige'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-20 bg-ivory">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {filtered.map((faq, i) => (
              <AnimatedSection key={faq.id} delay={i * 0.05}>
                <div className="bg-cream rounded-2xl border border-beige/50 overflow-hidden">
                  <button
                    onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-cream/80 transition-colors"
                  >
                    <span className="font-medium text-charcoal pr-4">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-soft-gray shrink-0 transition-transform duration-300',
                        openId === faq.id && 'rotate-180'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300',
                      openId === faq.id ? 'max-h-96' : 'max-h-0'
                    )}
                  >
                    <div className="px-6 pb-6 text-warm-gray leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-cream">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <MessageCircle className="w-10 h-10 text-sage mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-charcoal mb-4">Still Have Questions?</h2>
            <p className="text-warm-gray mb-6">
              I'm here to help. Send me a message and I'll get back to you within 24 hours.
            </p>
            <Link
              to="/contact"
              className="bg-sage text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all hover:shadow-lg"
            >
              Contact Me
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
