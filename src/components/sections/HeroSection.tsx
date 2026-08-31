import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, Heart, Shield, Video } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-32 lg:pb-28">
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-ivory to-beige/20" />
      <div className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-sage/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="mb-4 text-sm font-medium tracking-wide text-sage-dark">
              Child psychologist & parent coach
            </p>
            <h1 className="max-w-xl font-serif text-4xl leading-[1.08] text-charcoal md:text-5xl lg:text-[3.4rem]">
              Feel calmer, more connected, and more confident as a parent.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-warm-gray">
              Evidence-based coaching for burnout, big emotions, and everyday family stress — with warmth,
              clarity, and no judgment.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/booking"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sage px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-sage-dark hover:shadow-lg"
              >
                Book a free consultation
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-i-help"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-beige bg-ivory/80 px-7 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-cream"
              >
                See how I can help
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-warm-gray">
              <li className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-sage" />
                500+ families supported
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-sage" />
                Online sessions
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-sage" />
                Confidential & trauma-informed
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-charcoal/10 ring-1 ring-beige/60">
              <img
                src="https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Parent and child sharing a calm, connected moment"
                className="aspect-[4/5] w-full object-cover sm:aspect-[5/6] lg:aspect-auto lg:h-[520px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/25 via-transparent to-transparent" />
            </div>
            <blockquote className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-beige/60 bg-ivory/95 px-5 py-4 shadow-lg backdrop-blur-sm sm:-left-6 sm:max-w-xs">
              <p className="font-serif text-sm leading-relaxed text-charcoal">
                &ldquo;You are not failing. You are carrying more than one person should have to carry alone.&rdquo;
              </p>
              <footer className="mt-2 text-xs font-medium text-sage-dark">— Mai</footer>
            </blockquote>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
