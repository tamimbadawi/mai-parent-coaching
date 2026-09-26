import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, Lock, Loader2, Heart } from 'lucide-react';
import {
  discoveryTopics,
  intakeNeeds,
  intakeDurations,
  suggestPackage,
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
} = {
  topics: [],
  need: '',
  duration: '',
  lastTopicId: null,
};

function renderTopicSvg(id: string) {
  switch (id) {
    case 'emotions':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-terracotta) / 0.15)" />
          <path d="M15 30a7 7 0 0 1 2-13.7A9 9 0 0 1 34 19a6 6 0 0 1 1 11.9z" fill="rgb(var(--color-terracotta))" />
          <path d="M27 31l-4 7h5l-3 7" fill="none" stroke="rgb(var(--color-gold))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'burnout':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-gold) / 0.2)" />
          <rect x="12" y="18" width="26" height="16" rx="4" fill="#fff" stroke="rgb(var(--color-charcoal))" strokeWidth="2" />
          <rect x="38" y="23" width="3" height="6" rx="1" fill="rgb(var(--color-charcoal))" />
          <rect x="15" y="21" width="6" height="10" rx="2" fill="rgb(var(--color-terracotta))" />
        </svg>
      );
    case 'family':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.2)" />
          <circle cx="19" cy="21" r="6" fill="rgb(var(--color-sage))" />
          <path d="M10 38a9 9 0 0 1 18 0z" fill="rgb(var(--color-sage))" />
          <circle cx="34" cy="24" r="5" fill="rgb(var(--color-gold))" />
          <path d="M26 38a8 8 0 0 1 16 0z" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'sleep':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.2)" />
          <path d="M31 13a12 12 0 1 0 8 19 10 10 0 0 1-8-19z" fill="rgb(var(--color-dusty-blue))" />
          <circle cx="36" cy="16" r="1.8" fill="rgb(var(--color-gold))" />
          <circle cx="16" cy="14" r="1.4" fill="rgb(var(--color-gold))" />
          <circle cx="40" cy="24" r="1.2" fill="rgb(var(--color-gold))" />
        </svg>
      );
    case 'anxiety':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-terracotta) / 0.15)" />
          <path d="M26 39c-9-6-13-11-13-16a7 7 0 0 1 13-3.5A7 7 0 0 1 39 23c0 5-4 10-13 16z" fill="rgb(var(--color-terracotta-light))" />
          <path d="M20 26q3-3 6 0t6 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'screens':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-dusty-blue) / 0.2)" />
          <rect x="14" y="16" width="24" height="17" rx="3" fill="#fff" stroke="rgb(var(--color-charcoal))" strokeWidth="2" />
          <line x1="21" y1="37" x2="31" y2="37" stroke="rgb(var(--color-charcoal))" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="24.5" r="3.5" fill="rgb(var(--color-dusty-blue))" />
        </svg>
      );
    case 'limits':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-terracotta) / 0.15)" />
          <path d="M26 14c-5 2.5-9 2-9 8 0 8 5 12 9 13 4-1 9-5 9-13 0-6-4-5.5-9-8z" fill="#fff" stroke="rgb(var(--color-terracotta))" strokeWidth="2" />
          <path d="M21 24.5h10" stroke="rgb(var(--color-terracotta))" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'confidence':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-gold) / 0.2)" />
          <path d="M26 15l3 6.5 7 .6-5 4.8 1.4 7-6.4-3.6-6.4 3.6 1.4-7-5-4.8 7-.6z" fill="rgb(var(--color-gold))" stroke="rgb(var(--color-charcoal))" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'teens':
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="rgb(var(--color-sage) / 0.2)" />
          <circle cx="19" cy="21" r="5" fill="rgb(var(--color-sage))" />
          <circle cx="33" cy="21" r="5" fill="rgb(var(--color-dusty-blue))" />
          <path d="M13 36c0-3.5 3.5-6.5 7.5-6.5s7.5 3 7.5 6.5" fill="none" stroke="rgb(var(--color-sage))" strokeWidth="2" />
          <path d="M26.5 36c0-3 3-5.5 6.5-5.5s6.5 2.5 6.5 5.5" fill="none" stroke="rgb(var(--color-dusty-blue))" strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 52 52" className="h-11 w-11" aria-hidden="true">
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

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Sync state to preserved module state so re-opening preserves answers
  useEffect(() => {
    preservedIntakeState = {
      topics: selectedTopics,
      need: selectedNeed,
      duration: selectedDuration,
      lastTopicId,
    };
  }, [selectedTopics, selectedNeed, selectedDuration, lastTopicId]);

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

  const handleFinalSubmit = () => {
    if (submitting) return;
    onSubmit({
      topics: selectedTopics,
      need: selectedNeed,
      duration: selectedDuration,
      suggestedPackage: suggestedPkg?.id || '',
    });
  };

  const lastTopicObj = discoveryTopics.find((t) => t.id === lastTopicId);
  const currentNote = lastTopicObj
    ? lastTopicObj.note
    : 'Whatever you pick, there are no wrong answers. Mai will take it from here.';

  const suggestedPkg = suggestPackage(selectedNeed, selectedDuration);

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
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-beige bg-white p-5 sm:p-7 shadow-xl overflow-y-auto focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sage-dark">
              Discovery Call
            </div>
            <h2
              id="intake-modal-title"
              className="mt-1 font-serif text-2xl sm:text-3xl font-bold leading-tight text-charcoal"
            >
              Tell Mai a little about your family
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-warm-gray">
              {dateLabel} · {timeLabel} · about one minute
            </p>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-warm-gray transition hover:bg-ivory hover:text-charcoal disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step bars */}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          <span
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 1 ? 'w-10 bg-terracotta' : step > 1 ? 'w-7 bg-sage' : 'w-7 bg-beige'
            }`}
          />
          <span
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 2 ? 'w-10 bg-terracotta' : step > 2 ? 'w-7 bg-sage' : 'w-7 bg-beige'
            }`}
          />
          <span
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === 3 ? 'w-10 bg-terracotta' : 'w-7 bg-beige'
            }`}
          />
          <span className="ml-2 text-xs font-medium text-warm-gray tabular-nums">
            {step} of 3
          </span>
        </div>
        <p className="sr-only" aria-live="polite">
          Step {step} of 3
        </p>

        {/* Step Content */}
        <div className="mt-6 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-charcoal">
                    What's bringing you here?
                  </h3>
                  <p className="text-xs sm:text-sm text-warm-gray">
                    Tap everything that fits. Most families pick two or three.
                  </p>
                </div>

                {/* 9 Topics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {discoveryTopics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleTopic(topic.id)}
                        className={`relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold/60 ${
                          isSelected
                            ? 'border-sage-dark bg-sage/10 shadow-xs'
                            : 'border-beige bg-ivory/60 hover:border-sand hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div>{renderTopicSvg(topic.id)}</div>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? 'border-sage-dark bg-sage-dark text-white'
                                : 'border-sand bg-white text-transparent'
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs sm:text-sm font-bold leading-tight text-charcoal">
                            {topic.title}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-snug text-warm-gray">
                            {topic.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Yellow Note Box */}
                <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold/15 p-3 text-charcoal">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-charcoal mt-0.5">
                    <Heart className="h-3.5 w-3.5 fill-charcoal" />
                  </span>
                  <p className="text-xs leading-relaxed text-charcoal">{currentNote}</p>
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
                className="space-y-6"
              >
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-charcoal">
                    Two quick taps
                  </h3>
                  <p className="text-xs sm:text-sm text-warm-gray">
                    This helps Mai understand your situation before the call.
                  </p>
                </div>

                {/* Question 1 */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-charcoal">
                    What would help most right now?
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
                    How long has it felt hard?
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
                className="space-y-5"
              >
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-charcoal">
                    Looks good?
                  </h3>
                  <p className="text-xs sm:text-sm text-warm-gray">
                    This is what Mai will read before your call.
                  </p>
                </div>

                {/* Summary rows */}
                <div className="divide-y divide-beige border-y border-beige text-xs sm:text-sm">
                  {/* Bringing you here */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-semibold text-warm-gray block text-xs">
                        Bringing you here
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
                      <span className="font-semibold text-warm-gray text-xs mr-2">Wants:</span>
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
                        Felt hard for:
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

                {/* Highlighted suggestion card */}
                {suggestedPkg && (
                  <div className="rounded-2xl border border-terracotta/25 bg-terracotta/10 p-4 space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-terracotta-dark">
                      Families like yours usually start with
                    </div>
                    <div className="font-serif text-xl font-bold text-charcoal">
                      {suggestedPkg.title}
                    </div>
                    <div className="text-xs sm:text-sm text-warm-gray">
                      {suggestedPkg.sessions} sessions · EGP {suggestedPkg.price.toLocaleString()}{' '}
                      ({Math.round(suggestedPkg.price / suggestedPkg.sessions).toLocaleString()} each)
                    </div>
                    <div className="pt-1 text-xs font-medium text-charcoal">
                      Mai will confirm the right fit on your call.
                    </div>
                  </div>
                )}

                {/* Today's booking price line */}
                <div className="text-xs sm:text-sm font-semibold text-charcoal">
                  Today you're booking: <span className="text-sage-dark">Discovery Call · 30 min · EGP 500</span>
                </div>

                {/* Privacy Line */}
                <div className="flex items-start gap-2 text-xs text-warm-gray">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-dark" />
                  <span>
                    Only Mai sees your answers. They're stored with your booking and never shared.
                  </span>
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-beige pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="rounded-full border border-beige bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-warm-gray transition hover:border-sand hover:text-charcoal disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {step === 1 && selectedTopics.length === 0 && (
              <span className="text-xs text-terracotta font-medium">
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
                className="rounded-full bg-terracotta px-6 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-terracotta-dark disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-terracotta-dark disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{submitting ? 'Booking...' : 'Book my Discovery Call'}</span>
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
      parseVar('--color-terracotta', '#F1873B'),
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
