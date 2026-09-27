import { useState } from 'react';
import { Check, ArrowRight, HelpCircle, Heart, Brain, Users2, Sun } from 'lucide-react';
import {
  coachingPackages,
  intakeNeeds,
  intakeDurations,
  suggestPackage,
} from '../../data/content';
import { cn } from '../../lib/utils';
import type { CoachingPackage } from '../../types';

interface CoachingPackagesViewProps {
  isReturningClient: boolean;
  onSelectDiscovery: () => void;
}

const PACKAGE_SAVINGS: Record<string, string> = {
  single: '',
  starter: 'Saves 5%',
  growth: 'Saves 20%',
  'deep-work': 'Saves 25%',
  full: 'Saves 30%',
};

const COACHING_PATHWAYS = [
  {
    id: 'regulation',
    title: 'Emotional & Nervous System Regulation',
    sub: 'For sensitive kids & big meltdowns',
    desc: 'Practical co-regulation tools to de-escalate meltdowns, soothe an overwhelmed nervous system, and build emotional safety.',
    icon: Brain,
    accent: 'bg-sage/15 text-sage-dark',
  },
  {
    id: 'burnout',
    title: 'Parental Burnout & Inner Calm',
    sub: 'For exhausted, reactive parents',
    desc: 'Stop the yelling cycle, replenish depleted energy reserves, and parent from grounded presence rather than stress.',
    icon: Sun,
    accent: 'bg-gold/20 text-terracotta-dark',
  },
  {
    id: 'siblings',
    title: 'Sibling Dynamics & Harmony',
    sub: 'For chronic bickering & rivalry',
    desc: 'Transform jealousy and persistent conflict into lasting companionship while meeting each child’s unique needs.',
    icon: Users2,
    accent: 'bg-dusty-blue/20 text-dusty-blue-dark',
  },
  {
    id: 'routines',
    title: 'Loving Boundaries, Sleep & Routines',
    sub: 'For bedtime battles & boundary testing',
    desc: 'Establish clear, empathetic limits and peaceful evening rhythms without threats, power struggles, or guilt.',
    icon: Heart,
    accent: 'bg-terracotta/15 text-terracotta-dark',
  },
];

