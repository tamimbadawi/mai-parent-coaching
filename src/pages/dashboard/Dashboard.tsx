import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, CalendarDays, UserRound, Compass, Sparkles, Play, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { courses } from '../../data/content';
import { supabase } from '../../lib/supabase';
import type { VideoProgress } from '../../types';

const Dashboard = (): JSX.Element => {
  const { profile, enrollments, refreshEnrollments } = useAuth();
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    void refreshEnrollments();

    return () => {
      isMounted = false;
    };
  }, [refreshEnrollments]);

  const enrolledCourses = useMemo(() => courses.filter((course) => enrollments.some((enrollment) => enrollment.course_id === course.id)), [enrollments]);
  const completedLessons = useMemo(() => videoProgress.filter((item) => item.completed).length, [videoProgress]);
  const hoursWatched = useMemo(() => Math.round((videoProgress.reduce((sum, item) => sum + item.progress_seconds, 0) / 3600) * 10) / 10, [videoProgress]);
  const firstName = profile?.full_name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'friend';

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
            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-2xl bg-sage/10 px-4 py-3 text-sage-dark">
              <Compass className="h-4 w-4" /> Overview
            </Link>
            <Link to="/dashboard/courses" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-warm-gray hover:bg-cream">
              <BookOpen className="h-4 w-4" /> My Courses
            </Link>
            <Link to="/dashboard/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-warm-gray hover:bg-cream">
              <UserRound className="h-4 w-4" /> Profile Settings
            </Link>
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-warm-gray">
              <CalendarDays className="h-4 w-4" /> Bookings
            </div>
          </nav>
        </aside>

        <main className="flex-1 space-y-8">
          <section className="rounded-[32px] border border-beige bg-gradient-to-br from-sage/10 to-cream p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-dark">Welcome back</p>
            <h1 className="mt-2 font-serif text-3xl text-charcoal">Welcome back, {firstName}!</h1>
            <p className="mt-3 max-w-2xl text-sm text-warm-gray">Continue where you left off and make space for your next learning step.</p>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
              <p className="text-sm text-warm-gray">Enrolled Courses</p>
              <p className="mt-3 font-serif text-3xl text-charcoal">{enrollments.length}</p>
            </div>
            <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
              <p className="text-sm text-warm-gray">Completed Lessons</p>
              <p className="mt-3 font-serif text-3xl text-charcoal">{completedLessons}</p>
            </div>
            <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm">
              <p className="text-sm text-warm-gray">Hours Watched</p>
              <p className="mt-3 font-serif text-3xl text-charcoal">{hoursWatched}h</p>
            </div>
          </section>

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
    </div>
  );
};

export default Dashboard;
