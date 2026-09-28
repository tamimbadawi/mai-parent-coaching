import { useState } from 'react';
import { Check, ArrowRight, Heart, Brain, Users2, Sun, Sparkles } from 'lucide-react';
import { coachingPackages } from '../../data/content';
import { cn } from '../../lib/utils';
import type { CoachingPackage } from '../../types';
import { PackageFitQuizModal } from './PackageFitQuizModal';
import { PackageReservationModal } from './PackageReservationModal';

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
    tag: 'FOCUS 01',
    title: 'Big Feelings & Tantrums',
    desc: 'Co-regulation tools to calm storms with connection, without yelling or threats.',
  },
  {
    tag: 'FOCUS 02',
    title: 'Parent Burnout & Calm',
    desc: 'Nervous system care to replenish depleted reserves and parent from patience.',
  },
  {
    tag: 'FOCUS 03',
    title: 'Sibling Rivalry & Harmony',
    desc: 'End persistent daily bickering and jealousy, fostering genuine companionship.',
  },
  {
    tag: 'FOCUS 04',
    title: 'Loving Limits & Bedtime',
    desc: 'Hold firm, compassionate boundaries that end evening battles peacefully.',
  },
];

export function CoachingPackagesView({
  isReturningClient,
  onSelectDiscovery,
}: CoachingPackagesViewProps): JSX.Element {
  const [showQuiz, setShowQuiz] = useState(false);
  const [highlightedPackageId, setHighlightedPackageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pathways' | 'packages'>('pathways');
  const [selectedPackageForReservation, setSelectedPackageForReservation] = useState<CoachingPackage | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);

  return (
    <div className="w-full">
      {/* Returning Client Pill Switcher */}
      {isReturningClient && (
        <div className="mb-2.5 flex items-center justify-between rounded-xl border border-sage/30 bg-sage/10 p-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('pathways')}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition',
                viewMode === 'pathways'
                  ? 'bg-white text-charcoal shadow-2xs'
                  : 'text-warm-gray hover:text-charcoal'
              )}
            >
              1:1 Focus Pathways & Support
            </button>
            <button
              type="button"
              onClick={() => setViewMode('packages')}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition',
                viewMode === 'packages'
                  ? 'bg-white text-charcoal shadow-2xs'
                  : 'text-warm-gray hover:text-charcoal'
              )}
            >
              View Unlocked Packages (Save 5%–30%)
            </button>
          </div>
          <span className="text-[10px] font-semibold text-sage-dark pr-2 hidden sm:inline">
            {viewMode === 'pathways' ? 'Personalized Care' : 'Multi-Session Plans'}
          </span>
        </div>
      )}

      {/* Primary 1:1 Coaching Overview (Focus Pathways & Mai's Care) */}
      {viewMode === 'pathways' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
          {/* Column 2 Equivalent: 1:1 Focus Pathways (Exact layout from user's picture) */}
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
                Dedicated 1-on-1 sessions focused on your family's daily moments. We shape your customized focus areas together during your Discovery Call.
              </p>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {COACHING_PATHWAYS.map((pathway) => (
                  <div
                    key={pathway.tag}
                    className="flex flex-col rounded-xl border border-beige/80 bg-cream/50 p-2.5 text-xs transition hover:border-sage/40"
                  >
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-warm-gray mb-1">
                      {pathway.tag}
                    </span>
                    <p className="font-serif font-bold text-charcoal text-xs sm:text-[12.5px] leading-tight mb-1">
                      {pathway.title}
                    </p>
                    <p className="text-[10px] text-warm-gray leading-relaxed">
                      {pathway.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Support Indicators with extra items to emphasize Mai's direct care */}
            <div className="mt-3 border-t border-dashed border-beige/80 pt-2 text-[10.5px]">
              <div className="flex items-center justify-between font-semibold text-sage-dark">
                <span>✓ Gentle Boundary Scripts</span>
                <span>✓ WhatsApp Voice Support</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[9.5px] text-warm-gray border-t border-beige/40 pt-1">
                <span>✓ Personalized Action Maps after each call</span>
                <span>✓ Co-Regulation Audio Tools</span>
              </div>
            </div>
          </div>

          {/* Column 3 Equivalent: How We Begin & Mai's Dedicated Care */}
          <div className="flex flex-col justify-between rounded-2xl border border-beige bg-white p-3.5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-beige/80 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-md bg-dusty-blue/20 text-[10px] font-bold text-dusty-blue-dark">
                    3
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">
                    How We Begin
                  </span>
                </div>
                <span className="rounded-full bg-dusty-blue/15 px-2 py-0.5 text-[9.5px] font-semibold text-dusty-blue-dark">
                  Introductory First Step
                </span>
              </div>

              <div className="rounded-xl border border-sage/30 bg-sage/10 p-2.5 text-xs text-charcoal mb-2.5">
                <p className="font-bold text-sage-dark text-[11px] mb-1">🌿 Every Family is Different</p>
                <p className="text-[11px] text-warm-gray leading-relaxed">
                  Rather than generic packages, I listen to your family’s unique story first on an <strong>introductory Discovery Call</strong> to shape your personalized coaching roadmap.
                </p>
              </div>

              <div className="rounded-xl border border-beige bg-cream/70 p-2.5 text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-soft-gray">First Step</span>
                  <span className="font-semibold text-charcoal">Discovery Call (30 min)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft-gray">Format</span>
                  <span className="font-medium text-charcoal">Private Google Meet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft-gray">Between Calls</span>
                  <span className="font-medium text-charcoal">WhatsApp Voice Notes</span>
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

            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                onClick={() => setShowQuiz(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-sage/50 bg-sage/10 py-2 text-xs font-bold text-sage-dark transition hover:bg-sage/20 shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
                <span>Personalized Advisory Assessment · Match Your Scope</span>
              </button>
              <button
                type="button"
                onClick={onSelectDiscovery}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-sage-dark py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sage"
              >
                <span>Schedule Discovery Consultation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <p className="text-center text-[10px] text-warm-gray font-medium">
                Strictly confidential · Evidence-based clinical advisory
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* RETURNING CLIENT VIEW: Unlocked Package Cards & Pricing */
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-charcoal">
                Available Advisory Packages (EGP)
              </h3>
              <span className="text-[11px] text-sage-dark font-semibold">Bespoke multi-session advisory plans</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuiz(true)}
              className="inline-flex items-center gap-1 rounded-full border border-sage/50 bg-sage/10 px-3 py-1 text-[11px] font-bold text-sage-dark hover:bg-sage/20 transition shadow-2xs"
            >
              <Sparkles className="h-3 w-3" />
              <span>Advisory Scope Diagnostic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coachingPackages.map((pkg: CoachingPackage) => {
              const perSession = Math.round(pkg.price / pkg.sessions);
              const savings = PACKAGE_SAVINGS[pkg.id];
              const isHighlighted = highlightedPackageId ? highlightedPackageId === pkg.id : pkg.id === 'growth';

              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 shadow-2xs',
                    isHighlighted
                      ? 'border-sage/40 bg-white ring-2 ring-sage/30 shadow-xs'
                      : 'border-beige bg-white hover:border-sage/40'
                  )}
                >
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
                      {isHighlighted && (
                        <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-bold text-sage-dark">
                          {highlightedPackageId ? 'Selected Fit' : 'Popular'}
                        </span>
                      )}
                    </div>
                  </div>

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

                  <div className="pt-2 border-t border-beige/60">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackageForReservation(pkg);
                        setShowReservationModal(true);
                      }}
                      className="w-full rounded-xl bg-sage-dark py-2 text-xs font-bold text-white shadow-xs hover:bg-sage transition active:scale-[0.98]"
                    >
                      Reserve {pkg.title}
                    </button>
                    <p className="mt-1 text-center text-[10px] text-warm-gray">
                      Assistant coordinates calendar scheduling
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Package Fit Assessment Modal */}
      <PackageFitQuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        onSelectPackage={(pkg) => {
          setHighlightedPackageId(pkg.id);
          setSelectedPackageForReservation(pkg);
          setShowReservationModal(true);
        }}
      />

      {/* Package Reservation Modal (Awaiting assistant calendar booking) */}
      <PackageReservationModal
        isOpen={showReservationModal}
        packageItem={selectedPackageForReservation}
        onClose={() => setShowReservationModal(false)}
        onSuccess={() => {
          setShowReservationModal(false);
        }}
      />
    </div>
  );
}