export function CoachingPackagesView({
  isReturningClient,
  onSelectDiscovery,
}: CoachingPackagesViewProps): JSX.Element {
  // Help me choose interactive state
  const [selectedNeed, setSelectedNeed] = useState<string>('steady');
  const [selectedDuration, setSelectedDuration] = useState<string>('months');

  const suggestedPkg = suggestPackage(selectedNeed, selectedDuration) || coachingPackages[2];

  return (
    <div className="w-full">
      {/* NEW PARENT VIEW: Pathways & Methodology in compact 2-column grid */}
      {!isReturningClient ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
          {/* Column 2 Equivalent: 1:1 Focus Pathways */}
          <div className="flex flex-col justify-between rounded-2xl border border-beige bg-white p-3.5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-beige/80 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-md bg-sage/20 text-[10px] font-bold text-sage-dark">
                    2
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">
                    1:1 Focus Pathways
                  </span>
                </div>
                <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[9.5px] font-semibold text-sage-dark">
                  60-min Deep Dives
                </span>
              </div>

              <p className="text-[11px] text-warm-gray leading-snug">
                Dedicated 1-on-1 sessions focused on your family's daily moments. We shape your customized focus areas together on your call.
              </p>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {COACHING_PATHWAYS.map((pathway) => {
                  const Icon = pathway.icon;
                  return (
                    <div
                      key={pathway.id}
                      className="flex flex-col rounded-xl border border-beige/80 bg-cream/50 p-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md', pathway.accent)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <p className="font-serif font-bold text-charcoal text-[11px] leading-tight truncate">
                          {pathway.title.split('&')[0].trim()}
                        </p>
                      </div>
                      <p className="text-[10px] text-soft-gray line-clamp-2 leading-relaxed">
                        {pathway.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-beige/80 pt-2 text-[10px] font-medium text-sage-dark">
              <span>✓ Tailored Boundary Scripts</span>
              <span>✓ WhatsApp Voice Support</span>
            </div>
          </div>

          {/* Column 3 Equivalent: How We Begin */}
          <div className="flex flex-col justify-between rounded-2xl border border-beige bg-white p-3.5 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 border-b border-beige/80 pb-2 mb-2.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-md bg-dusty-blue/20 text-[10px] font-bold text-dusty-blue-dark">
                  3
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">
                  How We Begin
                </span>
              </div>

              <div className="rounded-xl border border-sage/30 bg-sage/10 p-2.5 text-xs text-charcoal mb-2.5">
                <p className="font-bold text-sage-dark text-[11px] mb-1">🌿 Every Family is Different</p>
                <p className="text-[11px] text-warm-gray leading-relaxed">
                  Rather than generic packages, I listen to your family’s unique story first on an <strong>introductory Discovery Call</strong> to shape your personalized coaching roadmap.
                </p>
              </div>

              <div className="rounded-xl border border-beige bg-cream/70 p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-soft-gray">First Step</span>
                  <span className="font-semibold text-charcoal">Discovery Call (30 min)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft-gray">Format</span>
                  <span className="font-medium text-charcoal">Private Google Meet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft-gray">After We Meet</span>
                  <span className="font-semibold text-sage-dark">Custom 1:1 Packages Unlock</span>
                </div>
                <div className="flex justify-between border-t border-beige/80 pt-1 mt-1">
                  <span className="text-soft-gray">Session Fee</span>
                  <span className="font-bold text-charcoal">EGP 500</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={onSelectDiscovery}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-sage py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark"
              >
                <span>Schedule Discovery Call to Begin</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <p className="mt-1 text-center text-[10px] text-soft-gray">
                Purely supportive. Zero high-pressure sales pitches ever.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* RETURNING CLIENT VIEW: Unlocked Package Cards & Pricing (Rule 3) */
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-serif text-sm sm:text-base font-semibold text-charcoal">
              Available Packages (EGP)
            </h3>
            <span className="text-[11px] text-sage-dark font-semibold">Unlocked for your account</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coachingPackages.map((pkg: CoachingPackage) => {
              const perSession = Math.round(pkg.price / pkg.sessions);
              const savings = PACKAGE_SAVINGS[pkg.id];
              const isGrowth = pkg.id === 'growth';
              const isSuggested = suggestedPkg.id === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 shadow-2xs',
                    isSuggested
                      ? 'border-sage-dark bg-sage/8 ring-2 ring-sage/30'
                      : isGrowth
                      ? 'border-sage/40 bg-white ring-1 ring-sage/20'
                      : 'border-beige bg-white hover:border-sage/40'
                  )}
                >
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-serif text-sm font-bold text-charcoal">
                      {pkg.title}
                    </span>
                    <div className="flex items-center gap-1">
                      {savings && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          {savings}
                        </span>
                      )}
                      {isGrowth && (
                        <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-bold text-sage-dark">
                          Popular
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price block */}
                  <div className="my-2 border-y border-beige/60 py-2.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
                        EGP {pkg.price.toLocaleString('en-US')}
                      </span>
                    </div>
                    <p className="text-[11px] text-warm-gray mt-0.5">
                      {pkg.sessions === 1
                        ? 'Single 60-min session'
                        : `EGP ${perSession.toLocaleString('en-US')} / session (${pkg.sessions} sessions)`}
                    </p>
                  </div>

                  {/* Meta details */}
                  <ul className="space-y-1.5 text-[11px] text-charcoal mb-3">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-sage shrink-0" />
                      <span>60 minutes per session</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-sage shrink-0" />
                      <span>Mondays & Wednesdays (12:00 / 13:30)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-sage shrink-0" />
                      <span>Use within {pkg.useWithinWeeks} weeks</span>
                    </li>
                  </ul>

                  {/* Card footer CTA */}
                  <div className="pt-2 border-t border-beige/60 text-center">
                    <span className="block text-[11px] font-medium text-warm-gray py-1">
                      {pkg.id === 'single' ? 'Book single slot below' : 'Package purchase available in Stage 3'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "Help Me Choose" Interactive Tool */}
      <div className="rounded-2xl border border-beige bg-white p-4 sm:p-5 shadow-xs">
        <div className="mb-3.5 flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-charcoal">
            <HelpCircle className="h-4 w-4 text-warm-gray" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-sage-dark">
              Decision Guide
            </div>
            <h3 className="font-serif text-base sm:text-lg font-semibold text-charcoal">
              Help Me Choose a Support Level
            </h3>
            <p className="text-xs text-warm-gray">
              Two gentle questions to guide you. It only suggests a starting point — we'll confirm what feels best on our call.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Question 1 */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              1. What would help most right now?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {intakeNeeds.map((need) => {
                const active = selectedNeed === need.id;
                return (
                  <button
                    key={need.id}
                    type="button"
                    onClick={() => setSelectedNeed(need.id)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150',
                      active
                        ? 'bg-sage text-white shadow-xs'
                        : 'border border-beige bg-cream text-charcoal hover:border-sage/50 hover:bg-cream/80'
                    )}
                  >
                    {need.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 2 */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              2. How long has it felt hard?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {intakeDurations.map((dur) => {
                const active = selectedDuration === dur.id;
                return (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => setSelectedDuration(dur.id)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150',
                      active
                        ? 'bg-sage text-white shadow-xs'
                        : 'border border-beige bg-cream text-charcoal hover:border-sage/50 hover:bg-cream/80'
                    )}
                  >
                    {dur.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suggestion Result Box */}
          <div className="mt-3 rounded-xl border border-sage/30 bg-sage/10 p-3 sm:p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sage-dark">
              Recommended Starting Point
            </span>
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-serif text-base sm:text-lg font-bold text-charcoal">
                  {suggestedPkg.title} ({suggestedPkg.sessions} sessions)
                </p>
                <p className="text-xs text-warm-gray">
                  {isReturningClient ? (
                    <>
                      EGP {suggestedPkg.price.toLocaleString('en-US')} total · EGP{' '}
                      {Math.round(suggestedPkg.price / suggestedPkg.sessions).toLocaleString('en-US')}{' '}
                      per session · Use within {suggestedPkg.useWithinWeeks} weeks
                    </>
                  ) : (
                    <>
                      Recommended span: {suggestedPkg.sessions} sessions across {suggestedPkg.useWithinWeeks} weeks.
                      We’ll discuss your tailored coaching plan and package options during our Discovery Call.
                    </>
                  )}
                </p>
              </div>

              {!isReturningClient && (
                <button
                  type="button"
                  onClick={onSelectDiscovery}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                >
                  <span>Book Discovery Call</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-warm-gray italic">
              * We will talk through your family situation together during our Discovery Call and decide what feels best.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
