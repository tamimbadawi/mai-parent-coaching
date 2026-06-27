import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Heart, LogIn, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
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

          <div className="hidden lg:flex items-center gap-3">
            {!user ? (
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-beige bg-ivory px-4 py-2.5 text-sm font-medium text-charcoal transition-all duration-300 hover:bg-cream"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            ) : null}
            <Link
              to="/booking"
              className="bg-sage text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-sage-dark transition-all duration-300 hover:shadow-lg"
            >
              Book a Session
            </Link>
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((value) => !value)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white"
                  aria-label="Open profile menu"
                >
                  {profile?.full_name ? profile.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : user.email?.[0].toUpperCase()}
                </button>
                {isProfileMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-beige bg-ivory p-3 shadow-xl">
                    <div className="px-2 py-1">
                      <p className="text-sm font-medium text-charcoal">{profile?.full_name ?? 'Member'}</p>
                      <p className="text-xs text-warm-gray">{user.email}</p>
                    </div>
                    <div className="my-2 h-px bg-beige" />
                    <Link to="/dashboard" className="block rounded-xl px-2 py-2 text-sm text-warm-gray hover:bg-cream">My Dashboard</Link>
                    <Link to="/dashboard/courses" className="block rounded-xl px-2 py-2 text-sm text-warm-gray hover:bg-cream">My Courses</Link>
                    <Link to="/dashboard/profile" className="block rounded-xl px-2 py-2 text-sm text-warm-gray hover:bg-cream">Profile Settings</Link>
                    <div className="my-2 h-px bg-beige" />
                    <button type="button" onClick={() => void signOut()} className="block w-full rounded-xl px-2 py-2 text-left text-sm text-terracotta hover:bg-cream">Sign Out</button>
                  </div>
                ) : null}
              </div>
            ) : null}
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
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setIsLoginOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="mt-4 flex items-center justify-center gap-2 rounded-full border border-beige bg-ivory px-5 py-3 text-sm font-medium text-charcoal"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            ) : (
              <>
                <Link to="/dashboard" className="mt-4 block rounded-full bg-cream px-5 py-3 text-sm font-medium text-charcoal">My Dashboard</Link>
                <button type="button" onClick={() => void signOut()} className="block w-full rounded-full border border-beige px-5 py-3 text-sm font-medium text-charcoal">Sign Out</button>
              </>
            )}
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

      {isLoginOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] border border-beige bg-ivory p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sage/10 px-3 py-1 text-sm font-medium text-sage-dark">
                  <Sparkles className="h-4 w-4" />
                  Welcome back
                </div>
                <h3 className="mt-3 font-serif text-2xl text-charcoal">Choose your next step</h3>
                <p className="mt-2 text-sm leading-6 text-warm-gray">
                  Access your coaching space, save your progress, and stay connected with thoughtful support.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className="text-sm text-warm-gray transition-colors hover:text-charcoal"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-2xl border border-beige bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10 text-sage-dark">
                  <LogIn className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-semibold text-charcoal">Returning member</h4>
                <p className="mt-2 text-sm leading-6 text-warm-gray">
                  Sign in to continue your journey and revisit your resources.
                </p>
                <span className="mt-4 inline-flex text-sm font-medium text-sage-dark">Log in</span>
              </button>

              <button
                type="button"
                className="rounded-2xl border border-sage/20 bg-sage/5 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-white">
                  <UserRound className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-semibold text-charcoal">New member</h4>
                <p className="mt-2 text-sm leading-6 text-warm-gray">
                  Join the community and unlock support tailored to your goals.
                </p>
                <span className="mt-4 inline-flex text-sm font-medium text-sage-dark">Create account</span>
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-beige/80 bg-cream/50 px-4 py-3 text-sm text-warm-gray">
              Coming soon: secure sign-in and account creation will be connected to Supabase Auth.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
