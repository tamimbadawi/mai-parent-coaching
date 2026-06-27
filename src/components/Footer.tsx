import { Link } from 'react-router-dom';
import { Heart, Instagram, Youtube, Facebook } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-cream border-t border-beige">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif text-xl text-charcoal">
                Dr. <span className="text-sage-dark">[Name]</span>
              </span>
            </div>
            <p className="text-warm-gray text-sm leading-relaxed">
              Helping parents raise emotionally healthy children while healing themselves through evidence-based coaching and support.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="#" className="w-9 h-9 rounded-full bg-beige flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white transition-all duration-300">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-beige flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white transition-all duration-300">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-beige flex items-center justify-center text-warm-gray hover:bg-sage hover:text-white transition-all duration-300">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-charcoal mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: 'About', href: '/about' },
                { label: 'Services', href: '/services' },
                { label: 'Courses', href: '/courses' },
                { label: 'Blog', href: '/blog' },
                { label: 'Resources', href: '/resources' },
                { label: 'Community', href: '/community' },
              ].map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-warm-gray text-sm hover:text-sage-dark transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-charcoal mb-4">Services</h4>
            <ul className="space-y-3">
              {[
                'Parent Coaching',
                'Burnout Recovery',
                'Nervous System Reset',
                'Child Behaviour Support',
                'Workshops',
                'Online Courses',
              ].map((service) => (
                <li key={service}>
                  <Link to="/services" className="text-warm-gray text-sm hover:text-sage-dark transition-colors">
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-charcoal mb-4">Stay Connected</h4>
            <p className="text-warm-gray text-sm mb-4">
              Weekly insights, parenting tips, and exclusive resources delivered to your inbox.
            </p>
            {subscribed ? (
              <div className="bg-sage/10 text-sage-dark px-4 py-3 rounded-xl text-sm">
                Thank you for subscribing!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full px-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-sage text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-sage-dark transition-all duration-300"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-beige">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-soft-gray text-sm">
              {new Date().getFullYear()} Dr. [Name]. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-soft-gray text-sm hover:text-warm-gray transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-soft-gray text-sm hover:text-warm-gray transition-colors">Terms & Conditions</Link>
              <Link to="/cookies" className="text-soft-gray text-sm hover:text-warm-gray transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
