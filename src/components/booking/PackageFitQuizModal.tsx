import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import {
  advisoryFocusAreas,
  advisoryScopes,
  advisoryCadences,
  getAdvisoryRecommendation,
  coachingPackages,
} from '../../data/content';
import type { CoachingPackage, AdvisoryFocusArea } from '../../types';

export interface PackageFitQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage: (pkg: CoachingPackage) => void;
}

let preservedAdvisoryState: {
  selectedFocusIds: string[];
  selectedScopeId: string;
  selectedCadenceId: string;
  chosenPackageId: string | null;
} = {
  selectedFocusIds: ['dysregulation'],
  selectedScopeId: 'realignment',
  selectedCadenceId: 'action-maps',
  chosenPackageId: null,
};

function renderAdvisorySvg(area: AdvisoryFocusArea, iconClass = 'h-7 w-7 sm:h-8 sm:w-8') {
  switch (area.id) {
    case 'dysregulation':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.18)" />
          <path
            d="M15 31a7 7 0 0 1 2-13.7A9 9 0 0 1 34 19a6 6 0 0 1 1 12z"
            fill="rgb(var(--color-sage-dark))"
          />
          <path
            d="M27 32l-3.5 6.5h4.5l-3 6"
            fill="none"
            stroke="rgb(var(--color-gold))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'burnout':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-gold) / 0.18)" />
          <rect
            x="13"
            y="19"
            width="24"
            height="14"
            rx="3"
            fill="#ffffff"
            stroke="rgb(var(--color-charcoal))"
            strokeWidth="1.8"
          />
          <rect x="37" y="23" width="2.5" height="6" rx="1" fill="rgb(var(--color-charcoal))" />
          <rect x="16" y="22" width="6" height="8" rx="1.5" fill="rgb(var(--color-gold))" />
          <circle cx="28" cy="26" r="1.5" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'boundaries':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.18)" />
          <path
            d="M26 15c-5 2.5-9 2-9 8 0 8 5 12 9 13 4-1 9-5 9-13 0-6-4-5.5-9-8z"
            fill="#ffffff"
            stroke="rgb(var(--color-sage-dark))"
            strokeWidth="2"
          />
          <path
            d="M21 25.5h10"
            stroke="rgb(var(--color-sage-dark))"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'circadian':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.18)" />
          <path
            d="M31 14a11 11 0 1 0 7 18 9.5 9.5 0 0 1-7-18z"
            fill="rgb(var(--color-dusty-blue-dark))"
          />
          <circle cx="36" cy="17" r="1.5" fill="rgb(var(--color-gold))" />
          <circle cx="17" cy="15" r="1.2" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'anxiety':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.18)" />
          <path
            d="M26 38c-8.5-5.5-12-10-12-14.5a6.5 6.5 0 0 1 12-3.2A6.5 6.5 0 0 1 38 23.5c0 4.5-3.5 9-12 14.5z"
            fill="rgb(var(--color-dusty-blue-dark))"
          />
          <path
            d="M20 26.5q3-2.5 6 0t6 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'siblings':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.18)" />
          <circle cx="20" cy="22" r="5" fill="rgb(var(--color-dusty-blue-dark))" />
          <path d="M12 37a8 8 0 0 1 16 0z" fill="rgb(var(--color-dusty-blue-dark))" />
          <circle cx="33" cy="24" r="4.5" fill="rgb(var(--color-gold))" />
          <path d="M25 37a7.5 7.5 0 0 1 15 0z" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'digital':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.18)" />
          <rect
            x="15"
            y="17"
            width="22"
            height="15"
            rx="2.5"
            fill="#ffffff"
            stroke="rgb(var(--color-charcoal))"
            strokeWidth="1.8"
          />
          <line
            x1="21"
            y1="36"
            x2="31"
            y2="36"
            stroke="rgb(var(--color-charcoal))"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="26" cy="24.5" r="3" fill="rgb(var(--color-sage-dark))" />
        </svg>
      );
    case 'generational':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-gold) / 0.18)" />
          <path
            d="M26 15l2.8 6 6.5.6-4.8 4.5 1.3 6.5-5.8-3.4-5.8 3.4 1.3-6.5-4.8-4.5 6.5-.6z"
            fill="rgb(var(--color-gold))"
            stroke="rgb(var(--color-charcoal))"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'coparenting':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.18)" />
          <circle cx="19" cy="21" r="5" fill="rgb(var(--color-sage-dark))" />
          <circle cx="33" cy="21" r="5" fill="rgb(var(--color-dusty-blue-dark))" />
          <path
            d="M13 36c0-3.5 3.5-6.5 7.5-6.5s7.5 3 7.5 6.5"
            fill="none"
            stroke="rgb(var(--color-sage-dark))"
            strokeWidth="1.8"
          />
          <path
            d="M26.5 36c0-3 3-5.5 6.5-5.5s6.5 2.5 6.5 5.5"
            fill="none"
            stroke="rgb(var(--color-dusty-blue-dark))"
            strokeWidth="1.8"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function PackageFitQuizModal({
  isOpen,
  onClose,
  onSelectPackage,
}: PackageFitQuizModalProps): JSX.Element | null {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState<number>(1);
  const [selectedFocusIds, setSelectedFocusIds] = useState<string[]>(
    preservedAdvisoryState.selectedFocusIds
  );
  const [selectedScopeId, setSelectedScopeId] = useState<string>(
    preservedAdvisoryState.selectedScopeId
  );
  const [selectedCadenceId, setSelectedCadenceId] = useState<string>(
    preservedAdvisoryState.selectedCadenceId
  );
  const [chosenPackageId, setChosenPackageId] = useState<string | null>(
    preservedAdvisoryState.chosenPackageId
  );

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    preservedAdvisoryState = {
      selectedFocusIds,
      selectedScopeId,
      selectedCadenceId,
      chosenPackageId,
    };
  }, [selectedFocusIds, selectedScopeId, selectedCadenceId, chosenPackageId]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      dialogRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleFocus = (id: string) => {
    setSelectedFocusIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((item) => item !== id) : prev) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1 && selectedFocusIds.length > 0) {
      setStep(2);
    } else if (step === 2 && selectedScopeId && selectedCadenceId) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      onClose();
    } else {
      setStep((s) => Math.max(1, s - 1));
    }
  };

  const recommendation = getAdvisoryRecommendation(
    selectedScopeId,
    selectedCadenceId,
    selectedFocusIds
  );

  const effectivePackageId = chosenPackageId || recommendation.recommendedPackage.id;
  const effectivePkg =
    coachingPackages.find((p) => p.id === effectivePackageId) || recommendation.recommendedPackage;

  const lastSelectedFocus = advisoryFocusAreas.find(
    (a) => a.id === selectedFocusIds[selectedFocusIds.length - 1]
  );
  const activeClinicalNote = lastSelectedFocus
    ? lastSelectedFocus.clinicalNote
    : 'Clinical Confidentiality: Mai tailors each advisory protocol specifically to your family’s dynamic and developmental milestones.';

  const handleSelectAndProceed = () => {
    onSelectPackage(effectivePkg);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-charcoal/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisory-modal-title"
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-beige bg-white p-3.5 shadow-2xl focus:outline-none sm:p-5"
      >
        {/* Header: Elevated, executive advisory framing */}
        <div className="flex items-start justify-between gap-3 border-b border-beige/80 pb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-sage-dark">
              <ShieldCheck className="h-3.5 w-3.5 text-sage-dark" />
              <span>Confidential Advisory Assessment</span>
            </div>
            <h2
              id="advisory-modal-title"
              className="font-serif text-lg font-bold leading-tight text-charcoal sm:text-2xl"
            >
              Determine Your Family’s Advisory Scope
            </h2>
            <p className="mt-0.5 text-[11px] text-warm-gray sm:text-xs">
              A clinical diagnostic to align your family objectives with the appropriate advisory depth and clinician access.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === n ? 'w-8 bg-sage-dark' : step > n ? 'w-4 bg-sage/60' : 'w-4 bg-beige'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold tabular-nums text-warm-gray">{step} of 3</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close diagnostic"
              className="rounded-full p-1.5 text-warm-gray transition hover:bg-ivory hover:text-charcoal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="mt-3 min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                className="space-y-2.5"
              >
                <div>
                  <h3 className="font-serif text-sm font-semibold text-charcoal sm:text-base">
                    Core Clinical & Developmental Priorities
                  </h3>
                  <p className="text-[11px] text-warm-gray sm:text-xs">
                    Select the key dynamics where your family requires structured guidance. Most clients select two or three.
                  </p>
                </div>

                {/* 3x3 Grid of Advisory Focus Areas */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {advisoryFocusAreas.map((area) => {
                    const isSelected = selectedFocusIds.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleFocus(area.id)}
                        className={`relative flex items-center gap-2.5 rounded-2xl border p-2 pr-6 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gold/60 sm:p-2.5 sm:pr-7 ${
                          isSelected
                            ? 'border-sage-dark bg-sage/10 shadow-xs'
                            : 'border-beige bg-ivory/50 hover:border-sand hover:bg-white'
                        }`}
                      >
                        <span className="shrink-0">
                          {renderAdvisorySvg(area, 'h-7 w-7 sm:h-8 sm:w-8')}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold leading-tight text-charcoal sm:text-[13px]">
                            {area.title}
                          </span>
                          <span className="mt-0.5 hidden truncate text-[10.5px] leading-snug text-warm-gray sm:block">
                            {area.sub}
                          </span>
                        </span>
                        <span
                          className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? 'border-sage-dark bg-sage-dark text-white'
                              : 'border-sand bg-white text-transparent'
                          }`}
                        >
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Clinical Note Callout */}
                <div className="flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold/15 px-3 py-2 text-charcoal">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-charcoal">
                    <Sparkles className="h-3 w-3 fill-charcoal" />
                  </span>
                  <p className="line-clamp-2 text-[11px] leading-snug text-charcoal">
                    {activeClinicalNote}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div>
                  <h3 className="font-serif text-sm font-semibold text-charcoal sm:text-base">
                    Engagement Scope & Preferred Pacing
                  </h3>
                  <p className="text-[11px] text-warm-gray sm:text-xs">
                    Select the advisory depth and between-consultation support architecture tailored to your schedule.
                  </p>
                </div>

                {/* Section A: Scope of Advisory */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-charcoal sm:text-sm">
                    1. Scope of Clinical Intervention
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
                    {advisoryScopes.map((scope) => {
                      const isSelected = selectedScopeId === scope.id;
                      return (
                        <button
                          key={scope.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedScopeId(scope.id)}
                          className={`flex flex-col rounded-xl border p-2 text-left transition-all ${
                            isSelected
                              ? 'border-sage-dark bg-sage/10 ring-1 ring-sage-dark/40 shadow-2xs'
                              : 'border-beige bg-white hover:border-sand hover:bg-ivory/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-charcoal">{scope.title}</span>
                            <span className="shrink-0 rounded-full bg-sage/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-sage-dark">
                              {scope.duration}
                            </span>
                          </div>
                          <span className="mt-0.5 text-[10.5px] leading-snug text-warm-gray">
                            {scope.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Cadence & Advisory Touchpoints */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-charcoal sm:text-sm">
                    2. Support Architecture Between Consultations
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
                    {advisoryCadences.map((cadence) => {
                      const isSelected = selectedCadenceId === cadence.id;
                      return (
                        <button
                          key={cadence.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedCadenceId(cadence.id)}
                          className={`flex flex-col rounded-xl border p-2 text-left transition-all ${
                            isSelected
                              ? 'border-sage-dark bg-sage/10 ring-1 ring-sage-dark/40 shadow-2xs'
                              : 'border-beige bg-white hover:border-sand hover:bg-ivory/50'
                          }`}
                        >
                          <span className="text-xs font-bold text-charcoal leading-tight">
                            {cadence.label}
                          </span>
                          <span className="mt-1 text-[10px] leading-snug text-warm-gray">
                            {cadence.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pacing Guarantee */}
                <div className="flex items-center gap-2 rounded-xl border border-beige bg-ivory/60 px-3 py-2 text-[11px] text-warm-gray">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-sage-dark" />
                  <span>
                    Executive Scheduling: Sessions offer total autonomy. You can pace, schedule, or reschedule with 24 hours notice.
                  </span>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                className="space-y-2.5"
              >
                <div>
                  <h3 className="font-serif text-sm font-semibold text-charcoal sm:text-base">
                    Tailored Advisory Recommendation
                  </h3>
                  <p className="text-[11px] text-warm-gray sm:text-xs">
                    Calibrated specifically to your family’s developmental priorities and requested pacing.
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-12 sm:gap-4">
                  {/* Left Column: Summary of Diagnostic Inputs (4 cols) */}
                  <div className="rounded-2xl border border-beige bg-ivory/40 p-2.5 text-xs sm:col-span-4 sm:p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray">
                      Diagnostic Summary
                    </span>
                    <div className="mt-2 space-y-2 divide-y divide-beige text-[11px]">
                      <div className="pt-1">
                        <span className="font-semibold text-charcoal block">Focus Priorities:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedFocusIds.map((id) => {
                            const area = advisoryFocusAreas.find((a) => a.id === id);
                            return (
                              <span
                                key={id}
                                className="rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-medium text-sage-dark"
                              >
                                {area?.title || id}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pt-1.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-charcoal block">Intervention Scope:</span>
                          <span className="text-warm-gray">
                            {advisoryScopes.find((s) => s.id === selectedScopeId)?.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[10px] font-bold text-sage-dark underline hover:text-charcoal"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="pt-1.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-charcoal block">Advisory Architecture:</span>
                          <span className="text-warm-gray">
                            {advisoryCadences.find((c) => c.id === selectedCadenceId)?.label}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[10px] font-bold text-sage-dark underline hover:text-charcoal"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Recommended Advisory Container (8 cols) */}
                  <div className="space-y-2 sm:col-span-8">
                    <div className="rounded-2xl border border-sage/40 bg-sage/10 p-3 shadow-xs">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sage-dark">
                          Recommended Advisory Container
                        </span>
                        <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[9.5px] font-bold text-sage-dark">
                          {effectivePkg.sessions} Private Consultations
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-serif text-base font-bold text-charcoal sm:text-lg">
                          {effectivePkg.title}
                        </div>
                        <div className="text-sm font-bold text-charcoal">
                          {effectivePkg.price.toLocaleString()} EGP
                        </div>
                      </div>

                      {/* Clinical Rationale */}
                      <p className="mt-1.5 text-[11px] leading-relaxed text-charcoal/90 sm:text-xs">
                        {recommendation.rationale}
                      </p>

                      {/* Deliverables Checklist */}
                      <div className="mt-2 space-y-1 border-t border-sage/20 pt-2 text-[10.5px] text-charcoal sm:text-[11px]">
                        {recommendation.deliverables.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 shrink-0 text-sage-dark stroke-[3]" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* 5-Tier Scope Switcher */}
                      <div className="mt-2.5 border-t border-sage/20 pt-2">
                        <span className="block text-[9.5px] font-semibold text-warm-gray mb-1">
                          Adjust engagement tier anytime:
                        </span>
                        <div className="grid grid-cols-5 gap-1">
                          {coachingPackages.map((pkg) => {
                            const isCurrent = pkg.id === effectivePackageId;
                            return (
                              <button
                                key={pkg.id}
                                type="button"
                                onClick={() => setChosenPackageId(pkg.id)}
                                className={`rounded-lg border px-1 py-1 text-center transition-all ${
                                  isCurrent
                                    ? 'border-sage-dark bg-white font-bold text-sage-dark shadow-2xs ring-1 ring-sage/30'
                                    : 'border-beige bg-white/70 text-charcoal hover:bg-white text-[10px]'
                                }`}
                              >
                                <span className="block text-[10px] leading-tight truncate font-semibold">
                                  {pkg.title.replace(' Package', '').replace(' Transformation', '')}
                                </span>
                                <span className="block text-[8.5px] text-warm-gray">
                                  {pkg.sessions} {pkg.sessions === 1 ? 'sess' : 'sess'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10.5px] text-warm-gray">
                      <Lock className="h-3 w-3 text-sage-dark shrink-0" />
                      <span>
                        Strict Discretion: All consultations and client records remain completely privileged and confidential.
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="mt-3 flex shrink-0 items-center justify-between border-t border-beige pt-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-beige bg-white px-4 py-1.5 text-xs font-semibold text-warm-gray transition hover:border-sand hover:text-charcoal sm:px-5 sm:py-2"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {step === 1 && selectedFocusIds.length === 0 && (
              <span className="text-xs text-warm-gray font-medium">
                Select at least one priority
              </span>
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 1 && selectedFocusIds.length === 0}
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-sage-dark px-5 py-1.5 text-xs font-bold text-white transition hover:bg-sage disabled:opacity-40 disabled:cursor-not-allowed shadow-xs sm:px-6 sm:py-2 sm:text-sm"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSelectAndProceed}
                className="inline-flex items-center gap-2 rounded-full bg-sage-dark px-5 py-1.5 text-xs font-bold text-white transition hover:bg-sage shadow-xs sm:px-6 sm:py-2 sm:text-sm"
              >
                <span>Confirm & Select {effectivePkg.title}</span>
                <Check className="h-4 w-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
