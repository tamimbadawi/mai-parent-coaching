import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  CalendarDays,
  BookOpen,
  UserRound,
  Sparkles,
  RotateCcw,
  Plus,
  LogOut,
  Menu,
  X,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

/* ── Inspiring Parent & Healing Quotes Collection ── */
const INSPIRING_QUOTES: { text: string; author?: string; theme: string }[] = [
  { text: 'A regulated nervous system is the greatest gift you can offer your child.', author: 'Dr. Mona Delahooke', theme: 'Co-Regulation' },
  { text: "You don't have to be a perfect parent to be a wonderful one.", author: 'Mai Elbadawy', theme: 'Self-Compassion' },
  { text: 'When little people are overwhelmed by big emotions, it is our job to share our calm, not join their chaos.', author: 'L.R. Knost', theme: 'Calmness' },
  { text: 'Connection before correction. Trust always precedes growth.', author: 'Parenting Wisdom', theme: 'Connection' },
  { text: 'Behind every challenging behavior is an unmet need or a dysregulated nervous system.', author: 'Mai Elbadawy', theme: 'Understanding' },
  { text: 'Taking care of yourself is the first step in taking care of your family.', author: 'Evidence-based Practice', theme: 'Recovery' },
  { text: 'Children do not experience what we say; they experience how we are.', author: 'Parent Coaching Insight', theme: 'Presence' },
  { text: 'Rupture and repair is where genuine resilience is built, not in constant perfection.', author: 'Attachment Science', theme: 'Resilience' },
  { text: 'Pause before you react. That small breath is where peaceful parenting lives.', author: 'Mindful Parenting', theme: 'Mindfulness' },
  { text: 'Your calm is contagious. Your presence is your child’s safe haven.', author: 'Mai Elbadawy', theme: 'Safe Space' },
  { text: 'Every small intentional choice you make rewires your family pattern for generations.', author: 'Neurobiology of Parenting', theme: 'Generational Healing' },
  { text: 'You are learning alongside your child. Give yourself permission to be a work in progress.', author: 'Parent Coaching', theme: 'Growth' },
  { text: 'Feelings are not problems to fix; they are signals to listen to and hold space for.', author: 'Emotional Coaching', theme: 'Empathy' },
  { text: 'Consistency, warmth, and firm boundaries create the safest container for childhood.', author: 'Child Psychology', theme: 'Boundaries' },
  { text: 'Be gentle with yourself. You are doing hard, sacred, transformative work every single day.', author: 'Mai Elbadawy', theme: 'Encouragement' },
  { text: 'Listening without judgment is the highest form of love you can give your child.', author: 'Parent Insight', theme: 'Active Listening' },
  { text: 'A peaceful home starts with a compassionate parent.', author: 'Mindful Family', theme: 'Compassion' },
  { text: 'When you validate feelings, resistance naturally melts into cooperation.', author: 'Coaching Principle', theme: 'Validation' },
  { text: 'Rest is not a reward you earn; it is the fuel your patience depends on.', author: 'Burnout Recovery', theme: 'Self-Care' },
  { text: 'Small moments of attunement throughout the day build lifelong secure attachment.', author: 'Attachment Theory', theme: 'Attunement' },
  { text: 'Your child doesn’t need you to know everything; they just need to know you are with them.', author: 'Mai Elbadawy', theme: 'Presence' },
  { text: 'Every bedtime reset and morning embrace is a fresh beginning for your home.', author: 'Parenting Hope', theme: 'New Beginnings' },
  { text: 'The way we speak to our children becomes their inner voice.', author: 'Peggy O’Mara', theme: 'Words Matter' },
  { text: 'Progress is not linear. Celebrate every step of patience, no matter how quiet.', author: 'Mai Elbadawy', theme: 'Patience' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  activeTab?: 'overview' | 'sessions' | 'courses' | 'profile';
  onTabChange?: (tab: 'overview' | 'sessions') => void;
  sessionCount?: number;
  courseCount?: number;
  action?: React.ReactNode;
}

export const DashboardLayout = ({
  children,
  title,
  subtitle,
  activeTab: explicitActiveTab,
  onTabChange,
  sessionCount,
  courseCount,
  action,
}: DashboardLayoutProps): JSX.Element => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, enrollments, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Smart quote selection: avoid repeating the same quote continuously
  const [quoteIndex, setQuoteIndex] = useState<number>(() => {
    try {
      const lastIndex = sessionStorage.getItem('mai_last_quote_index');
      let nextIdx = Math.floor(Math.random() * INSPIRING_QUOTES.length);
      if (lastIndex !== null && Number(lastIndex) === nextIdx && INSPIRING_QUOTES.length > 1) {
        nextIdx = (nextIdx + 1) % INSPIRING_QUOTES.length;
      }
      sessionStorage.setItem('mai_last_quote_index', String(nextIdx));
      return nextIdx;
    } catch {
      return 0;
    }
  });

  const nextQuote = (): void => {
    setQuoteIndex((prev) => {
      const next = (prev + 1 + Math.floor(Math.random() * (INSPIRING_QUOTES.length - 2))) % INSPIRING_QUOTES.length;
      try {
        sessionStorage.setItem('mai_last_quote_index', String(next));
      } catch {}
      return next;
    });
  };

  const currentQuote = useMemo(() => INSPIRING_QUOTES[quoteIndex] ?? INSPIRING_QUOTES[0], [quoteIndex]);

  // Typewriter / write-in animation effect
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;
    const fullText = currentQuote.text;

    // Speed: ~18ms per character for an organic, responsive writing feel
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [currentQuote]);

  const firstName = profile?.full_name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'Friend';
  const effectiveCourseCount = courseCount ?? enrollments.length;

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate('/auth/login');
  };

  // Determine active item based on pathname or tab
  const currentTab = explicitActiveTab ?? (
    pathname.includes('/sessions') ? 'sessions' :
    pathname.includes('/courses') ? 'courses' :
    pathname.includes('/profile') ? 'profile' : 'overview'
  );

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-start bg-[#faf8f4] text-charcoal pt-[76px] pb-3.5 px-4 sm:px-6 lg:px-8 antialiased overflow-hidden select-none">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="mx-auto max-w-7xl w-full h-full flex flex-col min-h-0">
        {/* Mobile Header Bar */}
        <div className="mb-2 flex items-center justify-between rounded-xl border border-beige/80 bg-white/90 p-2 shadow-xs lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage/20 text-sage-dark font-serif font-bold text-xs">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal leading-tight">{firstName}</p>
              <p className="text-xs text-warm-gray">Member Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg border border-beige bg-cream/70 p-1.5 text-charcoal hover:bg-cream transition"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch h-full min-h-0 overflow-hidden">
          {/* ── Left Anchored Sidebar (Zero overlap, clean crisp borders) ── */}
          <aside
            className={cn(
              'flex flex-col justify-between overflow-hidden transition-transform duration-300 ease-in-out',
              // Mobile Drawer mode
              'fixed top-0 left-0 z-50 h-full w-[260px] bg-white p-4',
              sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none pointer-events-none',
              // Desktop Anchored Rail mode
              'lg:static lg:z-10 lg:pointer-events-auto lg:h-full lg:w-[240px] xl:w-[250px] lg:shrink-0 lg:translate-x-0 lg:shadow-xs lg:rounded-2xl lg:border lg:border-beige/80 lg:bg-white/95 lg:backdrop-blur-md lg:p-3.5'
            )}
          >
            {/* Zone 1: Member Profile Pill & Navigation */}
            <div className="space-y-2.5">
              {/* Member Pill */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-beige/60 bg-cream/60 px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sage text-white shadow-xs font-serif text-xs font-bold">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-charcoal leading-tight">{firstName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] text-warm-gray font-medium">Member</span>
                    </div>
                  </div>
                </div>
                <Link
                  to="/dashboard/profile"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1 text-warm-gray hover:bg-white hover:text-charcoal transition"
                  title="Profile Settings"
                >
                  <UserRound className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 text-xs">
                <Link
                  to="/dashboard"
                  onClick={() => {
                    if (onTabChange) onTabChange('overview');
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors font-medium text-xs',
                    pathname === '/dashboard' && currentTab === 'overview'
                      ? 'bg-sage/15 text-sage-dark border border-sage/30 shadow-xs'
                      : 'text-warm-gray hover:bg-cream hover:text-charcoal'
                  )}
                >
                  <Compass className="h-4 w-4 shrink-0" />
                  <span>Overview</span>
                </Link>

                <Link
                  to="/dashboard/sessions"
                  onClick={() => {
                    if (onTabChange) onTabChange('sessions');
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors font-medium text-xs',
                    (pathname.includes('/sessions') || (pathname === '/dashboard' && currentTab === 'sessions'))
                      ? 'bg-sage/15 text-sage-dark border border-sage/30 shadow-xs'
                      : 'text-warm-gray hover:bg-cream hover:text-charcoal'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>My Sessions</span>
                  </span>
                  {typeof sessionCount === 'number' && sessionCount > 0 && (
                    <span className="rounded-full bg-sage/20 px-1.5 py-0.2 text-[10px] font-bold text-sage-dark">
                      {sessionCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/dashboard/courses"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2 transition-colors font-medium text-xs',
                    pathname.includes('/courses')
                      ? 'bg-sage/15 text-sage-dark border border-sage/30 shadow-xs'
                      : 'text-warm-gray hover:bg-cream hover:text-charcoal'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>My Courses</span>
                  </span>
                  {effectiveCourseCount > 0 && (
                    <span className="rounded-full bg-sage/20 px-1.5 py-0.2 text-[10px] font-bold text-sage-dark">
                      {effectiveCourseCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/dashboard/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors font-medium text-xs',
                    pathname.includes('/profile')
                      ? 'bg-sage/15 text-sage-dark border border-sage/30 shadow-xs'
                      : 'text-warm-gray hover:bg-cream hover:text-charcoal'
                  )}
                >
                  <UserRound className="h-4 w-4 shrink-0" />
                  <span>Profile Settings</span>
                </Link>
              </nav>
            </div>

            {/* Zone 2: Inspiring Quote Box (Larger font & Typewriter animation) */}
            <div className="my-1.5 relative overflow-hidden rounded-xl border border-sage/30 bg-gradient-to-br from-sage/10 via-cream/80 to-sand/20 p-3 transition-all hover:border-sage/50 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-sage-dark" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sage-dark">
                    {currentQuote.theme}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={nextQuote}
                  className="p-1 text-warm-gray hover:text-sage-dark hover:bg-white/70 rounded-md transition"
                  title="Inspire me with another quote"
                  aria-label="New inspiring quote"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
              <p className="font-serif text-sm italic leading-relaxed text-charcoal/95 min-h-[44px]">
                &ldquo;{displayedText}&rdquo;
                {isTyping && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-sage-dark/70 animate-pulse align-middle" />
                )}
              </p>
              {currentQuote.author && (
                <p className="mt-1 text-[11px] text-warm-gray text-right font-medium truncate">
                  — {currentQuote.author}
                </p>
              )}
            </div>

            {/* Zone 3: Bottom Actions */}
            <div className="pt-2 border-t border-beige/80 space-y-1.5 text-xs shrink-0">
              <Link
                to="/booking"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-between rounded-xl bg-sage px-3 py-2 font-medium text-white shadow-xs hover:bg-sage-dark transition text-xs"
              >
                <span className="flex items-center gap-2 font-semibold text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Book Coaching Call</span>
                </span>
                <Calendar className="h-3.5 w-3.5 opacity-80" />
              </Link>

              <div className="flex items-center justify-between gap-1 pt-0.5 text-xs">
                <Link
                  to="/courses"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-warm-gray hover:text-charcoal hover:bg-cream transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Courses</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-warm-gray hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Sign out of your dashboard"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* ── Main Dashboard Content Workspace (Strict zero-scroll container) ── */}
          <main className="flex-1 min-w-0 w-full h-full min-h-0 flex flex-col justify-between overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
