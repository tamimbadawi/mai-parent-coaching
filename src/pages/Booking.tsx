import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  isWeekend,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ArrowRight,
  User,
  Mail,
  MessageSquare,
  Sparkles,
  Heart,
  Brain,
  Users,
  Star,
  CalendarDays,
  MessageCircle,
  Loader2,
  CalendarCheck,
  Video,
  Globe,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UserProfile, Booking as BookingType } from '../types';
import { appointmentTypes } from '../data/content';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { ClientRescheduleModal } from '../components/booking/ClientRescheduleModal';
import { ClientCancelModal } from '../components/booking/ClientCancelModal';
import { BookingStepper } from '../components/booking/BookingStepper';

const TIMES = [
  '9:00', '9:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SESSION_ICONS: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  initial: { icon: <Sparkles className="h-3.5 w-3.5" />, bg: 'bg-sage/15', text: 'text-sage-dark' },
  'coaching-60': { icon: <Heart className="h-3.5 w-3.5" />, bg: 'bg-terracotta/10', text: 'text-terracotta-dark' },
  'intensive-90': { icon: <Brain className="h-3.5 w-3.5" />, bg: 'bg-dusty-blue/15', text: 'text-dusty-blue-dark' },
  family: { icon: <Users className="h-3.5 w-3.5" />, bg: 'bg-olive/10', text: 'text-olive' },
  'follow-up': { icon: <Star className="h-3.5 w-3.5" />, bg: 'bg-gold/15', text: 'text-[rgb(var(--color-terracotta-dark))]' },
};

const SESSION_META: Record<
  string,
  { icon: typeof Heart; accent: string; expectations: string[] }
> = {
  initial: {
    icon: Sparkles,
    accent: 'bg-dusty-blue/15 text-dusty-blue-dark',
    expectations: [
      'Warm welcome and overview of how coaching works together.',
      'Space to share your story, current challenges, and family context.',
      'Clarifying your goals and what success would look like for you.',
      'Honest guidance on the best next steps — no pressure to commit.',
    ],
  },
  'coaching-60': {
    icon: Heart,
    accent: 'bg-sage/15 text-sage-dark',
    expectations: [
      'Check-in on what has shifted since your last session.',
      'Practical strategies tailored to your child and your nervous system.',
      'Role-play or scripts for difficult moments when helpful.',
      'Clear action steps you can try before the next meeting.',
    ],
  },
  'intensive-90': {
    icon: Brain,
    accent: 'bg-terracotta/15 text-terracotta-dark',
    expectations: [
      'Extended time for complex patterns, burnout, or layered family stress.',
      'Deeper exploration of triggers, cycles, and unmet needs.',
      'Integrated plan across parenting, self-regulation, and boundaries.',
      'Follow-up resources or homework to anchor the work.',
    ],
  },
  family: {
    icon: Users,
    accent: 'bg-olive/15 text-olive',
    expectations: [
      'Focus on household dynamics, sibling friction, and co-parent alignment.',
      'Tools for shared language and consistent responses across caregivers.',
      'Age-appropriate ways to involve children when appropriate.',
      'Systems and routines that reduce daily conflict.',
    ],
  },
  'follow-up': {
    icon: MessageCircle,
    accent: 'bg-gold/15 text-charcoal',
    expectations: [
      'Quick review of what is working and what still feels stuck.',
      'Adjustments to strategies based on real-life feedback.',
      'Celebration of progress — even small wins matter.',
      'Light touch maintenance for ongoing clients.',
    ],
  },
};

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function resolveBookingName(profile: UserProfile | null, user: SupabaseUser | null): string {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const metaName = meta?.full_name ?? meta?.name;
  if (typeof metaName === 'string' && metaName.trim()) return metaName.trim();
  return '';
}

function resolveBookingEmail(profile: UserProfile | null, user: SupabaseUser | null): string {
  return user?.email ?? profile?.email ?? '';
}

