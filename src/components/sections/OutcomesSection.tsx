import AnimatedSection from '../AnimatedSection';

const outcomes = [
  { before: 'Reactive & overwhelmed', after: 'Grounded in hard moments' },
  { before: 'Guilt after every snap', after: 'Repair without shame' },
  { before: 'Walking on eggshells', after: 'Calmer, safer connection' },
];

export default function OutcomesSection() {
  return (
    <section className="bg-sage/8 py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <p className="text-sm font-medium text-sage-dark">What shifts with support</p>
          <h2 className="mt-3 font-serif text-3xl text-charcoal md:text-4xl">Not perfection — progress you can feel</h2>
        </AnimatedSection>

        <div className="mt-12 space-y-6">
          {outcomes.map((item, index) => (
            <AnimatedSection key={item.before} delay={index * 0.08}>
              <div className="grid items-center gap-4 rounded-2xl bg-ivory/70 px-6 py-5 md:grid-cols-[1fr_auto_1fr] md:gap-8 md:px-8">
                <p className="text-sm text-warm-gray line-through decoration-beige md:text-right">{item.before}</p>
                <span className="hidden text-sage md:block" aria-hidden>
                  →
                </span>
                <p className="font-medium text-charcoal">{item.after}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
