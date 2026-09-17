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
  const toneClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    sage: { bg: 'bg-sage/10', text: 'text-sage-dark', iconBg: 'bg-sage/15 text-sage-dark' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-700' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-100 text-rose-700' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-700', iconBg: 'bg-sky-100 text-sky-700' },
  };

  const currentTone = toneClasses[tone] || toneClasses.sage;

  return (
    <div className="rounded-2xl border border-beige/80 bg-white p-5 shadow-xs hover:border-beige transition-colors">
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${currentTone.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">
          {label}
        </span>
      </div>
      <p className="mt-4 font-serif text-3xl text-charcoal font-normal">{value}</p>
      <p className="mt-1.5 text-xs text-warm-gray leading-relaxed">{detail}</p>
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
  <section className={`rounded-2xl border border-beige/80 bg-white p-6 shadow-xs ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-beige/50 pb-4">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">{eyebrow}</p>
        ) : null}
        <h2 className="mt-0.5 font-serif text-xl text-charcoal font-normal">{title}</h2>
      </div>
      {action}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

export const InsightChip = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className="rounded-xl border border-beige/70 bg-[#faf8f4] px-3.5 py-2.5">
    <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">{label}</p>
    <p className="mt-0.5 text-xs font-medium text-charcoal">{value}</p>
  </div>
);

export const ProgressBar = ({ value, tone = 'sage' }: { value: number; tone?: 'sage' | 'amber' | 'sky' | 'rose' }): JSX.Element => {
  const barTone: Record<string, string> = {
    sage: 'bg-sage',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
    rose: 'bg-rose-400',
  };

  return (
    <div className="h-2 rounded-full bg-beige/60">
      <div className={`h-2 rounded-full ${barTone[tone] || 'bg-sage'}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
};

export const EmptyPanel = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element => (
  <div className="rounded-2xl border border-dashed border-beige bg-[#faf8f4]/60 px-6 py-10 text-center">
    <p className="font-serif text-xl text-charcoal font-normal">{title}</p>
    <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-warm-gray">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const QuickAction = ({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick?: () => void;
}): JSX.Element => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-start justify-between rounded-xl border border-beige/80 bg-[#faf8f4]/50 px-4 py-3.5 text-left transition hover:bg-white hover:border-beige hover:shadow-xs"
  >
    <div>
      <p className="text-xs font-medium text-charcoal group-hover:text-sage-dark transition-colors">{label}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-warm-gray">{description}</p>
    </div>
    <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-gray transition group-hover:text-sage-dark group-hover:translate-x-0.5" />
  </button>
);
