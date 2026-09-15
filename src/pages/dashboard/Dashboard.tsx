import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  UserRound,
  Compass,
  Sparkles,
  Play,
  Menu,
  X,
  Calendar,
  Clock,
  Video,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { courses } from '../../data/content';
import { supabase } from '../../lib/supabase';
import type { VideoProgress, Booking } from '../../types';
import { cn } from '../../lib/utils';
import { ClientRescheduleModal } from '../../components/booking/ClientRescheduleModal';
import { ClientCancelModal } from '../../components/booking/ClientCancelModal';

const statusBadgeClasses: Record<Booking['status'], { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed: { label: 'Confirmed', className: 'bg-sage/20 text-sage-dark border-sage/40' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700 border-rose-300' },
  pending_calendar_sync: { label: 'Sync Pending', className: 'bg-purple-100 text-purple-800 border-purple-300' },
};

const Dashboard = (): JSX.Element => {
  const { user, profile, enrollments } = useAuth();
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>('overview');

  // Modal states
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async (): Promise<void> => {
    if (!user) return;
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase() || ''}`)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (!error && data) {
        setUserBookings(data as Booking[]);
      }
    } catch (err) {
      console.warn('Error loading dashboard bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  }, [user]);

  useEffect((): (() => void) => {
    let isMounted = true;

    const loadProgress = async (): Promise<void> => {
      const { data, error } = await supabase.from('video_progress').select('*');
      if (!isMounted) {
        return;
      }
      if (!error) {
        setVideoProgress(data ?? []);
      }
    };

    void loadProgress();
    void fetchBookings();

    return () => {
      isMounted = false;
    };
  }, [user?.id, fetchBookings]);

  const enrolledCourses = useMemo(() => courses.filter((course) => enrollments.some((enrollment) => enrollment.course_id === course.id)), [enrollments]);
  const completedLessons = useMemo(() => videoProgress.filter((item) => item.completed).length, [videoProgress]);
  const hoursWatched = useMemo(() => Math.round((videoProgress.reduce((sum, item) => sum + item.progress_seconds, 0) / 3600) * 10) / 10, [videoProgress]);
  const firstName = profile?.full_name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'friend';

  const upcomingBookings = useMemo(
    () => userBookings.filter((b) => b.status !== 'cancelled'),
    [userBookings]
  );

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-ivory pt-24">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between rounded-2xl border border-beige bg-white px-4 py-3 shadow-sm lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-charcoal">{firstName}</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-xl border border-beige bg-white p-2 text-charcoal"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <aside className={`
          fixed top-0 left-0 z-50 h-full w-[260px] overflow-y-auto bg-white shadow-2xl transition-transform duration-300
          lg:static lg:z-auto lg:h-auto lg:w-64 lg:overflow-visible lg:translate-x-0 lg:shadow-none lg:rounded-[24px] lg:border lg:border-beige lg:bg-white lg:p-4
          p-6
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center gap-3 rounded-2xl bg-cream p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">{firstName}</p>
              <p className="text-xs text-warm-gray">Member dashboard</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setSidebarOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition',
                activeTab === 'overview' ? 'bg-sage/10 font-medium text-sage-dark' : 'text-warm-gray hover:bg-cream'
              )}
            >
              <Compass className="h-4 w-4" /> Overview
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('bookings');
                setSidebarOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition',
                activeTab === 'bookings' ? 'bg-sage/10 font-medium text-sage-dark' : 'text-warm-gray hover:bg-cream'
              )}
            >
              <span className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4" /> Upcoming Sessions
              </span>
              {upcomingBookings.length > 0 && (
                <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[11px] font-bold text-sage-dark">
                  {upcomingBookings.length}
                </span>
              )}
            </button>
            <Link to="/dashboard/courses" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-warm-gray hover:bg-cream">
              <BookOpen className="h-4 w-4" /> My Courses
            </Link>
            <Link to="/dashboard/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-warm-gray hover:bg-cream">
              <UserRound className="h-4 w-4" /> Profile Settings
            </Link>
          </nav>
        </aside>

        <main className="flex-1 space-y-8">
          <section className="rounded-[32px] border border-beige bg-gradient-to-br from-sage/10 to-cream p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-dark">Welcome back</p>
            <h1 className="mt-2 font-serif text-3xl text-charcoal">Welcome back, {firstName}!</h1>
            <p className="mt-3 max-w-2xl text-sm text-warm-gray">
              Manage your course sessions, live coaching schedule, and learning progress in one calm space.
            </p>
          </section>

          {/* Quick Metrics */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
              <p className="text-sm text-warm-gray">Upcoming Sessions</p>
              <p className="mt-3 font-serif text-3xl text-charcoal">{upcomingBookings.length}</p>
            </div>
            <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
              <p className="text-sm text-warm-gray">Enrolled Courses</p>
              <p className="mt-3 font-serif text-3xl text-charcoal">{enrollments.length}</p>
            </div>
            <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
              <p className="text-sm text-warm-gray">Completed Lessons</p>
              <p className="mt-3 font-serif text-3xl text-charcoal">{completedLessons}</p>
            </div>
          </section>

          {/* UPCOMING SESSIONS CARD / TAB */}
          <section className="rounded-[32px] border border-beige bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-charcoal">Upcoming Sessions & Coaching</h2>
                <p className="mt-1 text-xs text-warm-gray">
                  View, reschedule, or cancel your booked calls and course consultations.
                </p>
              </div>
              <Link
                to="/booking"
                className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark"
              >
                <Plus className="h-3.5 w-3.5" /> Book New Session
              </Link>
            </div>

            {loadingBookings ? (
              <div className="mt-6 flex items-center justify-center py-10 text-xs text-soft-gray">
                <span>Loading your appointments...</span>
              </div>
            ) : userBookings.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {userBookings.map((b) => {
                  const badge = statusBadgeClasses[b.status] || statusBadgeClasses.pending;
                  const canModify = b.status !== 'cancelled' && b.status !== 'completed';

                  return (
                    <div
                      key={b.id}
                      className="flex flex-col justify-between rounded-[22px] border border-beige bg-cream/60 p-5 transition hover:border-sage/40 hover:bg-cream"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-serif text-base font-semibold text-charcoal">
                              {b.appointment_type_title}
                            </h3>
                            <p className="text-xs text-warm-gray">Participant: {b.parent_name}</p>
                          </div>
                          <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium', badge.className)}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-warm-gray">
                          <span className="flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1">
                            <Calendar className="h-3.5 w-3.5 text-sage-dark" />
                            {b.appointment_date}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5 text-sage-dark" />
                            {b.appointment_time} ({b.time_zone})
                          </span>
                        </div>

                        {b.notes && (
                          <p className="mt-2.5 text-xs italic text-soft-gray line-clamp-2">
                            &ldquo;{b.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-beige/80 pt-3">
                        {b.google_meet_url && b.status === 'confirmed' ? (
                          <a
                            href={b.google_meet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-dusty-blue/20 px-3.5 py-1.5 text-xs font-semibold text-dusty-blue-dark transition hover:bg-dusty-blue/30"
                          >
                            <Video className="h-3.5 w-3.5" /> Join Google Meet
                          </a>
                        ) : (
                          <span className="text-[11px] text-soft-gray">
                            {b.status === 'pending' ? 'Meeting link pending approval' : 'Session complete'}
                          </span>
                        )}

                        {canModify && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setRescheduleBooking(b)}
                              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-charcoal shadow-sm transition hover:bg-sage hover:text-white"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelBooking(b)}
                              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-600 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-beige bg-cream/40 p-8 text-center">
                <CalendarDays className="mx-auto mb-2 h-8 w-8 text-sage/40" />
                <p className="text-base font-medium text-charcoal">No upcoming sessions yet</p>
                <p className="mt-1 text-xs text-warm-gray">
                  Ready to connect? Book your next 1-on-1 coaching session or course consultation anytime.
                </p>
                <Link
                  to="/booking"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-sage-dark"
                >
                  Schedule a Session
                </Link>
              </div>
            )}
          </section>

          {/* MY COURSES SECTION */}
          <section className="rounded-[32px] border border-beige bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-charcoal">My Courses</h2>
              <Link to="/dashboard/courses" className="text-sm font-medium text-sage-dark hover:text-sage">View all</Link>
            </div>

            {enrolledCourses.length > 0 ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {enrolledCourses.slice(0, 3).map((course) => (
                  <div key={course.id} className="overflow-hidden rounded-[24px] border border-beige bg-cream">
                    <img src={course.thumbnail} alt={course.title} className="h-36 w-full object-cover" />
                    <div className="p-5">
                      <h3 className="font-semibold text-charcoal">{course.title}</h3>
                      <p className="mt-2 text-sm text-warm-gray">{course.category}</p>
                      <div className="mt-4 h-2 rounded-full bg-beige">
                        <div className="h-2 w-1/2 rounded-full bg-sage" />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-warm-gray">50% complete</span>
                        <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-sage-dark">
                          Continue <Play className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-beige bg-cream p-8 text-center">
                <p className="text-lg font-medium text-charcoal">No courses enrolled yet</p>
                <p className="mt-2 text-sm text-warm-gray">Browse the catalog and start your next learning experience.</p>
                <Link to="/courses" className="mt-4 inline-flex rounded-full bg-sage px-5 py-3 text-sm font-medium text-white hover:bg-sage-dark">
                  Browse Courses
                </Link>
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Link to="/booking" className="rounded-[24px] border border-beige bg-white p-6 shadow-sm transition hover:-translate-y-1">
              <p className="font-semibold text-charcoal">Book a Session</p>
              <p className="mt-2 text-sm text-warm-gray">Schedule a supportive coaching call.</p>
            </Link>
            <Link to="/courses" className="rounded-[24px] border border-beige bg-white p-6 shadow-sm transition hover:-translate-y-1">
              <p className="font-semibold text-charcoal">Browse Courses</p>
              <p className="mt-2 text-sm text-warm-gray">Pick a course that matches your goals.</p>
            </Link>
            <Link to="/resources" className="rounded-[24px] border border-beige bg-white p-6 shadow-sm transition hover:-translate-y-1">
              <p className="font-semibold text-charcoal">Free Resources</p>
              <p className="mt-2 text-sm text-warm-gray">Access helpful tools and guidance.</p>
            </Link>
          </section>
        </main>
      </div>

      {rescheduleBooking && (
        <ClientRescheduleModal
          booking={rescheduleBooking}
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={async () => {
            await fetchBookings();
            setRescheduleBooking(null);
          }}
        />
      )}

      {cancelBooking && (
        <ClientCancelModal
          booking={cancelBooking}
          isOpen={Boolean(cancelBooking)}
          onClose={() => setCancelBooking(null)}
          onCancelled={async () => {
            await fetchBookings();
            setCancelBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
