import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Brain, Sun, Users, Baby, Sparkles, MessageCircle } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import TestimonialCarousel from '../components/TestimonialCarousel';
import CTASection from '../components/CTASection';
import { services, blogPosts } from '../data/content';

const expertise = [
  { icon: Heart, title: 'Child Psychology', description: 'Deep understanding of child development and mental health.' },
  { icon: Users, title: 'Parent Coaching', description: 'Personalized guidance for your unique family journey.' },
  { icon: Sun, title: 'Burnout Recovery', description: 'Compassionate support for mothers running on empty.' },
  { icon: Brain, title: 'Nervous System Regulation', description: 'Science-backed tools for calm and resilience.' },
  { icon: Baby, title: 'Trauma-Informed Parenting', description: 'Breaking cycles and building secure attachments.' },
  { icon: Sparkles, title: 'Emotional Resilience', description: 'Practical tools families can use every day.' },
];

const iconMap: Record<string, React.ElementType> = {
  Heart, Brain, Sun, Users, Baby, Sparkles,
};

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-ivory to-beige/30" />
        <div className="absolute top-20 right-0 w-1/2 h-1/2 bg-sage/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-dusty-blue/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <span className="inline-block text-sage-dark text-sm font-medium tracking-wider uppercase mb-4">
                Child Psychologist & Parent Coach
              </span>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal leading-tight mb-6">
                Helping Parents Raise{' '}
                <span className="text-sage-dark">Emotionally Healthy</span> Children While Healing Themselves
              </h1>
              <p className="text-warm-gray text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
                Evidence-based parenting support, burnout recovery, nervous system healing, and practical coaching for modern families.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Parent and child in a warm, connected moment"
                  className="w-full h-[600px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-ivory rounded-2xl p-6 shadow-lg border border-beige max-w-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-sage" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal text-sm">500+ Families</p>
                    <p className="text-xs text-warm-gray">Supported with care</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Work With Me */}
      <section className="py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Why Work With Me</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              You're Finally in the Right Place
            </h2>
            <p className="text-warm-gray text-lg max-w-2xl mx-auto leading-relaxed">
              You don't have to do this alone. I combine psychology, neuroscience, and compassion to guide you toward the family life you deserve.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {expertise.map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={item.title} delay={i * 0.1}>
                  <div className="bg-cream rounded-2xl p-8 hover:shadow-lg transition-all duration-500 group border border-transparent hover:border-beige">
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center mb-5 group-hover:bg-sage/20 transition-colors">
                      <Icon className="w-6 h-6 text-sage-dark" />
                    </div>
                    <h3 className="font-serif text-xl text-charcoal mb-2">{item.title}</h3>
                    <p className="text-warm-gray leading-relaxed">{item.description}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-terracotta-dark text-sm font-medium tracking-wider uppercase">Services</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              How I Can Support You
            </h2>
            <p className="text-warm-gray text-lg max-w-2xl mx-auto leading-relaxed">
              Personalized coaching and evidence-based support for every stage of your parenting journey.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.slice(0, 3).map((service, i) => {
              const Icon = iconMap[service.icon] || Heart;
              return (
                <AnimatedSection key={service.id} delay={i * 0.1}>
                  <div className="bg-ivory rounded-2xl p-8 h-full flex flex-col hover:shadow-xl transition-all duration-500 border border-beige/50 hover:border-beige">
                    <div className="w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-terracotta-dark" />
                    </div>
                    <h3 className="font-serif text-xl text-charcoal mb-3">{service.title}</h3>
                    <p className="text-warm-gray leading-relaxed mb-6 flex-grow">{service.description}</p>
                    <div className="space-y-2 mb-6">
                      {service.features.slice(0, 3).map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-warm-gray">
                          <div className="w-1.5 h-1.5 rounded-full bg-terracotta" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <Link
                      to="/services"
                      className="text-terracotta-dark font-medium text-sm inline-flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Learn more <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-sage-dark font-medium hover:text-sage transition-colors"
            >
              View all services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Courses Preview */}
      <section className="py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-dusty-blue-dark text-sm font-medium tracking-wider uppercase">Online Courses</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              Learn at Your Own Pace
            </h2>
            <p className="text-warm-gray text-lg max-w-2xl mx-auto leading-relaxed">
              Comprehensive courses designed to fit into your busy life as a parent.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(0, 3).map((post, i) => (
              <AnimatedSection key={post.id} delay={i * 0.1}>
                <Link to={`/blog/${post.id}`} className="group block">
                  <div className="bg-cream rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500 border border-beige/50 hover:border-beige">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 bg-ivory/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-charcoal">
                        {post.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-serif text-lg text-charcoal mb-2 group-hover:text-sage-dark transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-warm-gray text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 mt-4 text-xs text-soft-gray">
                        <span>{post.readTime} read</span>
                        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 text-sage-dark font-medium hover:text-sage transition-colors"
            >
              Browse all courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Testimonials</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              Stories of Transformation
            </h2>
            <p className="text-warm-gray text-lg max-w-2xl mx-auto leading-relaxed">
              Real families, real change. Here's what parents say about working together.
            </p>
          </AnimatedSection>

          <TestimonialCarousel />
        </div>
      </section>

      {/* Free Resources CTA */}
      <CTASection
        title="Start With Free Resources"
        description="Download practical guides, checklists, and worksheets to begin your journey today. No commitment, just support."
        primaryAction={{ label: 'Get Free Resources', href: '/resources' }}
        secondaryAction={{ label: 'Join the Community', href: '/community' }}
        variant="sage"
      />

      {/* Blog Preview */}
      <section className="py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="text-terracotta-dark text-sm font-medium tracking-wider uppercase">From the Blog</span>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mt-3 mb-4">
              Insights & Inspiration
            </h2>
            <p className="text-warm-gray text-lg max-w-2xl mx-auto leading-relaxed">
              Weekly articles on parenting, psychology, and personal growth.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(0, 3).map((post, i) => (
              <AnimatedSection key={post.id} delay={i * 0.1}>
                <Link to={`/blog/${post.id}`} className="group block">
                  <div className="bg-cream rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500 border border-beige/50 hover:border-beige">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 bg-ivory/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-charcoal">
                        {post.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-serif text-lg text-charcoal mb-2 group-hover:text-sage-dark transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-warm-gray text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 mt-4 text-xs text-soft-gray">
                        <span>{post.readTime} read</span>
                        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sage-dark font-medium hover:text-sage transition-colors"
            >
              Read all articles <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-sage/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="font-serif text-3xl md:text-4xl text-charcoal mb-4">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-warm-gray text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Whether you're struggling with burnout, navigating challenging behaviours, or simply want to parent with more confidence, I'm here to walk beside you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/booking"
                className="bg-sage text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 justify-center hover:bg-sage-dark transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                Book Your First Session
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="bg-ivory text-charcoal border border-beige px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 justify-center hover:bg-cream transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4" />
                Send a Message
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
