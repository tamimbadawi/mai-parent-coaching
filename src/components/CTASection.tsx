import { Link }  from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

interface CTASectionProps {
  title: string;
  description: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  variant?: 'sage' | 'terracotta' | 'dusty-blue';
}

export default function CTASection({
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'sage',
}: CTASectionProps) {
  const bgColors = {
    sage: 'bg-sage/10',
    terracotta: 'bg-terracotta/10',
    'dusty-blue': 'bg-dusty-blue/10',
  };

  const btnColors = {
    sage: 'bg-sage hover:bg-sage-dark',
    terracotta: 'bg-terracotta hover:bg-terracotta-dark',
    'dusty-blue': 'bg-dusty-blue hover:bg-dusty-blue-dark',
  };

  return (
    <section className={`py-20 ${bgColors[variant]}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <AnimatedSection>
          <h2 className="font-serif text-3xl md:text-4xl text-charcoal mb-4">
            {title}
          </h2>
          <p className="text-warm-gray text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={primaryAction.href}
              className={`${btnColors[variant]} text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 justify-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
            >
              {primaryAction.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {secondaryAction && (
              <Link
                to={secondaryAction.href}
                className="bg-ivory text-charcoal border border-beige px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 justify-center hover:bg-cream transition-all duration-300"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
