import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Clock,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Edit2,
  RotateCw,
  Loader2,
  Calendar,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { Panel } from './components/AdminUI';
import { AdminBookingsCalendarView } from './components/AdminBookingsCalendarView';
import { BookingRescheduleModal } from './components/BookingRescheduleModal';
import { BookingEditModal } from './components/BookingEditModal';
import { AdminManualBookingModal } from './components/AdminManualBookingModal';
import type { Booking } from '../../types';

interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalEnrollments: number;
  pendingUsers: number;
}

const statusBadgeStyles: Record<Booking['status'], { label: string; className: string }> = {
  pending: {
    label: 'Pending Review',
    className: 'bg-amber-50 text-amber-800 border-amber-200/80',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-sage/15 text-sage-dark border-sage/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  pending_calendar_sync: {
    label: 'Syncing',
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
};

const AdminDashboard = (): JSX.Element => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalMessages: 0,
    totalEnrollments: 0,
    pendingUsers: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<
    { id: string; name: string; email: string; subject: string; created_at: string }[]
  >([]);

  // Modals state
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const fetchDashboardData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, pendingUsersRes, messagesRes, enrollmentsRes, recentMsgsRes, bookingsRes] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'pending'),
          supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
          supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
          supabase
            .from('contact_messages')
            .select('id, name, email, subject, created_at')
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('bookings')
            .select('*')
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true }),
        ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        pendingUsers: pendingUsersRes.count ?? 0,
        totalMessages: messagesRes.count ?? 0,
        totalEnrollments: enrollmentsRes.count ?? 0,
      });

      if (recentMsgsRes.data) {
        setRecentMessages(recentMsgsRes.data);
      }

      if (bookingsRes.data) {
        setBookings(bookingsRes.data as Booking[]);
      }
    } catch (err: unknown) {
      console.warn('Error fetching dashboard data:', err);
      setError('Unable to load some data. Please check your network or refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect((): void => {
    void fetchDashboardData();
  }, []);

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
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Approve booking error:', err);
    } finally {
      setApprovingId(null);
    }
  };

  // Compute today's date in local YYYY-MM-DD
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const formattedToday = useMemo(
    () => format(new Date(), 'EEEE, MMMM d, yyyy'),
    []
  );

  const todaySessions = useMemo(() => {
    return bookings.filter(
      (b) => b.appointment_date === todayStr && b.status !== 'cancelled'
    );
  }, [bookings, todayStr]);

  const bookingStats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    return {
      total: bookings.length,
      pending,
      confirmed,
      todayCount: todaySessions.length,
    };
  }, [bookings, todaySessions.length]);

  const totalPendingApprovals = bookingStats.pending + stats.pendingUsers;

  return (
    <AdminLayout
      title="Overview"
      subtitle="Calm control and daily flow for your parent coaching practice."
      action={
        <button
          type="button"
          onClick={() => setManualBookingOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-sage-dark active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Add booking</span>
        </button>
      }
    >
      <div className="space-y-8">
        {/* ── 1. CALM TOP HERO SECTION ─────────────────────────────────── */}
        <div className="rounded-2xl border border-beige/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray">
                {formattedToday}
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-charcoal font-normal">
                Your practice, at a glance
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-warm-gray leading-relaxed">
                The few things that need your attention today.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setManualBookingOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-sage-dark"
              >
                <Plus className="h-4 w-4" />
                <span>Add booking</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. THREE RESTRAINED SUMMARY CARDS ───────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Today's Sessions */}
          <div className="rounded-2xl border border-beige/80 bg-white p-5 shadow-xs transition-colors hover:border-beige">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/15 text-sage-dark">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">
                Schedule
              </span>
            </div>
            <p className="mt-4 font-serif text-3xl sm:text-4xl text-charcoal font-normal">
              {loading ? '-' : todaySessions.length}
            </p>
            <p className="mt-1.5 text-xs text-warm-gray leading-relaxed">
              {loading
                ? 'Loading schedule...'
                : todaySessions.length === 0
                ? 'No sessions scheduled for today'
                : todaySessions.length === 1
                ? '1 session scheduled for today'
                : `${todaySessions.length} sessions scheduled for today`}
            </p>
          </div>

          {/* Card 2: New Enquiries */}
          <Link
            to="/admin/messages"
            className="group rounded-2xl border border-beige/80 bg-white p-5 shadow-xs transition-colors hover:border-beige block"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray group-hover:text-sage-dark transition-colors">
                Enquiries
              </span>
            </div>
            <p className="mt-4 font-serif text-3xl sm:text-4xl text-charcoal font-normal">
              {loading ? '-' : stats.totalMessages}
            </p>
            <p className="mt-1.5 text-xs text-warm-gray leading-relaxed">
              {loading
                ? 'Checking inbox...'
                : stats.totalMessages === 0
                ? 'No inquiries pending in inbox'
                : `${stats.totalMessages} contact messages received`}
            </p>
          </Link>

          {/* Card 3: Pending Approvals */}
          <Link
            to="/admin/bookings"
            className="group rounded-2xl border border-beige/80 bg-white p-5 shadow-xs transition-colors hover:border-beige block"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <UserCheck className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray group-hover:text-sage-dark transition-colors">
                Approvals
              </span>
            </div>
            <p className="mt-4 font-serif text-3xl sm:text-4xl text-charcoal font-normal">
              {loading ? '-' : totalPendingApprovals}
            </p>
            <p className="mt-1.5 text-xs text-warm-gray leading-relaxed">
              {loading
                ? 'Calculating...'
                : totalPendingApprovals === 0
                ? 'All bookings and registrations approved'
                : `${bookingStats.pending} bookings · ${stats.pendingUsers} registrations waiting`}
            </p>
          </Link>
        </div>

        {/* ── 3. PRIMARY "TODAY'S SESSIONS" LIST ───────────────────────── */}
        <section className="rounded-2xl border border-beige/80 bg-white p-6 shadow-xs sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sage" />
                <h3 className="font-serif text-xl text-charcoal font-normal">
                  Today's Sessions
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-warm-gray">
                {formattedToday}
              </p>
            </div>

            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-warm-gray hover:text-sage-dark transition-colors"
            >
              <span>View all bookings</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Sessions Content List */}
          <div className="mt-5">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-warm-gray gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-sage" />
                <span className="text-xs">Loading today's schedule...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-beige bg-[#faf8f4]/50 p-8 text-center">
                <p className="font-serif text-lg text-charcoal font-normal">
                  No sessions scheduled for today
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-warm-gray leading-relaxed">
                  You have clear space today to focus on parent coaching materials, follow-ups, and course development.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setManualBookingOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-beige bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-cream transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-sage-dark" />
                    <span>Schedule a session</span>
                  </button>
                  <Link
                    to="/admin/bookings"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sage/10 px-3 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage/20 transition-colors"
                  >
                    <span>Open bookings calendar</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-beige/50">
                {todaySessions.map((session) => {
                  const statusStyle =
                    statusBadgeStyles[session.status] || statusBadgeStyles.pending;
                  const isApproving = approvingId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-[#faf8f4]/40 px-2 rounded-xl transition-colors"
                    >
                      {/* Left info */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf8f4] border border-beige/70 text-charcoal">
                          <Clock className="h-4 w-4 text-sage-dark" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-charcoal truncate">
                              {session.parent_name}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusStyle.className}`}
                            >
                              {statusStyle.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-warm-gray truncate">
                            {session.appointment_type_title}
                            {session.child_name && (
                              <span className="text-stone-400"> · Child: {session.child_name}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right info & Actions */}
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-medium text-charcoal">
                            {session.appointment_time}
                          </p>
                          <p className="text-[10px] text-warm-gray">
                            {session.country || 'Online Session'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {session.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isApproving}
                              onClick={() => handleApproveBooking(session)}
                              className="inline-flex items-center gap-1 rounded-lg bg-sage/15 px-2.5 py-1 text-[11px] font-medium text-sage-dark hover:bg-sage/25 transition-colors disabled:opacity-50"
                              title="Approve booking and generate Meet link"
                            >
                              {isApproving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setRescheduleBooking(session)}
                            className="rounded-lg border border-beige bg-white p-1.5 text-warm-gray hover:text-charcoal hover:bg-cream transition-colors"
                            title="Reschedule session"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditBooking(session)}
                            className="rounded-lg border border-beige bg-white p-1.5 text-warm-gray hover:text-charcoal hover:bg-cream transition-colors"
                            title="Edit details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── 4. APPOINTMENT CALENDAR VIEW ─────────────────────────────── */}
        <section className="rounded-2xl border border-beige/80 bg-white p-6 shadow-xs sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sage-dark" />
                <h3 className="font-serif text-xl text-charcoal font-normal">
                  Appointment Schedule & Calendar
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-warm-gray">
                Interactive view for 1-on-1 consultations and parent coaching sessions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-charcoal border border-beige/60">
                {bookingStats.confirmed} Confirmed
              </span>
              {bookingStats.pending > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 border border-amber-200">
                  {bookingStats.pending} Pending Review
                </span>
              )}
              <Link
                to="/admin/bookings"
                className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-dark transition-colors shadow-xs"
              >
                <span>Full Manager</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <AdminBookingsCalendarView
              bookings={bookings}
              onReschedule={(b) => setRescheduleBooking(b)}
              onEdit={(b) => setEditBooking(b)}
              onApprove={handleApproveBooking}
              approvingId={approvingId}
            />
          </div>
        </section>

        {/* ── 5. SECONDARY INBOX & QUICK ACTIONS ──────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Conversation Queue */}
          <Panel
            title="Recent Inquiries"
            eyebrow="Inbox"
            action={
              <Link
                to="/admin/messages"
                className="inline-flex items-center gap-1 text-xs font-medium text-warm-gray hover:text-sage-dark transition-colors"
              >
                <span>All messages</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            {recentMessages.length === 0 ? (
              <p className="text-xs text-warm-gray py-4 text-center">No messages yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentMessages.map((msg) => (
                  <Link
                    key={msg.id}
                    to="/admin/messages"
                    className="flex items-start justify-between gap-3 rounded-xl border border-beige/70 bg-[#faf8f4]/50 p-3.5 transition-colors hover:bg-white hover:border-beige block group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-charcoal group-hover:text-sage-dark transition-colors truncate">
                        {msg.name}
                      </p>
                      <p className="mt-0.5 text-xs text-warm-gray truncate">
                        {msg.subject}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-warm-gray">
                      {format(new Date(msg.created_at), 'MMM d')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* Quick Practice Shortcuts */}
          <Panel title="Practice Shortcuts" eyebrow="Quick Actions">
            <div className="space-y-2.5">
              <Link
                to="/admin/bookings"
                className="flex items-start justify-between rounded-xl border border-beige/70 bg-[#faf8f4]/50 p-3.5 transition hover:bg-white hover:border-beige group"
              >
                <div>
                  <p className="text-xs font-medium text-charcoal group-hover:text-sage-dark transition-colors">
                    Review Pending Bookings
                  </p>
                  <p className="mt-0.5 text-xs text-warm-gray">
                    Approve upcoming requests, configure open hours, or reschedule sessions.
                  </p>
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-gray group-hover:text-sage-dark transition" />
              </Link>

              <Link
                to="/admin/users"
                className="flex items-start justify-between rounded-xl border border-beige/70 bg-[#faf8f4]/50 p-3.5 transition hover:bg-white hover:border-beige group"
              >
                <div>
                  <p className="text-xs font-medium text-charcoal group-hover:text-sage-dark transition-colors">
                    Manage Client Accounts
                  </p>
                  <p className="mt-0.5 text-xs text-warm-gray">
                    Approve new parent registrations and manage course enrollments.
                  </p>
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-gray group-hover:text-sage-dark transition" />
              </Link>

              <Link
                to="/admin/messages"
                className="flex items-start justify-between rounded-xl border border-beige/70 bg-[#faf8f4]/50 p-3.5 transition hover:bg-white hover:border-beige group"
              >
                <div>
                  <p className="text-xs font-medium text-charcoal group-hover:text-sage-dark transition-colors">
                    Triage Inbound Inquiries
                  </p>
                  <p className="mt-0.5 text-xs text-warm-gray">
                    Respond to contact form submissions and parental coaching questions.
                  </p>
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-gray group-hover:text-sage-dark transition" />
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {manualBookingOpen && (
        <AdminManualBookingModal
          isOpen={manualBookingOpen}
          onClose={() => setManualBookingOpen(false)}
          onCreated={async () => {
            await fetchDashboardData();
            setManualBookingOpen(false);
          }}
        />
      )}

      {rescheduleBooking && (
        <BookingRescheduleModal
          booking={rescheduleBooking}
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={async () => {
            await fetchDashboardData();
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
            await fetchDashboardData();
            setEditBooking(null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
