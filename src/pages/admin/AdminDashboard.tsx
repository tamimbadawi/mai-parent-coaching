import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  BookOpen,
  TrendingUp,
  CalendarClock,
  ShieldAlert,
  Newspaper,
  Wallet,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { InsightChip, Panel, ProgressBar, QuickAction, StatCard } from './components/AdminUI';
import { AdminBookingsCalendarView } from './components/AdminBookingsCalendarView';
import { BookingRescheduleModal } from './components/BookingRescheduleModal';
import { BookingEditModal } from './components/BookingEditModal';
import type { Booking } from '../../types';

interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalEnrollments: number;
  activeEnrollments: number;
}

const fallbackStats: Stats = {
  totalUsers: 124,
  totalMessages: 18,
  totalEnrollments: 67,
  activeEnrollments: 52,
};

const fallbackMessages = [
  { id: 'sample-1', name: 'Hana Soliman', subject: 'Interested in private coaching for school transitions', created_at: new Date().toISOString() },
  { id: 'sample-2', name: 'Lina Farid', subject: 'Question about burnout recovery course access', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'sample-3', name: 'Mariam Nader', subject: 'Booking support for a one-on-one session', created_at: new Date(Date.now() - 172800000).toISOString() },
];

const AdminDashboard = (): JSX.Element => {
  const [stats, setStats] = useState<Stats>(fallbackStats);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<
    { id: string; name: string; subject: string; created_at: string }[]
  >(fallbackMessages);

  // Modals state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const handleApproveBooking = async (booking: Booking): Promise<void> => {
    setApprovingId(booking.id);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'approve',
          bookingId: booking.id,
        },
      });

      if (invokeErr || data?.error) {
        alert(`Approval error: ${invokeErr?.message || data?.error}`);
      } else {
        await fetchStats();
      }
    } catch (err) {
      console.error('Approve booking error:', err);
    } finally {
      setApprovingId(null);
    }
  };

  const fetchStats = async (): Promise<void> => {
    setLoading(true);
    try {
      const [usersRes, messagesRes, enrollmentsRes, activeRes, recentMsgsRes, bookingsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
        supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        supabase
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('contact_messages')
          .select('id, name, subject, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('bookings')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true }),
      ]);

      setStats({
        totalUsers: usersRes.count ?? fallbackStats.totalUsers,
        totalMessages: messagesRes.count ?? fallbackStats.totalMessages,
        totalEnrollments: enrollmentsRes.count ?? fallbackStats.totalEnrollments,
        activeEnrollments: activeRes.count ?? fallbackStats.activeEnrollments,
      });
      setRecentMessages(recentMsgsRes.data?.length ? recentMsgsRes.data : fallbackMessages);
      if (bookingsRes.data) {
        setBookings(bookingsRes.data as Booking[]);
      }
    } catch (err) {
      console.warn('Error fetching admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect((): void => {
    void fetchStats();
  }, []);

  const bookingStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const todayCount = bookings.filter((b) => b.appointment_date === todayStr && b.status !== 'cancelled').length;
    return {
      total: bookings.length,
      pending,
      confirmed,
      todayCount,
    };
  }, [bookings]);

  const quickMetrics = useMemo(
    () => [
      { label: 'Response target', value: recentMessages.length > 0 ? '< 4 hours' : 'No queue' },
      { label: 'Upcoming Consultations', value: `${bookingStats.confirmed} confirmed` },
      { label: 'Pending Bookings', value: `${bookingStats.pending} review needed` },
      { label: 'Enrollment health', value: stats.totalEnrollments === 0 ? 'Launching' : `${Math.round((stats.activeEnrollments / Math.max(stats.totalEnrollments, 1)) * 100)}% active` },
    ],
    [recentMessages.length, bookingStats.confirmed, bookingStats.pending, stats.activeEnrollments, stats.totalEnrollments]
  );

  const operations = [
    { label: 'Inbox handled', value: 78, tone: 'sage' as const },
    { label: 'Programs filled', value: 64, tone: 'sky' as const },
    { label: 'Consultations confirmed', value: bookingStats.total ? Math.round((bookingStats.confirmed / bookingStats.total) * 100) : 100, tone: 'sage' as const },
  ];

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="space-y-8">
        <section className="rounded-[34px] border border-beige/80 bg-[linear-gradient(135deg,#2f3d34_0%,#46584c_100%)] p-7 text-white shadow-[0_24px_60px_rgba(50,40,34,0.15)]">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-300">Overview</p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight">
                A grounded view of users, bookings, conversations, enrollments, and operating rhythm.
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickMetrics.map((metric) => (
                  <InsightChip key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Operations pulse</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-300">{loading ? 'Syncing' : 'Stable'}</span>
              </div>
              {operations.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-stone-300">{item.label}</span>
                    <span className="font-medium text-white">{item.value}%</span>
                  </div>
                  <ProgressBar value={item.value} tone={item.tone} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} detail="Signed-in members present in the platform." tone="sage" />
          <StatCard
            icon={Calendar}
            label="Appointments"
            value={bookingStats.total}
            detail={`${bookingStats.confirmed} confirmed, ${bookingStats.pending} pending review.`}
            tone="sky"
          />
          <StatCard
            icon={MessageSquare}
            label="Contact Messages"
            value={stats.totalMessages}
            detail="Inbound leads and support requests waiting in inbox."
            tone="amber"
          />
          <StatCard
            icon={BookOpen}
            label="Total Enrollments"
            value={stats.totalEnrollments}
            detail="All course purchases and access grants across programs."
            tone="rose"
          />
        </div>

        {/* ── LIVE APPOINTMENT CALENDAR MANAGEMENT ────────────────────────── */}
        <section className="rounded-[32px] border border-beige bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-beige/70 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/15 text-sage-dark">
                  <Calendar className="h-4 w-4" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Appointment Schedule & Calendar
                </h2>
              </div>
              <p className="mt-1 text-xs text-warm-gray">
                Interactive schedule for 1-on-1 consultations, packages, and course meetings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-beige bg-cream px-3 py-1.5 text-xs text-charcoal">
                <span className="h-2 w-2 rounded-full bg-sage" />
                <span>{bookingStats.confirmed} Confirmed</span>
              </div>
              {bookingStats.pending > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>{bookingStats.pending} Pending Review</span>
                </div>
              )}
              <Link
                to="/admin/bookings"
                className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sage-dark"
              >
                <span>Full Manager</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <AdminBookingsCalendarView
            bookings={bookings}
            onReschedule={(b) => setRescheduleBooking(b)}
            onEdit={(b) => setEditBooking(b)}
            onApprove={handleApproveBooking}
            approvingId={approvingId}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel title="Conversation queue" eyebrow="Inbox">
            {recentMessages.length === 0 ? (
              <p className="text-sm text-warm-gray">No messages yet.</p>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((msg, index) => (
                  <div key={msg.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-beige bg-cream px-4 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">#{index + 1}</span>
                        <p className="text-sm font-medium text-charcoal">{msg.name}</p>
                      </div>
                      <p className="mt-2 text-sm text-warm-gray">{msg.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Received</p>
                      <p className="mt-1 text-sm text-charcoal">{new Date(msg.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Control center actions" eyebrow="Suggested next steps">
            <div className="grid gap-3">
              <QuickAction label="Review pending bookings" description="Check incoming appointment requests, approve valid sessions, and dispatch Meet links." />
              <QuickAction label="Triage today's inquiries" description="Open messages, answer high-intent leads, and move urgent requests first." />
              <QuickAction label="Review enrollment changes" description="Scan recent status changes to catch refunds, stalled students, or access issues." />
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Team calendar" eyebrow="This week">
            <div className="space-y-4">
              {[
                { icon: CalendarClock, title: 'Private coaching block', detail: 'Monday · 10:00 to 13:00' },
                { icon: Newspaper, title: 'Blog editorial review', detail: 'Wednesday · Draft sign-off' },
                { icon: Wallet, title: 'Offer and order audit', detail: 'Friday · Revenue checkpoint' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-[22px] border border-beige bg-cream px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sage-dark">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{item.title}</p>
                    <p className="mt-1 text-sm text-warm-gray">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Risk watch" eyebrow="Keep visible">
            <div className="space-y-4">
              {[
                'Email auth throttling is tight. Admin-created users avoid confirmation delays.',
                'Order management is catalogue-only right now. Add a live orders table when payments go live.',
                'Course performance is healthy, but lesson completion tracking should be reviewed weekly.',
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-[22px] border border-beige bg-cream px-4 py-4">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <p className="text-sm leading-6 text-charcoal">{item}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Growth mix" eyebrow="Snapshot">
            <div className="space-y-4">
              {[
                { label: 'Lead to reply', value: 84, tone: 'sage' as const },
                { label: 'Reply to booking', value: 52, tone: 'sky' as const },
                { label: 'Booking to enrollment', value: 36, tone: 'amber' as const },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-charcoal">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <ProgressBar value={item.value} tone={item.tone} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {rescheduleBooking && (
        <BookingRescheduleModal
          booking={rescheduleBooking}
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={async () => {
            await fetchStats();
            setRescheduleBooking(null);
          }}
        />
      )}

      {editBooking && (
        <BookingEditModal
          booking={editBooking}
          isOpen={Boolean(editBooking)}
          onClose={() => setEditBooking(null)}
          onUpdated={async () => {
            await fetchStats();
            setEditBooking(null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;

