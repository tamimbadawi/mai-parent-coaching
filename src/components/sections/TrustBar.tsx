import { Award, Lock, Users, Video } from 'lucide-react';

const items = [
  { icon: Users, label: '500+ families supported' },
  { icon: Award, label: 'Doctorate in child psychology' },
  { icon: Video, label: 'Secure online sessions' },
  { icon: Lock, label: 'Fully confidential' },
];

export default function TrustBar() {
  return (
    <section aria-label="Trust signals" className="border-y border-beige/60 bg-cream/80">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="flex items-center gap-3 md:justify-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage-dark">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium leading-snug text-charcoal">{item.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
