import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  Sparkles,
  Play,
  Calendar,
  Clock,
  Video,
  Plus,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { courses } from '../../data/content';
import { supabase } from '../../lib/supabase';
import type { VideoProgress, Booking } from '../../types';
import { cn } from '../../lib/utils';
import { ClientRescheduleModal } from '../../components/booking/ClientRescheduleModal';
import { ClientCancelModal } from '../../components/booking/ClientCancelModal';
import DashboardLayout from './DashboardLayout';

const statusBadgeClasses: Record<Booking['status'], { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-amber-100/80 text-amber-800 border-amber-300/80' },
  confirmed: { label: 'Confirmed', className: 'bg-sage/20 text-sage-dark border-sage/40' },
  completed: { label: 'Completed', className: 'bg-emerald-100/80 text-emerald-800 border-emerald-300/80' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100/80 text-rose-700 border-rose-300/80' },
  pending_calendar_sync: { label: 'Sync Pending', className: 'bg-purple-100/80 text-purple-800 border-purple-300/80' },
};

const Dashboard = (): JSX.Element => {
  const { user, profile, enrollments } = useAuth();
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
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

  const nextUpcomingBooking = useMemo(() => {
    return upcomingBookings.find((b) => b.status === 'confirmed' || b.status === 'pending');
  }, [upcomingBookings]);

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <DashboardLayout
      activeTab="overview"
      sessionCount={upcomingBookings.length}
      courseCount={enrollments.length}
    >
      <div className="h-full flex flex-col justify-between min-h-0 gap-2.5 overflow-hidden">
        {/* Compact Welcome Header */}
        <section className="rounded-2xl border border-beige/80 bg-gradient-to-r from-sage/15 via-cream/80 to-sand/20 px-4 py-2.5 shadow-xs flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-sage-dark" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-dark">
                Parenting Learning Space
              </span>
            </div>
            <h1 className="font-serif text-lg sm:text-xl text-charcoal font-normal leading-tight">
              Welcome back, {firstName}!
            </h1>
          </div>
          <p className="hidden md:block text-xs text-warm-gray max-w-xs text-right leading-tight">
            Coaching, sessions & courses with Mai
          </p>
        </section>

        {/* 3 Compact Metrics */}
        <section className="grid grid-cols-3 gap-2.5 shrink-0">
          <Link
            to="/dashboard/sessions"
            className="group rounded-xl border border-beige/80 bg-white/90 px-3 py-2 shadow-xs transition hover:border-sage/40 flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">Sessions</p>
              <p className="font-serif text-xl font-normal text-charcoal leading-tight">{upcomingBookings.length}</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage/15 text-sage-dark group-hover:bg-sage group-hover:text-white transition">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            to="/dashboard/courses"
            className="group rounded-xl border border-beige/80 bg-white/90 px-3 py-2 shadow-xs transition hover:border-sage/40 flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">Courses</p>
              <p className="font-serif text-xl font-normal text-charcoal leading-tight">{enrollments.length}</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage/15 text-sage-dark group-hover:bg-sage group-hover:text-white transition">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
          </Link>

          <div className="rounded-xl border border-beige/80 bg-white/90 px-3 py-2 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">Lessons</p>
              <p className="font-serif text-xl font-normal text-charcoal leading-tight">{completedLessons}</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage/15 text-sage-dark">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
          </div>
        </section>

        {/* 2 Main Panels: Next Session & Active Course */}
        <div className="grid gap-2.5 md:grid-cols-2 flex-1 min-h-0">
          {/* Next Session Card */}
          <div className="rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-beige/60">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-sage-dark" />
                  <h2 className="font-serif text-sm text-charcoal font-medium">Next Session</h2>
                </div>
                <Link to="/dashboard/sessions" className="text-[11px] font-medium text-sage-dark hover:underline">
                  All Sessions &rarr;
                </Link>
              </div>

              {nextUpcomingBooking ? (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-xs sm:text-sm font-medium text-charcoal leading-tight">
                        {nextUpcomingBooking.appointment_type_title}
                      </h3>
                      <p className="text-[10px] text-warm-gray mt-0.5">With Mai Elbadawy</p>
                    </div>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold', statusBadgeClasses[nextUpcomingBooking.status]?.className)}>
                      {statusBadgeClasses[nextUpcomingBooking.status]?.label ?? nextUpcomingBooking.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-warm-gray">
                    <span className="flex items-center gap-1 rounded-md bg-cream/70 border border-beige/60 px-2 py-0.5 text-charcoal font-medium">
                      <Calendar className="h-3 w-3 text-sage-dark" />
                      {nextUpcomingBooking.appointment_date}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-cream/70 border border-beige/60 px-2 py-0.5 text-charcoal font-medium">
                      <Clock className="h-3 w-3 text-sage-dark" />
                      {nextUpcomingBooking.appointment_time}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 py-3 text-center">
                  <p className="text-xs text-warm-gray">No upcoming session booked.</p>
                  <Link
                    to="/booking"
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                  >
                    <Plus className="h-3 w-3" /> Book Call
                  </Link>
                </div>
              )}
            </div>

            {nextUpcomingBooking && (
              <div className="pt-2 border-t border-beige/60 flex items-center justify-between gap-2 text-xs">
                {nextUpcomingBooking.google_meet_url && nextUpcomingBooking.status === 'confirmed' ? (
                  <a
                    href={nextUpcomingBooking.google_meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2.5 py-1 text-[11px] font-semibold text-sage-dark hover:bg-sage/30 transition"
                  >
                    <Video className="h-3 w-3" /> Join Meet
                  </a>
                ) : (
                  <span className="text-[10px] text-warm-gray">
                    {nextUpcomingBooking.status === 'pending' ? 'Reviewing availability' : 'Call scheduled'}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRescheduleBooking(nextUpcomingBooking)}
                    className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-charcoal border border-beige/80 hover:bg-sage hover:text-white transition"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelBooking(nextUpcomingBooking)}
                    className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Course Card */}
          <div className="rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-beige/60">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sage-dark" />
                  <h2 className="font-serif text-sm text-charcoal font-medium">Active Course</h2>
                </div>
                <Link to="/dashboard/courses" className="text-[11px] font-medium text-sage-dark hover:underline">
                  My Courses &rarr;
                </Link>
              </div>

              {enrolledCourses.length > 0 ? (
                <div className="mt-2.5 flex items-center gap-2.5">
                  <img
                    src={enrolledCourses[0].thumbnail}
                    alt={enrolledCourses[0].title}
                    className="h-14 w-16 rounded-lg object-cover border border-beige/60 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="rounded-full bg-sage/15 px-1.5 py-0.2 text-[9px] font-semibold text-sage-dark">
                      {enrolledCourses[0].category}
                    </span>
                    <h3 className="mt-0.5 font-serif text-xs sm:text-sm font-medium text-charcoal truncate">
                      {enrolledCourses[0].title}
                    </h3>
                    <p className="text-[10px] text-warm-gray line-clamp-1">
                      {enrolledCourses[0].description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 py-3 text-center">
                  <p className="text-xs text-warm-gray">Not enrolled in any courses yet.</p>
                  <Link
                    to="/courses"
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                  >
                    Explore Courses
                  </Link>
                </div>
              )}
            </div>

            {enrolledCourses.length > 0 && (
              <div className="pt-2 border-t border-beige/60 flex items-center justify-between">
                <span className="text-[10px] text-warm-gray">Self-paced video modules</span>
                <Link
                  to={`/courses/${enrolledCourses[0].id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                >
                  <span>Resume</span>
                  <Play className="h-2.5 w-2.5 fill-current" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 3 Quick Resource Actions */}
        <section className="grid grid-cols-3 gap-2.5 shrink-0">
          <Link to="/booking" className="group rounded-xl border border-beige/80 bg-white/90 px-3 py-2 shadow-xs transition hover:border-sage/40 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sage/15 text-sage-dark group-hover:bg-sage group-hover:text-white transition shrink-0">
              <Calendar className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-charcoal truncate leading-tight">Book Session</p>
              <p className="text-[9px] text-warm-gray truncate">1-on-1 call</p>
            </div>
          </Link>
          <Link to="/courses" className="group rounded-xl border border-beige/80 bg-white/90 px-3 py-2 shadow-xs transition hover:border-sage/40 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sage/15 text-sage-dark group-hover:bg-sage group-hover:text-white transition shrink-0">
              <BookOpen className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-charcoal truncate leading-tight">Browse Courses</p>
              <p className="text-[9px] text-warm-gray truncate">Psychology</p>
            </div>
          </Link>
          <Link to="/resources" className="group rounded-xl border border-beige/80 bg-white/90 px-3 py-2 shadow-xs transition hover:border-sage/40 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sage/15 text-sage-dark group-hover:bg-sage group-hover:text-white transition shrink-0">
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-charcoal truncate leading-tight">Free Guides</p>
              <p className="text-[9px] text-warm-gray truncate">Toolkits</p>
            </div>
          </Link>
        </section>
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
    </DashboardLayout>
  );
};

export default Dashboard;
