import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import AnimatedSection from '../AnimatedSection';

export default function FinalBookingCTA() {
  return (
    <section className="bg-charcoal py-24 text-white lg:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <AnimatedSection>
          <p className="text-sm font-medium text-sage-light">Ready when you are</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl lg:text-5xl">
            You do not have to carry this alone anymore.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            Start with a free consultation — calm, private, and without pressure. We will figure out together what
            support fits your family.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sage px-8 py-4 text-sm font-semibold text-white transition hover:bg-sage-dark"
            >
              Book a free consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              Send a message
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
