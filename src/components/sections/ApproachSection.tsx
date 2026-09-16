import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';

const pillars = [
  {
    title: 'Evidence-based',
    text: 'Grounded in psychology, neuroscience, and attachment research — never trends or guilt.',
  },
  {
    title: 'Trauma-informed',
    text: 'Parenting triggers old wounds. We work gently, without judgment, at a pace that feels safe.',
  },
  {
    title: 'Practical & realistic',
    text: 'Tools for real families — messy mornings, sibling fights, and tired evenings included.',
  },
  {
    title: 'Compassion-first',
    text: 'You are doing better than you think. We build on your strengths, not your shame.',
  },
];

export default function ApproachSection() {
  return (
    <section className="bg-cream py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <AnimatedSection>
            <p className="text-sm font-medium text-sage-dark">My approach</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal md:text-4xl">
              Calm expertise for parents who are tired of trying to figure it out alone.
            </h2>
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-warm-gray">
              I combine child psychology, nervous system science, and compassionate coaching so you leave each session
              with clarity — not another overwhelming to-do list.
            </p>
            <Link
              to="/about"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sage-dark transition hover:gap-3"
            >
              Meet Mai
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>

          <AnimatedSection delay={0.1} className="space-y-0 divide-y divide-beige/80">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className="flex gap-5 py-6 first:pt-0 last:pb-0">
                <span className="font-serif text-2xl leading-none text-sage/80">{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-charcoal">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-warm-gray">{pillar.text}</p>
                </div>
              </div>
            ))}
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
