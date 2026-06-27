import { Award, BookOpen, Heart, GraduationCap, Users, Brain } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import CTASection from '../components/CTASection';

const credentials = [
  { icon: GraduationCap, label: 'Doctorate in Child Psychology' },
  { icon: Award, label: 'Certified Parent Coach' },
  { icon: Brain, label: 'Trauma-Informed Practitioner' },
  { icon: Users, label: '500+ Families Supported' },
  { icon: BookOpen, label: 'Published Researcher' },
  { icon: Heart, label: 'Nervous System Specialist' },
];

const approach = [
  {
    title: 'Evidence-Based',
    description: 'Every strategy I share is grounded in peer-reviewed research from psychology, neuroscience, and attachment theory.',
  },
  {
    title: 'Trauma-Informed',
    description: 'I understand that parenting triggers our own childhood wounds. We heal together, gently and without judgment.',
  },
  {
    title: 'Practical & Realistic',
    description: 'No guilt, no perfectionism. Just tools that work in real families with real chaos, mess, and love.',
  },
  {
    title: 'Compassionate',
    description: 'You are doing better than you think. My role is to help you see your own strengths and build on them.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="relative py-20 bg-cream">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-sage/5 rounded-l-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">About Me</span>
              <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
                A Psychologist, a Coach, and a Mother Who Gets It
              </h1>
              <p className="text-warm-gray text-lg leading-relaxed mb-6">
                I'm a Child Psychologist, Parent Coach, Parenting Educator, Burnout Coach for Mothers, and Nervous System Recovery Coach. My mission is simple: help parents raise emotionally healthy children while also healing themselves.
              </p>
              <p className="text-warm-gray leading-relaxed mb-6">
                I combine psychology, neuroscience, attachment theory, nervous system regulation, emotional intelligence, trauma-informed parenting, and practical everyday strategies. But more than my credentials, what matters is that I truly see you. I know what it's like to feel overwhelmed, to question every decision, to lie awake at night wondering if you're enough.
              </p>
              <p className="text-warm-gray leading-relaxed">
                You are enough. And I'm here to help you believe it.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.2} direction="left">
              <div className="relative">
                <div className="rounded-3xl overflow-hidden shadow-xl">
                  <img
                    src="https://images.pexels.com/photos/3184436/pexels-photo-3184436.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    alt="Professional portrait"
                    className="w-full h-[500px] object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-ivory rounded-2xl p-6 shadow-lg border border-beige">
                  <p className="font-serif text-2xl text-charcoal">10+</p>
                  <p className="text-sm text-warm-gray">Years of Experience</p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-20 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="font-serif text-3xl text-charcoal mb-4">Credentials & Expertise</h2>
            <p className="text-warm-gray max-w-xl mx-auto">
              Rigorous training combined with real-world experience supporting families.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((cred, i) => {
              const Icon = cred.icon;
              return (
                <AnimatedSection key={cred.label} delay={i * 0.08}>
                  <div className="bg-cream rounded-2xl p-6 flex items-center gap-4 hover:shadow-md transition-all duration-300 border border-beige/50 hover:border-beige">
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-sage-dark" />
                    </div>
                    <span className="font-medium text-charcoal">{cred.label}</span>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* My Approach */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-terracotta-dark text-sm font-medium tracking-wider uppercase">My Approach</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              How I Work
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8">
            {approach.map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.1}>
                <div className="bg-ivory rounded-2xl p-8 border border-beige/50 hover:border-beige hover:shadow-lg transition-all duration-500">
                  <h3 className="font-serif text-xl text-charcoal mb-3">{item.title}</h3>
                  <p className="text-warm-gray leading-relaxed">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-20 bg-sage/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <div className="bg-ivory rounded-3xl p-10 md:p-16 shadow-sm border border-beige">
              <Heart className="w-10 h-10 text-sage mx-auto mb-6" />
              <h2 className="font-serif text-2xl md:text-3xl text-charcoal mb-6">
                My Philosophy
              </h2>
              <p className="text-warm-gray text-lg leading-relaxed mb-6">
                I believe that every parent is doing the best they can with the tools they have. There is no such thing as a perfect parent, and striving for perfection only leads to burnout and shame.
              </p>
              <p className="text-warm-gray text-lg leading-relaxed mb-6">
                The most powerful thing you can give your child is a parent who is regulated, present, and kind to themselves. When you heal, your whole family heals.
              </p>
              <p className="text-charcoal font-medium text-lg">
                You don't have to do this alone.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <CTASection
        title="Let's Work Together"
        description="Ready to take the first step toward a calmer, more connected family life? I'd love to meet you."
        primaryAction={{ label: 'Book a Session', href: '/booking' }}
        secondaryAction={{ label: 'Explore Courses', href: '/courses' }}
        variant="sage"
      />
    </div>
  );
}
