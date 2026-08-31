import { Link } from 'react-router-dom';
import { ArrowRight, Baby, Heart, Sun } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';
import { services } from '../../data/content';

const iconMap = { Heart, Baby, Sun };

const featuredIds = ['parent-coaching', 'burnout-recovery'] as const;

export default function FeaturedServicesSection() {
  const featured = featuredIds
    .map((id) => services.find((service) => service.id === id))
    .filter(Boolean) as typeof services;

  return (
    <section className="bg-ivory py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-2xl">
          <p className="text-sm font-medium text-sage-dark">Start here</p>
          <h2 className="mt-3 font-serif text-3xl text-charcoal md:text-4xl">Two paths parents most often begin with</h2>
          <p className="mt-4 text-lg leading-relaxed text-warm-gray">
            Not sure where to start? Most families choose one of these — we can always adjust as your needs evolve.
          </p>
        </AnimatedSection>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {featured.map((service, index) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] ?? Heart;
            const isPrimary = index === 0;
            return (
              <AnimatedSection key={service.id} delay={index * 0.1}>
                <article
                  className={[
                    'flex h-full flex-col rounded-[1.75rem] p-8 lg:p-10',
                    isPrimary
                      ? 'bg-charcoal text-white shadow-xl shadow-charcoal/10'
                      : 'border border-beige bg-cream',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mb-6 flex h-12 w-12 items-center justify-center rounded-2xl',
                      isPrimary ? 'bg-white/10 text-white' : 'bg-sage/10 text-sage-dark',
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={isPrimary ? 'text-sm text-white/65' : 'text-sm text-sage-dark'}>
                    {isPrimary ? 'Most popular' : 'For mothers running on empty'}
                  </p>
                  <h3 className={['mt-2 font-serif text-2xl', isPrimary ? 'text-white' : 'text-charcoal'].join(' ')}>
                    {service.title}
                  </h3>
                  <p
                    className={[
                      'mt-3 flex-grow text-base leading-relaxed',
                      isPrimary ? 'text-white/75' : 'text-warm-gray',
                    ].join(' ')}
                  >
                    {service.description}
                  </p>
                  <p className={['mt-4 text-sm font-medium', isPrimary ? 'text-sage-light' : 'text-charcoal'].join(' ')}>
                    Leave with a plan you can use tonight.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {service.features.slice(0, 3).map((feature) => (
                      <li
                        key={feature}
                        className={[
                          'flex items-center gap-2 text-sm',
                          isPrimary ? 'text-white/80' : 'text-warm-gray',
                        ].join(' ')}
                      >
                        <span className={['h-1.5 w-1.5 rounded-full', isPrimary ? 'bg-sage-light' : 'bg-sage'].join(' ')} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex items-center justify-between gap-4">
                    <span className={isPrimary ? 'text-sm text-white/60' : 'text-sm text-warm-gray'}>
                      {service.duration} · {service.price}
                    </span>
                    {isPrimary ? (
                      <Link
                        to="/booking"
                        className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-dark"
                      >
                        Book session
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        to="/services"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-sage-dark transition hover:gap-3"
                      >
                        Learn more
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </article>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={0.2} className="mt-10 text-center">
          <Link to="/services" className="text-sm font-semibold text-sage-dark transition hover:text-sage">
            View all services →
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
