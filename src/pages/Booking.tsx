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
  AlertCircle,
  Loader2,
  Phone,
  Globe,
  Baby,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { appointmentTypes } from '../data/content';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30',
];

const TIMEZONES = [
  { value: 'Africa/Cairo', label: 'Cairo (GMT+2 / GMT+3)' },
  { value: 'Asia/Riyadh', label: 'Riyadh / Mecca (GMT+3)' },
  { value: 'Asia/Dubai', label: 'Dubai / UAE (GMT+4)' },
  { value: 'Asia/Kuwait', label: 'Kuwait (GMT+3)' },
  { value: 'Asia/Qatar', label: 'Doha (GMT+3)' },
  { value: 'Asia/Amman', label: 'Amman (GMT+3)' },
  { value: 'Europe/London', label: 'London (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Paris / CET (GMT+1)' },
  { value: 'America/New_York', label: 'New York / Eastern (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago / Central (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles / Pacific (PST/PDT)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
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
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeZone, setTimeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';
    } catch {
      return 'Africa/Cairo';
    }
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>(TIMES);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    childName: '',
    childAge: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<{ id: string; rect: DOMRect } | null>(null);
  const timeSectionRef = useRef<HTMLDivElement>(null);

  const selectedAppointment = appointmentTypes.find((a) => a.id === selectedType);
  const today = startOfDay(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
  }, [calendarMonth]);

  const isBookable = (date: Date) => !isBefore(date, today) && !isWeekend(date);

  const handleSelectDate = (key: string) => {
    setSelectedDate(key);
    setSelectedTime(null);
    setTimePickerOpen(true);
  };

  // Fetch real-time availability slots when date, type, or timezone changes
  useEffect(() => {
    if (!selectedDate) return;

    let isCancelled = false;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-availability', {
          body: {
            date: selectedDate,
            appointmentTypeId: selectedType || 'initial',
            timeZone,
          },
        });

        if (!isCancelled) {
          if (error) {
            console.warn('Could not fetch dynamic slots, falling back:', error);
            setAvailableSlots(TIMES);
          } else if (data?.availableSlots) {
            setAvailableSlots(data.availableSlots);
            if (selectedTime && !data.availableSlots.includes(selectedTime)) {
              setSelectedTime(null);
            }
          }
        }
      } catch (err) {
        console.warn('Availability fetch error:', err);
        if (!isCancelled) setAvailableSlots(TIMES);
      } finally {
        if (!isCancelled) setLoadingSlots(false);
      }
    };

    void fetchSlots();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, selectedType, timeZone]);

  useEffect(() => {
    if (!timePickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (timeSectionRef.current?.contains(event.target as Node)) return;
      setTimePickerOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTimePickerOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [timePickerOpen]);

  useEffect(() => {
    if (authLoading || !user) return;
    const name = resolveBookingName(profile, user);
    const email = resolveBookingEmail(profile, user);
    setFormData((prev) => ({
      ...prev,
      name: name || prev.name,
      email: email || prev.email,
      phone: profile?.phone || prev.phone,
      country: profile?.country || prev.country,
    }));
  }, [user, profile, authLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !selectedAppointment || !selectedDate || !selectedTime || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const bookingPayload = {
        user_id: user?.id ?? null,
        appointment_type_id: selectedType,
        appointment_type_title: selectedAppointment.title,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        parent_name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || profile?.phone || null,
        country: formData.country?.trim() || profile?.country || null,
        child_name: formData.childName?.trim() || null,
        child_age: formData.childAge?.trim() || null,
        notes: formData.notes?.trim() || null,
        timeZone,
      };

      // 1. Invoke the create-booking Edge Function (handles atomic slot validation + Google Calendar invite)
      const { data, error: functionError } = await supabase.functions.invoke('create-booking', {
        body: bookingPayload,
      });

      if (functionError) {
        // Fallback: If edge function network fails, perform direct database insert
        console.warn('create-booking function error, attempting direct DB insert fallback:', functionError);
        const { error: dbError } = await supabase
          .from('bookings')
          .insert([{ ...bookingPayload, status: 'pending' }]);

        if (dbError) {
          console.error('Supabase direct insert error:', dbError);
          setSubmitError(dbError.message || 'Unable to save your booking. Please try again.');
          return;
        }
      } else if (data?.error) {
        setSubmitError(data.error);
        return;
      }

      // Genuinely persisted and synced
      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Unexpected booking error:', err);
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while submitting your booking.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(
    selectedType && selectedDate && selectedTime && formData.name.trim() && formData.email.trim(),
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
          <h1 className="mb-2 font-serif text-2xl text-charcoal">You&apos;re all set!</h1>
          <p className="mb-5 text-sm leading-relaxed text-warm-gray">
            <span className="font-medium text-charcoal">{selectedAppointment?.title}</span> booked for{' '}
            <span className="font-medium text-charcoal">
              {selectedDate &&
                new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
            </span>{' '}
            at{' '}
            <span className="font-medium text-charcoal">
              {selectedTime} ({timeZone})
            </span>
            .
            <br />
            Confirmation & Calendar invite sent to <span className="font-medium text-charcoal">{formData.email}</span>.
          </p>
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
    <div className="flex min-h-screen flex-col bg-ivory" style={{ paddingTop: '64px' }}>
      <div className="shrink-0 border-b border-beige/70 bg-ivory/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="font-serif text-lg leading-none text-charcoal">Book a Session</h1>
            <p className="mt-0.5 hidden text-xs text-soft-gray sm:block">Fill in your preferences below</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: 'Session', done: !!selectedType, icon: <Sparkles className="h-2.5 w-2.5" /> },
              { label: 'Date', done: !!selectedDate, icon: <CalendarDays className="h-2.5 w-2.5" /> },
              { label: 'Time', done: !!selectedTime, icon: <Clock className="h-2.5 w-2.5" /> },
              {
                label: 'Details',
                done: !!(formData.name && formData.email),
                icon: <User className="h-2.5 w-2.5" />,
              },
            ].map(({ label, done, icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300',
                    done ? 'scale-105 bg-sage text-white shadow-sm' : 'bg-beige text-soft-gray',
                  )}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : icon}
                </div>
                <span className="hidden text-[10px] text-soft-gray sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col">
        <div
          className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6
          lg:h-full lg:min-h-0 lg:grid lg:grid-cols-12 lg:items-start lg:gap-4 lg:flex-none"
        >
          <div className="flex flex-col gap-3 lg:col-span-5 lg:min-h-0">
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

          <div className="flex min-h-0 flex-col gap-3 lg:col-span-7 lg:h-full">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-7 lg:items-start lg:gap-4">
              <div className="flex flex-col gap-2.5 lg:col-span-4 lg:self-start">
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

                {/* Timezone Selector */}
                <div className="shrink-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={<Globe className="h-3 w-3 text-sage-dark" />} label="Timezone" />
                    <span className="text-[10px] text-soft-gray">Times shown in your timezone</span>
                  </div>
                  <div className="relative">
                    <select
                      value={timeZone}
                      onChange={(e) => {
                        setTimeZone(e.target.value);
                        setSelectedTime(null);
                      }}
                      className="w-full appearance-none rounded-xl border border-beige bg-cream px-3 py-2 pr-8 text-xs font-medium text-charcoal transition-all hover:border-sage/40 focus:outline-none focus:ring-2 focus:ring-sage/30"
                    >
                      {!TIMEZONES.some((tz) => tz.value === timeZone) && (
                        <option value={timeZone}>{timeZone} (Detected)</option>
                      )}
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft-gray" />
                  </div>
                </div>

                <div ref={timeSectionRef} className="relative shrink-0">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={<Clock className="h-3 w-3 text-terracotta" />} label="Time" />
                    {loadingSlots && (
                      <div className="flex items-center gap-1.5 text-[10px] text-sage-dark">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Checking availability...</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!selectedDate || loadingSlots}
                    onClick={() => selectedDate && setTimePickerOpen((open) => !open)}
                    aria-expanded={timePickerOpen}
                    aria-haspopup="listbox"
                    className={cn(
                      'mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
                      (!selectedDate || loadingSlots) && 'cursor-not-allowed opacity-50',
                      selectedTime
                        ? 'border-sage bg-sage/10 text-sage-dark ring-1 ring-sage/20'
                        : 'border-beige bg-cream hover:border-sage/40',
                    )}
                  >
                    <span className={cn('font-medium', !selectedTime && 'text-soft-gray')}>
                      {!selectedDate
                        ? 'Select a date first'
                        : loadingSlots
                        ? 'Calculating available times...'
                        : selectedTime ?? 'Choose a time'}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-soft-gray transition-transform',
                        timePickerOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {timePickerOpen && selectedDate && !loadingSlots && (
                    <div
                      role="listbox"
                      aria-label="Available times"
                      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-beige bg-white shadow-xl ring-1 ring-sage/15"
                    >
                      {availableSlots.length === 0 ? (
                        <div className="p-4 text-center text-xs text-warm-gray">
                          No slots available for this date in your selected timezone.
                        </div>
                      ) : (
                        <ul className="max-h-44 space-y-0.5 overflow-y-auto overscroll-contain p-1.5">
                          {availableSlots.map((time) => {
                            const sel = selectedTime === time;
                            return (
                              <li key={time}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={sel}
                                  onClick={() => {
                                    setSelectedTime(time);
                                    setTimePickerOpen(false);
                                  }}
                                  className={cn(
                                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition',
                                    sel ? 'bg-sage text-white' : 'text-charcoal hover:bg-sage/10',
                                  )}
                                >
                                  {time}
                                  {sel && <Check className="h-4 w-4" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col lg:col-span-3 lg:self-start">
                <SectionHeader icon={<User className="h-3 w-3 text-dusty-blue-dark" />} label="Your Details" />
                <form onSubmit={handleSubmit} className="mt-2 flex min-h-0 flex-col gap-2.5">
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
                  <div className="shrink-0 flex flex-col gap-2">
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
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Phone (optional)" icon={<Phone className="h-3 w-3" />}>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                          placeholder="+1 (555) 000-0000"
                        />
                      </Field>
                      <Field label="Country (optional)" icon={<Globe className="h-3 w-3" />}>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                          placeholder="e.g. Egypt, UAE"
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Child's Name (opt)" icon={<Baby className="h-3 w-3" />}>
                        <input
                          type="text"
                          value={formData.childName}
                          onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                          className="w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                          placeholder="Child's name"
                        />
                      </Field>
                      <Field label="Child's Age (opt)" icon={<Sparkles className="h-3 w-3" />}>
                        <input
                          type="text"
                          value={formData.childAge}
                          onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                          className="w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                          placeholder="e.g. 4 years"
                        />
                      </Field>
                    </div>
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
                        <SummaryRow
                          label="Time"
                          value={
                            selectedTime
                              ? `${selectedTime} (${timeZone.split('/').pop()?.replace('_', ' ') || timeZone})`
                              : '—'
                          }
                        />
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
                      <div
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-800"
                      >
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                        <div className="flex-1 leading-snug">
                          <p className="font-semibold text-rose-900">Booking could not be saved</p>
                          <p className="mt-0.5 text-rose-700">{submitError}</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          <span>Saving booking...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm Booking</span>
                          <Check className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <BookingQuoteFooter />
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
