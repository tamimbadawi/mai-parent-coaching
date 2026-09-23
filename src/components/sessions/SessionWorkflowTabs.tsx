import React from 'react';
import { Clock, PlayCircle, CheckCircle2 } from 'lucide-react';

export type WorkflowStep = 'before' | 'session' | 'after';

interface SessionWorkflowTabsProps {
  activeStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  openActionItemsCount?: number;
  hasRecording?: boolean;
  hasPostNotes?: boolean;
}

export const SessionWorkflowTabs: React.FC<SessionWorkflowTabsProps> = ({
  activeStep,
  onSelectStep,
  openActionItemsCount = 0,
  hasRecording = false,
  hasPostNotes = false,
}) => {
  const steps: {
    key: WorkflowStep;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: React.ReactNode;
  }[] = [
    {
      key: 'before',
      label: 'Before',
      description: 'Prep & Family Recap',
      icon: Clock,
      badge: openActionItemsCount > 0 ? (
        <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.2 border border-amber-300">
          {openActionItemsCount} tasks
        </span>
      ) : null,
    },
    {
      key: 'session',
      label: 'Session',
      description: 'Raw Capture & Recording',
      icon: PlayCircle,
      badge: hasRecording ? (
        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-1.5 py-0.2 border border-emerald-300">
          Recording
        </span>
      ) : null,
    },
    {
      key: 'after',
      label: 'After',
      description: 'Write-up & Commitments',
      icon: CheckCircle2,
      badge: hasPostNotes ? (
        <span className="rounded-full bg-sage/30 text-sage-dark text-[10px] font-semibold px-1.5 py-0.2 border border-sage/40">
          Done
        </span>
      ) : null,
    },
  ];

  return (
    <div className="flex items-center justify-between border-b border-beige/80 bg-[#faf8f4] px-4 py-2 shrink-0">
      <div className="inline-flex rounded-xl bg-white p-1 border border-beige/80 shadow-2xs">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.key;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onSelectStep(step.key)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-charcoal text-white shadow-xs font-semibold'
                  : 'text-charcoal/70 hover:text-charcoal hover:bg-beige/30'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sage' : 'text-warm-gray'}`} />
              <span>{step.label}</span>
              {step.badge}
            </button>
          );
        })}
      </div>

      <span className="hidden sm:inline-block text-[11px] text-warm-gray font-medium">
        {steps.find((s) => s.key === activeStep)?.description}
      </span>
    </div>
  );
};
