import { Link } from 'react-router-dom';
import { Heart, Brain, Sun, Users, Baby, ArrowRight, Check } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import CTASection from '../components/CTASection';
import { services } from '../data/content';

const iconMap: Record<string, React.ElementType> = {
  Heart, Brain, Sun, Users, Baby,
};

export default function Services() {
  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Services</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Support Tailored to Your Family
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              From one-on-one coaching to workshops and online courses, I offer multiple pathways to help you and your family thrive.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {services.map((service, i) => {
              const Icon = iconMap[service.icon] || Heart;
              return (
                <AnimatedSection key={service.id} delay={i * 0.1}>
                  <div className="bg-cream rounded-2xl p-8 md:p-10 border border-beige/50 hover:border-beige hover:shadow-xl transition-all duration-500 group">
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-sage/10 flex items-center justify-center shrink-0 group-hover:bg-sage/20 transition-colors">
                        <Icon className="w-7 h-7 text-sage-dark" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-serif text-2xl text-charcoal">{service.title}</h3>
                          {service.price && (
                            <span className="text-sage-dark font-medium bg-sage/10 px-4 py-1.5 rounded-full text-sm">
                              {service.price}
                            </span>
                          )}
                        </div>
                        <p className="text-warm-gray leading-relaxed mb-6">{service.description}</p>
                        <div className="space-y-3 mb-6">
                          {service.features.map((feature) => (
                            <div key={feature} className="flex items-center gap-3 text-sm text-warm-gray">
                              <Check className="w-4 h-4 text-sage shrink-0" />
                              {feature}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <Link
                            to="/booking"
                            className="bg-sage text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-sage-dark transition-all duration-300 inline-flex items-center gap-2"
                          >
                            Book Now <ArrowRight className="w-4 h-4" />
                          </Link>
                          {service.duration && (
                            <span className="text-soft-gray text-sm">{service.duration}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-terracotta-dark text-sm font-medium tracking-wider uppercase">The Process</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              How Coaching Works
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Book a Free Consultation',
                description: 'We start with a no-pressure conversation about your challenges, goals, and how I can help.',
              },
              {
                step: '02',
                title: 'Personalized Plan',
                description: 'Together we create a tailored roadmap with specific strategies and goals for your family.',
              },
              {
                step: '03',
                title: 'Ongoing Support',
                description: 'Regular sessions, check-ins, and resources to keep you moving forward with confidence.',
              },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 0.15}>
                <div className="text-center">
                  <span className="font-serif text-5xl text-beige">{item.step}</span>
                  <h3 className="font-serif text-xl text-charcoal mt-4 mb-3">{item.title}</h3>
                  <p className="text-warm-gray leading-relaxed">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Not Sure Where to Start?"
        description="Book a free initial consultation. We'll talk about what's happening in your family and figure out the best path forward together."
        primaryAction={{ label: 'Book Free Consultation', href: '/booking' }}
        secondaryAction={{ label: 'Explore Courses', href: '/courses' }}
        variant="sage"
      />
    </div>
  );
}
