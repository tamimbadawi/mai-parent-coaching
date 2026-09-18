import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CalendarDays, Clock, User, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BookingStepperProps {
  hasSelectedType: boolean;
  hasSelectedDate: boolean;
  hasSelectedTime: boolean;
  hasDetails: boolean;
  className?: string;
}

interface StepConfig {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

// Gentle audio ping chime using Web Audio API
const playPingSound = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle high chime note (B5 -> E6 harmonic)
    osc.frequency.setValueAtTime(987.77, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // AudioContext blocked or not supported - silently ignore
  }
};

export const BookingStepper = ({
  hasSelectedType,
  hasSelectedDate,
  hasSelectedTime,
  hasDetails,
  className,
}: BookingStepperProps): JSX.Element => {
  // Determine active step
  const activeStepIndex = !hasSelectedType
    ? 0
    : !hasSelectedDate
    ? 1
    : !hasSelectedTime
    ? 2
    : !hasDetails
    ? 3
    : 4; // all done

  const steps: StepConfig[] = [
    {
      id: 'session',
      label: 'Session',
      done: hasSelectedType,
      active: activeStepIndex === 0,
      icon: Sparkles,
    },
    {
      id: 'date',
      label: 'Date',
      done: hasSelectedDate,
      active: activeStepIndex === 1,
      icon: CalendarDays,
    },
    {
      id: 'time',
      label: 'Time',
      done: hasSelectedTime,
      active: activeStepIndex === 2,
      icon: Clock,
    },
    {
      id: 'details',
      label: 'Details',
      done: hasDetails,
      active: activeStepIndex === 3,
      icon: User,
    },
  ];

  return (
    <div
      className={cn(
        'relative flex items-center rounded-full border border-beige/80 bg-white/95 px-2.5 py-1 shadow-xs backdrop-blur-md sm:px-3.5 sm:py-1.5',
        className
      )}
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <StepItem step={step} />

              {!isLast && (
                <div className="relative h-[2px] w-2 sm:w-4 md:w-5 overflow-hidden rounded-full bg-beige/60">
                  <motion.div
                    className="absolute inset-0 bg-sage"
                    initial={false}
                    animate={{
                      scaleX: step.done ? 1 : 0,
                      originX: 0,
                    }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface StepItemProps {
  step: StepConfig;
}

const StepItem = ({ step }: StepItemProps): JSX.Element => {
  const IconComponent = step.icon;
  const prevDoneRef = useRef(step.done);
  const [justFinished, setJustFinished] = useState(false);

  // Trigger ping animation and audio ping when transitioning from false -> true
  useEffect(() => {
    if (!prevDoneRef.current && step.done) {
      setJustFinished(true);
      playPingSound();
      const timer = setTimeout(() => {
        setJustFinished(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
    prevDoneRef.current = step.done;
  }, [step.done]);

  return (
    <div className="relative flex items-center gap-1 sm:gap-1.5">
      {/* Icon Badge Container */}
      <div className="relative flex items-center justify-center">
        {/* Active Claude-style ambient breathing aura */}
        {step.active && (
          <>
            <motion.div
              className="pointer-events-none absolute -inset-1 rounded-full bg-sage/25 blur-[1.5px]"
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.8, 0.35],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="pointer-events-none absolute -inset-0.5 rounded-full border border-sage/50"
              animate={{
                rotate: [0, 360],
                scale: [0.96, 1.05, 0.96],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          </>
        )}

        {/* Completion Ping Rings */}
        <AnimatePresence>
          {justFinished && (
            <>
              {/* Primary fast expanding ping ring */}
              <span className="pointer-events-none absolute inset-0 -m-1 rounded-full border-2 border-sage bg-sage/35 animate-ping" />

              {/* Secondary smooth Framer Motion expanding ripple wave */}
              <motion.span
                key="ripple-wave"
                initial={{ scale: 0.8, opacity: 0.95 }}
                animate={{ scale: 2.6, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full border border-sage-dark bg-sage/20"
              />

              {/* Glowing sparkle dots */}
              <motion.div
                key="sparkle-orbit"
                initial={{ rotate: 0, scale: 0.5, opacity: 1 }}
                animate={{ rotate: 180, scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="pointer-events-none absolute -inset-1.5 flex items-center justify-between"
              >
                <span className="h-1 w-1 rounded-full bg-sage-dark shadow-[0_0_4px_rgba(111,143,122,0.9)]" />
                <span className="h-1 w-1 rounded-full bg-terracotta shadow-[0_0_4px_rgba(217,144,110,0.9)]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Badge circle */}
        <motion.div
          className={cn(
            'relative flex h-6 w-6 sm:h-6.5 sm:w-6.5 items-center justify-center rounded-full transition-all duration-300',
            step.done
              ? 'bg-sage text-white shadow-xs ring-1 ring-sage/40'
              : step.active
              ? 'border-[1.5px] border-sage bg-white text-sage-dark shadow-xs ring-2 ring-sage/20'
              : 'border border-beige bg-cream/70 text-warm-gray/60'
          )}
          animate={
            justFinished
              ? { scale: [1, 1.3, 0.9, 1.05, 1], rotate: [0, -8, 8, 0] }
              : step.active
              ? { scale: [1, 1.05, 1] }
              : { scale: 1 }
          }
          transition={
            justFinished
              ? { duration: 0.5, ease: 'backOut' }
              : step.active
              ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        >
          <AnimatePresence mode="wait">
            {step.done ? (
              <motion.div
                key="check-icon"
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
              >
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </motion.div>
            ) : (
              <motion.div
                key="step-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <IconComponent
                  className={cn(
                    'h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200',
                    step.active && 'stroke-[2.2] text-sage-dark'
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Step Label */}
      <span
        className={cn(
          'text-[11px] sm:text-xs transition-colors duration-200',
          step.done
            ? 'font-medium text-sage-dark'
            : step.active
            ? 'font-semibold text-charcoal'
            : 'hidden text-warm-gray/60 sm:inline font-normal'
        )}
      >
        {step.label}
      </span>
    </div>
  );
};
