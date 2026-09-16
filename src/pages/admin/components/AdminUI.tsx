import type { ReactNode } from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

export const StatCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'sage',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  tone?: 'sage' | 'amber' | 'rose' | 'sky';
}): JSX.Element => {
  const toneClasses: Record<string, string> = {
    sage: 'bg-sage text-white',
    amber: 'bg-amber-400 text-white',
    rose: 'bg-rose-400 text-white',
    sky: 'bg-sky-500 text-white',
  };

  return (
    <div className="rounded-[28px] border border-beige/80 bg-white p-5 shadow-sm shadow-stone-200/60">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">
          Live
        </span>
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-warm-gray">{label}</p>
      <p className="mt-2 font-serif text-3xl text-charcoal">{value}</p>
      <p className="mt-2 text-sm leading-6 text-warm-gray">{detail}</p>
    </div>
  );
};

export const Panel = ({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): JSX.Element => (
  <section className={`rounded-[30px] border border-beige/80 bg-white p-6 shadow-sm shadow-stone-200/60 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 font-serif text-2xl text-charcoal">{title}</h2>
      </div>
      {action}
    </div>
    <div className="mt-6">{children}</div>
  </section>
);

export const InsightChip = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className="rounded-2xl border border-beige bg-cream px-4 py-3">
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">{label}</p>
    <p className="mt-1 text-sm font-medium text-charcoal">{value}</p>
  </div>
);

export const ProgressBar = ({ value, tone = 'sage' }: { value: number; tone?: 'sage' | 'amber' | 'sky' | 'rose' }): JSX.Element => {
  const barTone: Record<string, string> = {
    sage: 'bg-sage',
    amber: 'bg-amber-400',
    sky: 'bg-sky-500',
    rose: 'bg-rose-400',
  };

  return (
    <div className="h-2.5 rounded-full bg-beige">
      <div className={`h-2.5 rounded-full ${barTone[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
};

export const EmptyPanel = ({
  title,
  description,
}: {
  title: string;
  description: string;
}): JSX.Element => (
  <div className="rounded-[24px] border border-dashed border-beige bg-cream px-6 py-10 text-center">
    <p className="font-serif text-2xl text-charcoal">{title}</p>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-warm-gray">{description}</p>
  </div>
);

export const QuickAction = ({
  label,
  description,
}: {
  label: string;
  description: string;
}): JSX.Element => (
  <button
    type="button"
    className="group flex w-full items-start justify-between rounded-[24px] border border-beige bg-cream px-4 py-4 text-left transition hover:-translate-y-0.5 hover:bg-white"
  >
    <div>
      <p className="text-sm font-medium text-charcoal">{label}</p>
      <p className="mt-1 text-sm leading-6 text-warm-gray">{description}</p>
    </div>
    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-warm-gray transition group-hover:text-sage-dark" />
  </button>
);