export default function Booking() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hoveredSession, setHoveredSession] = useState<{ id: string; rect: DOMRect } | null>(null);

  const selectedAppointment = appointmentTypes.find((a) => a.id === selectedType);
  const today = startOfDay(new Date());

  const userTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';
    } catch {
      return 'Africa/Cairo';
    }
  }, []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [calendarMonth]);

  const isBookable = (date: Date) => !isBefore(date, today) && !isWeekend(date);

  const handleSelectDate = (key: string) => {
    setSelectedDate(key);
    setSelectedTime(null);
  };

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [userPreviousBookings, setUserPreviousBookings] = useState<BookingType[]>([]);
  const [loadingUserBookings, setLoadingUserBookings] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      setSelectedTime(null);
      return;
    }

    let isMounted = true;
    async function loadLiveAvailability() {
      setLoadingSlots(true);
      try {
        // 1. Fetch existing bookings for this date as instant fallback
        const bookingsPromise = supabase
          .from('bookings')
          .select('appointment_time')
          .eq('appointment_date', selectedDate)
          .in('status', ['confirmed', 'pending_calendar_sync', 'pending', 'paid']);

        // 2. Invoke Edge Function with a 2.5s timeout
        const edgePromise = supabase.functions.invoke('get-availability', {
          body: {
            date: selectedDate,
            appointmentTypeId: selectedType || 'initial',
            timeZone: userTimeZone,
          },
        });

        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Availability timeout') }), 2500)
        );

        const [edgeResult, bookingsResult] = await Promise.all([
          Promise.race([edgePromise, timeoutPromise]),
          bookingsPromise,
        ]);

        if (!isMounted) return;

        const bookedTimes = new Set((bookingsResult.data || []).map((b: { appointment_time: string }) => b.appointment_time));
        const defaultAvailable = TIMES.filter((t) => !bookedTimes.has(t));

        if (edgeResult.data && Array.isArray(edgeResult.data.availableSlots) && edgeResult.data.availableSlots.length > 0) {
          const openSlots: string[] = edgeResult.data.availableSlots;
          setAvailableTimes(openSlots);
          if (selectedTime && !openSlots.includes(selectedTime)) {
            setSelectedTime(null);
          }
        } else {
          // Use standard open slots filtered by confirmed bookings
          setAvailableTimes(defaultAvailable);
          if (selectedTime && !defaultAvailable.includes(selectedTime)) {
            setSelectedTime(null);
          }
        }
      } catch (err) {
        console.warn('Error fetching live availability, using fallback slots:', err);
        if (isMounted) {
          setAvailableTimes(TIMES);
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    }

    void loadLiveAvailability();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedType, userTimeZone]);

  const fetchUserBookings = async () => {
    if (!user && !formData.email.trim()) {
      setUserPreviousBookings([]);
      return;
    }

    setLoadingUserBookings(true);
    try {
      let query = supabase.from('bookings').select('*');
      if (user?.id) {
        query = query.or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase() || ''}`);
      } else if (formData.email.trim()) {
        query = query.eq('email', formData.email.trim().toLowerCase());
      }
      const { data, error } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) {
        console.warn('Error fetching user previous bookings:', error);
      } else if (data) {
        setUserPreviousBookings(data as BookingType[]);
      }
    } catch (err) {
      console.warn('Failed to load user bookings:', err);
    } finally {
      setLoadingUserBookings(false);
    }
  };

  useEffect(() => {
    void fetchUserBookings();
  }, [user?.id, formData.email]);

  useEffect(() => {
    if (authLoading || !user) return;
    const name = resolveBookingName(profile, user);
    const email = resolveBookingEmail(profile, user);
    setFormData((prev) => ({
      ...prev,
      name: name || prev.name,
      email: email || prev.email,
    }));
  }, [user, profile, authLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          appointment_type_id: selectedType,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          parent_name: formData.name.trim(),
          email: formData.email.trim(),
          notes: formData.notes.trim() || null,
          timeZone: userTimeZone,
        },
      });

      if (error) {
        let detailedMsg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errJson = await error.context.json();
            if (errJson?.error) detailedMsg = errJson.error;
          }
        } catch {
          // ignore
        }
        throw new Error(detailedMsg || 'Failed to confirm booking.');
      } else if (data?.error) {
        throw new Error(data.error);
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Booking submission error:', err);
      setSubmitError(err.message || 'Something went wrong while confirming your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(
    selectedType && selectedDate && selectedTime && formData.name && formData.email && !submitting,
  );

  const hoveredType = hoveredSession
    ? appointmentTypes.find((type) => type.id === hoveredSession.id)
    : null;
  const hoveredMeta = hoveredSession ? SESSION_META[hoveredSession.id] : null;

  if (submitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage/15 ring-4 ring-sage/20">
            <Check className="h-6 w-6 text-sage-dark" />
          </div>
          <h1 className="mb-2 font-serif text-2xl text-charcoal">Booking Request Received!</h1>
          <div className="mb-5 space-y-2 text-sm leading-relaxed text-warm-gray">
            <p>
              Your time slot for <span className="font-medium text-charcoal">{selectedAppointment?.title}</span> on{' '}
              <span className="font-medium text-charcoal">
                {selectedDate &&
                  new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
              </span>{' '}
              at <span className="font-medium text-charcoal">{selectedTime}</span> is{' '}
              <span className="font-semibold text-sage-dark">temporarily reserved</span>.
            </p>
            <p className="text-xs text-soft-gray">
              Mai will review and confirm your session shortly. Once approved, you will receive an email confirmation with your session details and Google Meet link at{' '}
              <span className="font-medium text-charcoal">{formData.email}</span>.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sage-dark"
          >
            Back to Home <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ivory pt-safe pb-safe" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))' }}>
      <div
        className="sticky top-[64px] z-40 shrink-0 border-b border-beige/80 bg-ivory/95 px-3 py-2 sm:px-6 sm:py-2.5 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
        style={{ top: 'calc(64px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2">
          <div className="shrink-0">
            <h1 className="font-serif text-sm sm:text-base md:text-lg leading-none text-charcoal">Book a Session</h1>
            <p className="mt-0.5 hidden text-xs text-soft-gray sm:block">Fill in your preferences below</p>
          </div>
          <BookingStepper
            hasSelectedType={!!selectedType}
            hasSelectedDate={!!selectedDate}
            hasSelectedTime={!!selectedTime}
            hasDetails={!!(formData.name.trim() && formData.email.trim())}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6
          lg:grid lg:grid-cols-12 lg:items-start lg:gap-4 xl:gap-5"
        >
          {/* Column 1: Session Types */}
          <div className="flex flex-col gap-3 lg:col-span-4 xl:col-span-3">
            <SectionHeader icon={<Heart className="h-3 w-3 text-sage-dark" />} label="Session Type" />
            <div className="flex flex-col gap-2.5">
              {appointmentTypes.map((type) => {
                const sel = selectedType === type.id;
                const meta =
                  SESSION_ICONS[type.id] ?? {
                    icon: <Sparkles className="h-3.5 w-3.5" />,
                    bg: 'bg-sage/15',
                    text: 'text-sage-dark',
                  };
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    onMouseEnter={(event) =>
                      setHoveredSession({ id: type.id, rect: event.currentTarget.getBoundingClientRect() })
                    }
                    onMouseLeave={() =>
                      setHoveredSession((current) => (current?.id === type.id ? null : current))
                    }
                    onFocus={(event) =>
                      setHoveredSession({ id: type.id, rect: event.currentTarget.getBoundingClientRect() })
                    }
                    onBlur={() => setHoveredSession((current) => (current?.id === type.id ? null : current))}
                    aria-describedby={hoveredSession?.id === type.id ? `session-tip-${type.id}` : undefined}
                    className={cn(
                      'group rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200',
                      sel
                        ? 'border-sage bg-sage/8 shadow-sm ring-1 ring-sage/20'
                        : 'border-beige bg-cream hover:border-sage/40 hover:bg-cream/80',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                          sel ? `${meta.bg} ${meta.text}` : 'bg-beige/60 text-soft-gray group-hover:bg-beige',
                        )}
                      >
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'font-serif text-[13px] leading-snug',
                              sel ? 'text-sage-dark' : 'text-charcoal',
                            )}
                          >
                            {type.title}
                          </span>
                          {type.price === 0 && (
                            <span className="shrink-0 rounded-full bg-sage/20 px-1.5 py-0.5 text-[9px] font-semibold text-sage-dark">
                              Free
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-warm-gray">
                          {type.description}
                        </p>
                        <div className="mt-1 flex gap-3 text-[10px] text-soft-gray">
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {type.duration}
                          </span>
                          {type.price > 0 && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-2.5 w-2.5" />${type.price}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                          sel ? 'border-sage bg-sage' : 'border-beige group-hover:border-sage/50',
                        )}
                      >
                        {sel && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Date & Available Times */}
          <div className="flex flex-col gap-3.5 lg:col-span-4 xl:col-span-3">
            <div>
              <SectionHeader icon={<Calendar className="h-3 w-3 text-sage-dark" />} label="Date" />
              <div className="mt-2 rounded-xl border border-beige bg-cream p-4">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-beige/50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-xs font-semibold text-charcoal">{format(calendarMonth, 'MMMM yyyy')}</p>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-beige/50"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="py-1 text-[10px] font-semibold text-soft-gray">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day) => {
                    const key = toDateKey(day);
                    const inMonth = isSameMonth(day, calendarMonth);
                    const bookable = isBookable(day);
                    const sel = selectedDate === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!bookable}
                        onClick={() => handleSelectDate(key)}
                        className={cn(
                          'flex h-10 items-center justify-center rounded-lg text-xs font-medium transition',
                          !inMonth && 'text-soft-gray/40',
                          inMonth && !bookable && 'cursor-not-allowed text-soft-gray/35',
                          inMonth && bookable && !sel && 'text-charcoal hover:bg-sage/10',
                          sel && 'bg-sage text-white',
                          isToday(day) && !sel && bookable && 'ring-1 ring-sage/40',
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <div className="flex items-center justify-between gap-2">
                <SectionHeader icon={<Clock className="h-3 w-3 text-terracotta" />} label="Available Times" />
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-sage/20 bg-sage/10 px-2 py-0.5 text-[10px] font-medium text-sage-dark shadow-xs"
                  title={`Times are automatically converted to your local timezone (${userTimeZone})`}
                >
                  <Globe className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[160px]">{userTimeZone.replace(/_/g, ' ')}</span>
                </span>
              </div>
              <div className="mt-2 rounded-xl border border-beige bg-cream p-3">
                {!selectedDate ? (
                  <p className="py-2.5 text-center text-xs text-soft-gray">
                    Select a date above to view available open times.
                  </p>
                ) : loadingSlots ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-soft-gray">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sage" />
                    <span>Checking open slots...</span>
                  </div>
                ) : availableTimes.length === 0 ? (
                  <p className="py-2.5 text-center text-xs text-warm-gray">
                    No available slots on this date. Please pick another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {availableTimes.map((time) => {
                      const sel = selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            'flex items-center justify-center rounded-lg border py-1.5 text-xs font-semibold transition-all duration-150',
                            sel
                              ? 'border-sage bg-sage text-white shadow-sm ring-1 ring-sage/30'
                              : 'border-beige/80 bg-white text-charcoal hover:border-sage/40 hover:bg-sage/5',
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Your Details Form */}
          <div className="flex flex-col gap-3 lg:col-span-4 xl:col-span-3">
            <SectionHeader icon={<User className="h-3 w-3 text-dusty-blue-dark" />} label="Your Details" />
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2.5">
              {!authLoading && !user && (
                <p className="text-[11px] leading-relaxed text-warm-gray">
                  Sign in to save your booking, course progress, and resources in one place.{' '}
                  <Link
                    to="/auth/login"
                    state={{ from: '/booking' }}
                    className="font-medium text-sage-dark hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              )}
              <div className="shrink-0 flex flex-col gap-2.5">
                <Field label="Full Name" icon={<User className="h-3 w-3" />}>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email" icon={<Mail className="h-3 w-3" />}>
                  <input
                    type="email"
                    required
                    readOnly={Boolean(user)}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={cn(
                      'w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30',
                      user && 'cursor-default bg-beige/40 text-warm-gray',
                    )}
                    placeholder="your@email.com"
                  />
                </Field>
                <Field label="Notes (optional)" icon={<MessageSquare className="h-3 w-3" />}>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full resize-none rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="Anything to share before our session..."
                  />
                </Field>
              </div>

              <div className="shrink-0 flex flex-col gap-2.5">
                <div
                  className={cn(
                    'rounded-xl border p-3 transition-all duration-300',
                    selectedAppointment ? 'border-sage/20 bg-sage/5' : 'border-beige bg-cream/50',
                  )}
                >
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-warm-gray">Summary</p>
                  <div className="space-y-1.5 text-[11px]">
                    <SummaryRow label="Session" value={selectedAppointment?.title ?? '—'} />
                    <SummaryRow
                      label="Date"
                      value={
                        selectedDate
                          ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'
                      }
                    />
                    <SummaryRow label="Time" value={selectedTime ?? '—'} />
                    <SummaryRow label="Timezone" value={userTimeZone.replace(/_/g, ' ')} />
                    {selectedAppointment && (
                      <div className="flex justify-between gap-2 border-t border-beige/80 pt-1.5">
                        <span className="text-soft-gray">Total</span>
                        <span className="font-semibold text-charcoal">
                          {selectedAppointment.price === 0 ? 'Free' : `$${selectedAppointment.price}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {submitError && (
                  <p className="text-center text-xs text-terracotta-dark">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? 'Confirming...' : 'Confirm Booking'} <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Column 4: Right Column Container with Quote and Previous Sessions */}
          <div className="flex flex-col gap-3.5 lg:col-span-12 xl:col-span-3">
            <BookingQuoteFooter />
            <UserPreviousBookings
              bookings={userPreviousBookings}
              loading={loadingUserBookings}
              user={user}
              onRefresh={fetchUserBookings}
            />
          </div>
        </div>
      </div>

      {hoveredType && hoveredMeta && hoveredSession &&
        createPortal(
          <SessionTooltip
            id={`session-tip-${hoveredType.id}`}
            title={hoveredType.title}
            description={hoveredType.description}
            expectations={hoveredMeta.expectations}
            rect={hoveredSession.rect}
            accent={hoveredMeta.accent}
            icon={hoveredMeta.icon}
          />,
          document.body,
        )}
    </div>
  );
}

