import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, Lock, Loader2, Heart } from 'lucide-react';
import {
  discoveryTopics,
  intakeNeeds,
  intakeDurations,
  suggestPackage,
  coachingPackages,
} from '../../data/content';
import type { DiscoveryIntake } from '../../types';

export interface DiscoveryIntakeModalProps {
  isOpen: boolean;
  dateLabel: string;
  timeLabel: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (intake: DiscoveryIntake) => void;
}

let preservedIntakeState: {
  topics: string[];
  need: string;
  duration: string;
  lastTopicId: string | null;
  chosenPackageId: string | null;
} = {
  topics: [],
  need: '',
  duration: '',
  lastTopicId: null,
  chosenPackageId: null,
};

export function renderTopicSvg(id: string, iconClass = 'h-9 w-9') {
  switch (id) {
    case 'emotions':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.2)" />
          <path d="M15 30a7 7 0 0 1 2-13.7A9 9 0 0 1 34 19a6 6 0 0 1 1 11.9z" fill="rgb(var(--color-sage))" />
          <path d="M27 31l-4 7h5l-3 7" fill="none" stroke="rgb(var(--color-gold))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'burnout':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-gold) / 0.2)" />
          <rect x="12" y="18" width="26" height="16" rx="4" fill="#fff" stroke="rgb(var(--color-charcoal))" strokeWidth="2" />
          <rect x="38" y="23" width="3" height="6" rx="1" fill="rgb(var(--color-charcoal))" />
          <rect x="15" y="21" width="6" height="10" rx="2" fill="rgb(var(--color-sage))" />
        </svg>
      );
    case 'family':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.2)" />
          <circle cx="19" cy="21" r="6" fill="rgb(var(--color-sage))" />
          <path d="M10 38a9 9 0 0 1 18 0z" fill="rgb(var(--color-sage))" />
          <circle cx="34" cy="24" r="5" fill="rgb(var(--color-gold))" />
          <path d="M26 38a8 8 0 0 1 16 0z" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'sleep':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.2)" />
          <path d="M31 13a12 12 0 1 0 8 19 10 10 0 0 1-8-19z" fill="rgb(var(--color-dusty-blue))" />
          <circle cx="36" cy="16" r="1.8" fill="rgb(var(--color-gold))" />
          <circle cx="16" cy="14" r="1.4" fill="rgb(var(--color-gold))" />
          <circle cx="40" cy="24" r="1.2" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'anxiety':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.2)" />
          <path d="M26 39c-9-6-13-11-13-16a7 7 0 0 1 13-3.5A7 7 0 0 1 39 23c0 5-4 10-13 16z" fill="rgb(var(--color-dusty-blue))" />
          <path d="M20 26q3-3 6 0t6 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'screens':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.2)" />
          <rect x="14" y="16" width="24" height="17" rx="3" fill="#fff" stroke="rgb(var(--color-charcoal))" strokeWidth="2" />
          <line x1="21" y1="37" x2="31" y2="37" stroke="rgb(var(--color-charcoal))" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="24.5" r="3.5" fill="rgb(var(--color-dusty-blue))" />
        </svg>
      );
    case 'limits':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.2)" />
          <path d="M26 14c-5 2.5-9 2-9 8 0 8 5 12 9 13 4-1 9-5 9-13 0-6-4-5.5-9-8z" fill="#fff" stroke="rgb(var(--color-sage))" strokeWidth="2" />
          <path d="M21 24.5h10" stroke="rgb(var(--color-sage))" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'confidence':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-gold) / 0.2)" />
          <path d="M26 15l3 6.5 7 .6-5 4.8 1.4 7-6.4-3.6-6.4 3.6 1.4-7-5-4.8 7-.6z" fill="rgb(var(--color-gold))" stroke="rgb(var(--color-charcoal))" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'teens':
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.2)" />
          <circle cx="19" cy="21" r="5" fill="rgb(var(--color-sage))" />
          <circle cx="33" cy="21" r="5" fill="rgb(var(--color-dusty-blue))" />
          <path d="M13 36c0-3.5 3.5-6.5 7.5-6.5s7.5 3 7.5 6.5" fill="none" stroke="rgb(var(--color-sage))" strokeWidth="2" />
          <path d="M26.5 36c0-3 3-5.5 6.5-5.5s6.5 2.5 6.5 5.5" fill="none" stroke="rgb(var(--color-dusty-blue))" strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 52 52" className={iconClass} aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-cream))" />
          <circle cx="26" cy="26" r="12" fill="rgb(var(--color-sage))" />
        </svg>
      );
  }
}

