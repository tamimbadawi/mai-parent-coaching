import { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { discoveryTopics } from '../../data/content';
import { cn } from '../../lib/utils';

interface GroupCoachingViewProps {
  isReturningClient?: boolean;
  onSelectDiscovery: () => void;
}

export function GroupCoachingView({
  isReturningClient: _isReturningClient = false,
  onSelectDiscovery,
}: GroupCoachingViewProps): JSX.Element {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(discoveryTopics[0]?.id ?? 'emotions');
  const activeTopic = discoveryTopics.find((t) => t.id === selectedTopicId) ?? discoveryTopics[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
      {/* Column 2 Equivalent: Group Topics (4–8 Parents) */}
      <div className="flex flex-col justify-between rounded-2xl border border-beige bg-white p-3.5 shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 border-b border-beige/80 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-md bg-dusty-blue/20 text-[10px] font-bold text-dusty-blue-dark">
                2
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">
                Circle Topics
              </span>
            </div>
            <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[9.5px] font-bold text-charcoal">
              Coming Soon
            </span>
          </div>

          <p className="text-[11px] text-warm-gray leading-snug">
            Intimate circles exploring one common parenting challenge together, guided by Mai.
          </p>

          {/* 3x3 Compact Topic Chips */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {discoveryTopics.map((topic) => {
              const sel = topic.id === selectedTopicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={cn(
                    'rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-semibold transition-all leading-tight',
                    sel
                      ? 'border-dusty-blue bg-dusty-blue text-white shadow-2xs'
                      : 'border-beige/80 bg-cream/50 text-charcoal hover:border-dusty-blue/40 hover:bg-dusty-blue/10',
                  )}
                >
                  <span className="truncate block">{topic.title.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Active Topic Preview Box */}
          {activeTopic && (
            <div className="mt-2.5 rounded-xl border border-dusty-blue/30 bg-dusty-blue/10 p-2.5 text-xs text-charcoal">
              <p className="font-serif font-bold text-dusty-blue-dark text-xs leading-snug">
                {activeTopic.title}
              </p>
              <p className="text-[10.5px] text-soft-gray mt-0.5">{activeTopic.sub}</p>
              <p className="text-[11px] text-warm-gray mt-1 leading-relaxed">{activeTopic.note}</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-beige/80 pt-2 text-[10px] font-medium text-dusty-blue-dark">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            <span>Strictly 4–8 Parents</span>
          </span>
          <span>Flexible Group Times</span>
        </div>
      </div>

      {/* Column 3 Equivalent: How Circles Work & Next Step */}
      <div className="flex flex-col justify-between rounded-2xl border border-beige bg-white p-3.5 shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 border-b border-beige/80 pb-2 mb-2.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-md bg-sage/20 text-[10px] font-bold text-sage-dark">
              3
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal">
              How Circles Work
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="rounded-xl border border-beige/80 bg-cream/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1 font-semibold text-charcoal text-[11.5px]">
                <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
                <span>1. Join an Upcoming Circle</span>
              </div>
              <p className="text-[11px] text-warm-gray leading-relaxed">
                Join 4–8 parents on a shared topic. Mai sets dates collaboratively once 4 enroll.
              </p>
            </div>

            <div className="rounded-xl border border-beige/80 bg-cream/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1 font-semibold text-charcoal text-[11.5px]">
                <HeartHandshake className="h-3.5 w-3.5 text-terracotta-dark" />
                <span>2. Start Your Own Circle</span>
              </div>
              <p className="text-[11px] text-warm-gray leading-relaxed">
                Bring 4+ friends or school parents on any topic from Mai's list for a private circle.
              </p>
            </div>
          </div>

          <div className="mt-2.5 rounded-xl border border-beige bg-cream/70 p-2.5 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-soft-gray">Format</span>
              <span className="font-semibold text-charcoal">60 min Weekly Google Meet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-soft-gray">Circle Size</span>
              <span className="font-medium text-charcoal">4 to 8 parents maximum</span>
            </div>
            <div className="flex justify-between">
              <span className="text-soft-gray">Privacy</span>
              <span className="font-medium text-sage-dark">Emails kept strictly private</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={onSelectDiscovery}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-dusty-blue py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-dusty-blue-dark"
          >
            <span>Explore Circles on a Discovery Call</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <p className="mt-1 text-center text-[10px] text-soft-gray">
            We'll discuss your topic during our 30-min call and reserve your place.
          </p>
        </div>
      </div>
    </div>
  );
}
