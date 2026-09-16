import AnimatedSection from '../ui/AnimatedSection';

const pains = [
  {
    title: 'Running on empty',
    text: 'You love your children deeply — but you are exhausted, overstimulated, and guilt-ridden every time you need rest.',
  },
  {
    title: 'Moments you regret',
    text: 'Meltdowns spiral fast. You react in ways you swore you never would, then replay it all night.',
  },
  {
    title: 'Walking on eggshells',
    text: 'You tiptoe around big emotions — yours and theirs — because you are not sure what will help.',
  },
];

export default function PainPointsSection() {
  return (
    <section id="how-i-help" className="bg-ivory py-28 lg:py-36">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-2xl">
          <p className="text-sm font-medium text-sage-dark">If this sounds familiar</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal md:text-4xl lg:text-[2.6rem]">
            You are not alone — and you are not the problem.
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <AnimatedSection delay={0.1}>
            <blockquote className="border-l-2 border-sage pl-6 font-serif text-2xl leading-relaxed text-charcoal md:text-3xl">
              Most parents I work with are doing their best in impossible conditions. They do not need more shame —
              they need support that actually fits real life.
            </blockquote>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="space-y-8">
            {pains.map((pain, index) => (
              <div key={pain.title} className="flex gap-4">
                <span className="mt-1 font-serif text-lg text-sage-dark/70">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-semibold text-charcoal">{pain.title}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-warm-gray">{pain.text}</p>
                </div>
              </div>
            ))}
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