const bookingStatusBadges: Record<
  BookingType['status'],
  { label: string; className: string }
> = {
  pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed: { label: 'Confirmed', className: 'bg-sage/20 text-sage-dark border-sage/40' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700 border-rose-300' },
  pending_calendar_sync: { label: 'Sync Pending', className: 'bg-purple-100 text-purple-800 border-purple-300' },
};

function UserPreviousBookings({
  bookings,
  loading,
  user,
  onRefresh,
}: {
  bookings: BookingType[];
  loading: boolean;
  user: SupabaseUser | null;
  onRefresh: () => Promise<void> | void;
}) {
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingType | null>(null);
  const [cancelBooking, setCancelBooking] = useState<BookingType | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-beige/80 bg-cream/90 p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sage-dark" />
          <span className="text-xs text-soft-gray">Checking your session history...</span>
        </div>
      </div>
    );
  }

  if (!user && bookings.length === 0) {
    return (
      <div className="rounded-xl border border-beige/80 bg-cream/90 p-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <CalendarCheck className="h-3.5 w-3.5 text-sage-dark" />
          <span className="text-xs font-semibold text-charcoal">Returning Client?</span>
        </div>
        <p className="text-[11px] leading-relaxed text-warm-gray">
          <Link to="/auth/login" state={{ from: '/booking' }} className="font-medium text-sage-dark hover:underline">
            Sign in
          </Link>{' '}
          to view your session history, reschedule sessions, access Google Meet links, and coaching notes in one place.
        </p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-beige/80 bg-cream/90 p-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <CalendarCheck className="h-3.5 w-3.5 text-sage-dark" />
          <span className="text-xs font-semibold text-charcoal">Your Sessions</span>
        </div>
        <p className="text-[11px] leading-relaxed text-soft-gray">
          No previous sessions yet. Once booked and confirmed, your upcoming meetings, rescheduling options, and video links will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-beige/80 bg-cream/90 p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-3.5 w-3.5 text-sage-dark" />
            <span className="text-xs font-semibold text-charcoal">Your Sessions ({bookings.length})</span>
          </div>
          <span className="text-[10px] text-soft-gray">History & Options</span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {bookings.map((b) => {
            const badge = bookingStatusBadges[b.status] || bookingStatusBadges.pending;
            const canModify = b.status !== 'cancelled' && b.status !== 'completed';

            return (
              <div
                key={b.id}
                className="rounded-xl border border-beige bg-white p-2.5 transition hover:border-sage/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-serif text-xs font-semibold text-charcoal leading-snug">
                    {b.appointment_type_title}
                  </span>
                  <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium', badge.className)}>
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2.5 text-[10px] text-warm-gray">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5 text-soft-gray" />
                    {b.appointment_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-soft-gray" />
                    {b.appointment_time}
                  </span>
                </div>

                {b.google_meet_url && b.status === 'confirmed' && (
                  <a
                    href={b.google_meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sage/10 px-2 py-1 text-[10px] font-medium text-sage-dark hover:bg-sage/20 transition"
                  >
                    <Video className="h-2.5 w-2.5" />
                    Join Google Meet
                  </a>
                )}

                {canModify && (
                  <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-beige/60 pt-2">
                    <button
                      type="button"
                      onClick={() => setRescheduleBooking(b)}
                      className="rounded-lg bg-cream px-2 py-1 text-[10px] font-medium text-charcoal hover:bg-beige/60 hover:text-sage-dark transition"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelBooking(b)}
                      className="rounded-lg bg-cream px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {rescheduleBooking && (
        <ClientRescheduleModal
          booking={rescheduleBooking}
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={async () => {
            await onRefresh();
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
            await onRefresh();
            setCancelBooking(null);
          }}
        />
      )}
    </>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-xl border border-sage/10 bg-gradient-to-br from-sage/20 to-sage/5 shadow-sm">
        {icon}
      </span>
      <span className="text-xs font-medium tracking-wide text-warm-gray">{label}</span>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-warm-gray">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-soft-gray [&:has(+textarea)]:top-2.5 [&:has(+textarea)]:translate-y-0">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-soft-gray">{label}</span>
      <span className="text-right font-medium leading-tight text-charcoal">{value}</span>
    </div>
  );
}

const QUOTE_TEXT =
  "You don't have to hold it all alone. This session is your space to breathe, be heard, and leave with one clear next step.";

function BookingQuoteFooter() {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(QUOTE_TEXT.slice(0, index));
      if (index >= QUOTE_TEXT.length) {
        window.clearInterval(timer);
        setDone(true);
      }
    }, 32);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="shrink-0 rounded-xl border border-beige/80 bg-cream/90 px-4 py-3 shadow-sm">
      <p className="font-serif text-sm italic leading-relaxed text-charcoal">
        &ldquo;{displayed}
        {!done && <span className="ml-0.5 inline-block animate-pulse text-sage-dark">|</span>}
        {done ? '\u201d' : null}
      </p>
      <p className="mt-2 text-[11px] text-soft-gray">
        Need help?{' '}
        <Link to="/contact" className="font-medium text-sage-dark hover:underline">
          Contact me
        </Link>
      </p>
    </div>
  );
}

function SessionTooltip({
  id,
  title,
  description,
  expectations,
  rect,
  accent,
  icon: Icon,
}: {
  id: string;
  title: string;
  description: string;
  expectations: string[];
  rect: DOMRect;
  accent: string;
  icon: typeof Heart;
}) {
  const width = 288;
  const margin = 12;
  const left = Math.min(Math.max(margin, rect.right + margin), window.innerWidth - width - margin);
  const top = Math.min(Math.max(margin, rect.top), window.innerHeight - 280);

  return (
    <div
      id={id}
      role="tooltip"
      className="pointer-events-none fixed z-[200] w-72 rounded-2xl border border-beige bg-white p-4 shadow-xl ring-1 ring-sage/10"
      style={{ left, top }}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-sm font-semibold text-charcoal">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-warm-gray">{description}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-sage-dark">What to expect</p>
      <ul className="mt-2 space-y-1.5">
        {expectations.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-charcoal">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-sage" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
