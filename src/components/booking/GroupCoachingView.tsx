import { Users, Sparkles, ArrowRight, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';
import { discoveryTopics } from '../../data/content';

interface GroupCoachingViewProps {
  isReturningClient?: boolean;
  onSelectDiscovery: () => void;
}

export function GroupCoachingView({
  isReturningClient = false,
  onSelectDiscovery,
}: GroupCoachingViewProps): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-beige bg-cream/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-dusty-blue/20 px-2.5 py-0.5 text-[11px] font-semibold text-dusty-blue-dark">
              <Users className="h-3 w-3" />
              <span>Small Circles</span>
            </div>
            <h2 className="mt-1 font-serif text-lg sm:text-xl font-semibold text-charcoal">
              Learn &amp; Grow with Other Parents
            </h2>
            <p className="mt-0.5 text-xs text-warm-gray leading-relaxed max-w-xl">
              Small, intimate circles of 4 to 8 parents exploring a shared parenting theme together, guided by me.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold/30 px-3 py-1 text-xs font-bold text-charcoal border border-gold/40">
              Coming Soon
            </span>
            {!isReturningClient && (
              <button
                type="button"
                onClick={onSelectDiscovery}
                className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
              >
                <span>Book Discovery Call</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* 4–8 Rule Banner */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-start gap-2 rounded-xl border border-beige bg-white/80 p-2.5 text-xs text-charcoal">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage-dark" />
            <div>
              <p className="font-semibold text-charcoal">Just 4 to 8 Parents</p>
              <p className="text-[11px] text-warm-gray mt-0.5">
                Keeping our circles small means there is plenty of room for your questions and stories. You'll always feel heard, safe, and never lost in a crowd.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-beige bg-white/80 p-2.5 text-xs text-charcoal">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-dusty-blue-dark" />
            <div>
              <p className="font-semibold text-charcoal">Times that Work for You</p>
              <p className="text-[11px] text-warm-gray mt-0.5">
                Once a small group forms, we choose a day and time together that fits everyone's family routine.
              </p>
            </div>
          </div>
        </div>

        {/* Independent Cohort Note */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-dusty-blue/30 bg-dusty-blue/10 p-3 text-xs text-charcoal">
          <Users className="h-4 w-4 shrink-0 text-dusty-blue-dark mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-dusty-blue-dark">A Circle of Parents Who Understand:</strong> Parenting can feel <em>deeply lonely</em> when you're in the thick of it. In these small groups (just 4 to 8 parents), we meet weekly to share openly, learn practical tools, and realize <u>you are not alone or failing</u> in your everyday struggles.
            {isReturningClient ? (
              <span className="block mt-1 text-dusty-blue-dark/90">
                If you'd like to join an upcoming circle or create one with parents you know, just let me know what you'd love to focus on and I'll save your spot.
              </span>
            ) : (
              <span className="block mt-1 text-dusty-blue-dark/90">
                <strong>Small parent circles operate completely separately from 1:1 coaching.</strong> During our <strong>introductory Discovery Call</strong>, we can see if joining a group feels right for your family and connect you with parents facing the <em>very same moments</em>.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two Ways to Join */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-sage/30 bg-sage/8 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-sage-dark" />
            <h4 className="font-serif text-sm font-bold text-charcoal">1. Join an Upcoming Circle</h4>
          </div>
          <p className="text-xs text-warm-gray leading-relaxed">
            Reserve your spot in an upcoming topic circle. As soon as a few parents join, we’ll pick our dates together and get started.
          </p>
        </div>

        <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <HeartHandshake className="h-4 w-4 text-terracotta-dark" />
            <h4 className="font-serif text-sm font-bold text-charcoal">2. Start Your Own Group</h4>
          </div>
          <p className="text-xs text-warm-gray leading-relaxed">
            Have friends, family, or fellow school parents who want to learn together? Gather 4 or more parents, pick a topic, and I’ll host a private circle just for you.
          </p>
        </div>
      </div>

      {/* The 9 Confirmed Topics */}
      <div className="rounded-2xl border border-beige bg-white p-4 sm:p-5 shadow-xs">
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sage-dark">
            Group Topics
          </div>
          <h3 className="font-serif text-base sm:text-lg font-semibold text-charcoal">
            What We Explore Together
          </h3>
          <p className="text-xs text-warm-gray">
            Every circle focuses on a common parenting challenge so you walk away with clear, gentle strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {discoveryTopics.map((topic) => (
            <div
              key={topic.id}
              className="rounded-xl border border-beige/80 bg-cream/50 p-2.5 transition hover:bg-cream"
            >
              <p className="text-xs font-bold text-charcoal leading-snug">{topic.title}</p>
              <p className="text-[11px] text-warm-gray mt-0.5 line-clamp-1">{topic.sub}</p>
              <p className="text-[10px] text-soft-gray mt-1 line-clamp-2 leading-relaxed">{topic.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Under The Tab CTA */}
      {!isReturningClient && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-dusty-blue/30 bg-dusty-blue/10 p-4 sm:p-5">
          <div>
            <h4 className="font-serif text-sm sm:text-base font-bold text-charcoal">
              Interested in joining or exploring a parent circle?
            </h4>
            <p className="text-xs text-warm-gray mt-0.5">
              Connect with Mai on a <strong>Discovery Call</strong> so we can discuss your family's needs and explore joining an upcoming circle.
            </p>
          </div>
          <button
            type="button"
            onClick={onSelectDiscovery}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-dusty-blue px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-dusty-blue-dark"
          >
            <span>Explore Group Circles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