export function DiscoveryIntakeModal({
  isOpen,
  dateLabel,
  timeLabel,
  submitting,
  error,
  onClose,
  onSubmit,
}: DiscoveryIntakeModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState<number>(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(preservedIntakeState.topics);
  const [selectedNeed, setSelectedNeed] = useState<string>(preservedIntakeState.need);
  const [selectedDuration, setSelectedDuration] = useState<string>(preservedIntakeState.duration);
  const [lastTopicId, setLastTopicId] = useState<string | null>(preservedIntakeState.lastTopicId);
  const [chosenPackageId, setChosenPackageId] = useState<string | null>(preservedIntakeState.chosenPackageId);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Sync state to preserved module state so re-opening preserves answers
  useEffect(() => {
    preservedIntakeState = {
      topics: selectedTopics,
      need: selectedNeed,
      duration: selectedDuration,
      lastTopicId,
      chosenPackageId,
    };
  }, [selectedTopics, selectedNeed, selectedDuration, lastTopicId, chosenPackageId]);

  // Trap focus and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the dialog on open
    setTimeout(() => {
      dialogRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
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
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((t) => t !== id);
        setLastTopicId(next.length > 0 ? next[next.length - 1] : null);
        return next;
      } else {
        setLastTopicId(id);
        return [...prev, id];
      }
    });
  };

  const handleNext = () => {
    if (step === 1 && selectedTopics.length > 0) {
      setStep(2);
    } else if (step === 2 && selectedNeed && selectedDuration) {
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

  const suggestedPkg = suggestPackage(selectedNeed, selectedDuration);
  const effectivePackageId = chosenPackageId || suggestedPkg?.id || 'growth';
  const effectivePkg = coachingPackages.find((p) => p.id === effectivePackageId) || suggestedPkg;

  const handleFinalSubmit = () => {
    if (submitting) return;
    onSubmit({
      topics: selectedTopics,
      need: selectedNeed,
      duration: selectedDuration,
      suggestedPackage: effectivePackageId,
    });
  };

  const lastTopicObj = discoveryTopics.find((t) => t.id === lastTopicId);
  const currentNote = lastTopicObj
    ? lastTopicObj.note
    : 'Whatever you pick, there are no wrong answers. Mai will take it from here.';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-charcoal/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-modal-title"
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-beige bg-white p-4 shadow-xl focus:outline-none sm:p-6"
      >
        {/* Header: one row — title on the left, progress + close on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sage-dark">
              Discovery Call
            </div>
            <h2
              id="intake-modal-title"
              className="font-serif text-xl font-bold leading-tight text-charcoal sm:text-2xl"
            >
              A quick note for Mai
            </h2>
            <p className="mt-0.5 text-xs text-warm-gray">
              {dateLabel} · {timeLabel} · Takes 1 minute
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === n ? 'w-8 bg-sage' : step > n ? 'w-5 bg-sage/60' : 'w-5 bg-beige'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium tabular-nums text-warm-gray">{step} of 3</span>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-full p-1.5 text-warm-gray transition hover:bg-ivory hover:text-charcoal disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Step {step} of 3
        </p>

        {/* Step Content */}
        <div className="mt-4 min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div>
                  <h3 className="font-serif text-base font-semibold text-charcoal sm:text-lg">
                    What feels heaviest at home right now?
                  </h3>
                  <p className="text-xs text-warm-gray">
                    Tap whatever fits your family. Most parents pick two or three.
                  </p>
                </div>

                {/* 9 topics: compact side-by-side tiles so the screen never scrolls */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {discoveryTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleTopic(topic.id)}
                        className={`relative flex items-center gap-2 rounded-xl border p-2 pr-6 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold/60 sm:gap-2.5 sm:p-2.5 sm:pr-7 ${
                          isSelected
                            ? 'border-sage-dark bg-sage/10 shadow-xs'
                            : 'border-beige bg-ivory/60 hover:border-sand hover:bg-white'
                        }`}
                      >
                        <span className="shrink-0">
                          {renderTopicSvg(topic.id, 'h-7 w-7 sm:h-9 sm:w-9')}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold leading-tight text-charcoal sm:text-[13px]">
                            {topic.title}
                          </span>
                          <span className="mt-0.5 hidden truncate text-[11px] leading-snug text-warm-gray sm:block">
                            {topic.sub}
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

                {/* Yellow Note Box */}
                <div className="flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold/15 px-3 py-2 text-charcoal">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-charcoal">
                    <Heart className="h-3 w-3 fill-charcoal" />
                  </span>
                  <p className="line-clamp-2 text-xs leading-snug text-charcoal">{currentNote}</p>
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
                className="space-y-4"
              >
                <div>
                  <h3 className="font-serif text-base font-semibold text-charcoal sm:text-lg">
                    Just two quick questions
                  </h3>
                  <p className="text-xs text-warm-gray">
                    This helps me understand what you're navigating so I can prepare specifically for you.
                  </p>
                </div>

                {/* Question 1 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-charcoal">
                    What would bring you the most relief right now?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {intakeNeeds.map((need) => {
                      const isSelected = selectedNeed === need.id;
                      return (
                        <button
                          key={need.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedNeed(need.id)}
                          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-gold/60 ${
                            isSelected
                              ? 'border border-sage-dark bg-sage/20 text-sage-dark shadow-2xs'
                              : 'border border-beige bg-white text-charcoal hover:border-sand hover:bg-ivory/50'
                          }`}
                        >
                          {need.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question 2 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-charcoal">
                    How long has this felt difficult?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {intakeDurations.map((duration) => {
                      const isSelected = selectedDuration === duration.id;
                      return (
                        <button
                          key={duration.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedDuration(duration.id)}
                          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-gold/60 ${
                            isSelected
                              ? 'border border-sage-dark bg-sage/20 text-sage-dark shadow-2xs'
                              : 'border border-beige bg-white text-charcoal hover:border-sand hover:bg-ivory/50'
                          }`}
                        >
                          {duration.label}
                        </button>
                      );
                    })}
                  </div>
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
                className="space-y-3"
              >
                <div>
                  <h3 className="font-serif text-base font-semibold text-charcoal sm:text-lg">
                    Ready for our conversation?
                  </h3>
                  <p className="text-xs text-warm-gray">
                    Here is what I'll review before we speak together.
                  </p>
                </div>

                {/* Two columns on wider screens: answers left, suggestion right */}
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
                {/* Summary rows */}
                <div className="divide-y divide-beige border-y border-beige text-xs sm:text-sm">
                  {/* Bringing you here */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-semibold text-warm-gray block text-xs">
                        What you're navigating
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTopics.map((topicId) => {
                          const topic = discoveryTopics.find((t) => t.id === topicId);
                          return (
                            <span
                              key={topicId}
                              className="rounded-full bg-sage/20 px-2.5 py-0.5 text-xs font-semibold text-sage-dark"
                            >
                              {topic?.title || topicId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-semibold text-sage-dark underline underline-offset-2 hover:text-charcoal"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Wants */}
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-warm-gray text-xs mr-2">What you need most:</span>
                      <span className="font-medium text-charcoal">
                        {intakeNeeds.find((n) => n.id === selectedNeed)?.label || selectedNeed}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-sage-dark underline underline-offset-2 hover:text-charcoal"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Felt hard for */}
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-warm-gray text-xs mr-2">
                        How long it's felt hard:
                      </span>
                      <span className="font-medium text-charcoal">
                        {intakeDurations.find((d) => d.id === selectedDuration)?.label ||
                          selectedDuration}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-sage-dark underline underline-offset-2 hover:text-charcoal"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                {/* Highlighted suggestion card with interactive adjustment */}
                {effectivePkg && (
                  <div className="space-y-1.5 rounded-2xl border border-sage/30 bg-sage/10 p-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sage-dark">
                        {chosenPackageId ? 'Your Selected Pathway:' : 'Suggested Pathway For Your Family:'}
                      </div>
                      <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[9px] font-semibold text-sage-dark">
                        {chosenPackageId ? 'Adjusted' : 'Recommended'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-serif text-base sm:text-lg font-bold leading-tight text-charcoal">
                        {effectivePkg.title}
                      </div>
                      <div className="text-xs text-warm-gray">
                        {effectivePkg.sessions} {effectivePkg.sessions === 1 ? 'session' : 'sessions'}
                        {effectivePkg.sessions > 1 && ` over ~${effectivePkg.useWithinWeeks} weeks`}
                      </div>
                    </div>

                    {/* Quick package switcher so the client can change the suggestion */}
                    <div className="pt-0.5">
                      <p className="text-[10px] text-warm-gray mb-1">
                        Prefer another pace? Tap to change:
                      </p>
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

                    <div className="pt-0.5 text-[11px] font-medium text-charcoal">
                      We'll confirm the best fit together on our call — zero pressure.
                    </div>
                  </div>
                )}

                {/* Today's booking price line */}
                <div className="text-xs font-semibold text-charcoal">
                  Today you're reserving: <span className="text-sage-dark">Discovery Call · 30 min · EGP 500</span>
                </div>

                {/* Privacy Line */}
                <div className="flex items-start gap-2 text-[11px] leading-snug text-warm-gray">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0 text-sage-dark" />
                  <span>
                    Only I see your answers. They are kept completely private and confidential.
                  </span>
                </div>
                </div>
                </div>

                {/* Error alert if any */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                  >
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Nav */}
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-beige pt-3">
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="rounded-full border border-beige bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-warm-gray transition hover:border-sand hover:text-charcoal disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {step === 1 && selectedTopics.length === 0 && (
              <span className="text-xs text-warm-gray font-medium">
                Pick at least one to continue
              </span>
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={
                  (step === 1 && selectedTopics.length === 0) ||
                  (step === 2 && (!selectedNeed || !selectedDuration))
                }
                onClick={handleNext}
                className="rounded-full bg-sage px-6 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-sage-dark disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-sage-dark disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{submitting ? 'Reserving your time...' : 'Confirm My Discovery Call'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function ConfettiBurst() {
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const style = getComputedStyle(document.documentElement);
    const parseVar = (varName: string, fallback: string) => {
      const v = style.getPropertyValue(varName).trim();
      return v ? (v.startsWith('#') || v.startsWith('rgb') ? v : `rgb(${v})`) : fallback;
    };

    const colors = [
      parseVar('--color-sage', '#92CFCA'),
      parseVar('--color-sage-dark', '#4A6B5D'),
      parseVar('--color-gold', '#F4D721'),
      parseVar('--color-dusty-blue', '#8FA3B8'),
    ];

    const count = 70;
    const particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: width / 2,
        y: height * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      };
    });

    let animId: number;
    let frame = 0;
    const maxFrames = 120;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - frame / maxFrames);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
