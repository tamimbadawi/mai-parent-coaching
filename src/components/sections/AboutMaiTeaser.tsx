import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';

const credentials = [
  'Doctorate in Child Psychology',
  'Certified Parent Coach',
  'Trauma-Informed Practitioner',
  '10+ years experience',
];

export default function AboutMaiTeaser() {
  return (
    <section className="bg-ivory py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <AnimatedSection>
            <div className="relative mx-auto max-w-md lg:mx-0">
              <div className="overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-beige/60">
                <img
                  src="https://images.pexels.com/photos/3184436/pexels-photo-3184436.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Mai Elbadawy, child psychologist and parent coach"
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="text-sm font-medium text-sage-dark">About Mai</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal md:text-4xl">
              A psychologist, a coach, and a mother who gets it.
            </h2>
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-warm-gray">
              I help parents raise emotionally healthy children while also healing themselves — with psychology,
              neuroscience, and compassion that meets you where you are.
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-warm-gray">
              More than credentials, what matters is that I truly see you. I know what it is like to feel overwhelmed,
              to question every decision, and to wonder if you are enough. You are — and I am here to help you believe it.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {credentials.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-beige bg-cream px-3 py-1.5 text-xs font-medium text-charcoal"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/about"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-beige bg-cream px-6 py-3 text-sm font-semibold text-charcoal transition hover:bg-beige/30"
            >
              Read Mai&apos;s story
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
