import { useState } from 'react';
// Contact page
import { Mail, Phone, MapPin, Send, Instagram, Youtube, Facebook, AlertTriangle } from 'lucide-react';
import AnimatedSection from '../components/ui/AnimatedSection';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Contact</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Let's Connect
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Whether you're ready to book, have a question, or just need to know you're not alone — I'm here.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20 bg-ivory">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-8">
              <AnimatedSection>
                <div className="bg-cream rounded-2xl p-8 border border-beige/50">
                  <h3 className="font-serif text-xl text-charcoal mb-6">Get in Touch</h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-sage-dark" />
                      </div>
                      <div>
                        <p className="font-medium text-charcoal text-sm">Email</p>
                        <a href="mailto:hello@drname.com" className="text-warm-gray hover:text-sage-dark transition-colors">
                          hello@drname.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-sage-dark" />
                      </div>
                      <div>
                        <p className="font-medium text-charcoal text-sm">Phone</p>
                        <a href="tel:+1234567890" className="text-warm-gray hover:text-sage-dark transition-colors">
                          +1 (234) 567-890
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-sage-dark" />
                      </div>
                      <div>
                        <p className="font-medium text-charcoal text-sm">Office</p>
                        <p className="text-warm-gray">123 Wellness Street<br />Suite 400<br />New York, NY 10001</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-beige">
                    <p className="font-medium text-charcoal text-sm mb-4">Follow Along</p>
                    <div className="flex gap-3">
                      <a href="#" className="w-10 h-10 rounded-full bg-beige/50 flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white transition-all">
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a href="#" className="w-10 h-10 rounded-full bg-beige/50 flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white transition-all">
                        <Youtube className="w-4 h-4" />
                      </a>
                      <a href="#" className="w-10 h-10 rounded-full bg-beige/50 flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white transition-all">
                        <Facebook className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Emergency Disclaimer */}
              <AnimatedSection delay={0.1}>
                <div className="bg-terracotta/5 rounded-2xl p-6 border border-terracotta/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-charcoal text-sm mb-1">If You're in Crisis</p>
                      <p className="text-warm-gray text-sm">
                        Coaching is not a substitute for emergency mental health services. If you or your child are in crisis, please contact your local emergency services or a crisis helpline immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <AnimatedSection delay={0.15}>
                <div className="bg-cream rounded-2xl p-8 md:p-10 border border-beige/50">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-sage" />
                      </div>
                      <h3 className="font-serif text-2xl text-charcoal mb-2">Message Sent</h3>
                      <p className="text-warm-gray">
                        Thank you for reaching out, {formData.name}. I'll get back to you within 24 hours.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Name</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">Email</label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Subject</label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                        >
                          <option value="">Select a topic</option>
                          <option value="coaching">Parent Coaching</option>
                          <option value="courses">Online Courses</option>
                          <option value="workshops">Workshops</option>
                          <option value="general">General Question</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Message</label>
                        <textarea
                          required
                          rows={5}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all resize-none"
                          placeholder="Tell me what's on your mind..."
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-sage text-white px-8 py-4 rounded-full font-medium hover:bg-sage-dark transition-all inline-flex items-center justify-center gap-2"
                      >
                        Send Message <Send className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
