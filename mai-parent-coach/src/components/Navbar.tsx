import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Heart, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Courses', href: '/courses' },
  { label: 'Blog', href: '/blog' },
  { label: 'Resources', href: '/resources' },
  { label: 'Community', href: '/community' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-ivory/95 backdrop-blur-md shadow-sm py-3'
          : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center group-hover:bg-sage-dark transition-colors">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif text-xl text-charcoal tracking-tight">
              Mai <span className="text-sage-dark">Elbadawy</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-300 relative',
                  location.pathname === link.href
                    ? 'text-sage-dark'
                    : 'text-warm-gray hover:text-charcoal'
                )}
              >
                {link.label}
                {location.pathname === link.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-sage rounded-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-beige bg-ivory px-5 py-2.5 text-sm font-medium text-charcoal transition-all duration-300 hover:bg-cream"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
            <Link
              to="/booking"
              className="bg-sage text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-sage-dark transition-all duration-300 hover:shadow-lg"
            >
              Book a Session
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-charcoal"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-ivory/98 backdrop-blur-md border-t border-beige shadow-lg">
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'block text-base font-medium py-2',
                  location.pathname === link.href
                    ? 'text-sage-dark'
                    : 'text-warm-gray'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              className="mt-4 flex items-center justify-center gap-2 rounded-full border border-beige bg-ivory px-5 py-3 text-sm font-medium text-charcoal"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
            <Link
              to="/booking"
              className="block bg-sage text-white px-5 py-3 rounded-full text-center text-sm font-medium mt-4"
            >
              Book a Session
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
