import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  Check,
  Clock,
  ArrowRight,
  User,
  Mail,
  MessageSquare,
  Sparkles,
  Heart,
  Users,
  Loader2,
  CalendarCheck,
  Video,
  Globe,
  Info,
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
import { getClientAvailableSlots } from '../lib/bookingAvailability';
import { BookableMonthCalendar } from '../components/booking/BookableMonthCalendar';
import { DiscoveryIntakeModal, ConfettiBurst } from '../components/booking/DiscoveryIntakeModal';
import { CoachingPackagesView } from '../components/booking/CoachingPackagesView';
import { GroupCoachingView } from '../components/booking/GroupCoachingView';
import type { DiscoveryIntake } from '../types';

type BookingDoorId = 'discovery' | 'coaching' | 'groups';

interface BookingDoorItem {
  id: BookingDoorId;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  badge?: string;
  icon: React.ReactNode;
  highlights: string[];
  expectations: string[];
  takeaway: string;
  guarantee: string;
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
  const [selectedDoor, setSelectedDoor] = useState<BookingDoorId>('discovery');
  const [selectedType, setSelectedType] = useState<string | null>('initial');
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    if (d.getHours() >= 14) {
      d.setDate(d.getDate() + 1);
    }
    return format(d, 'yyyy-MM-dd');
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [userPreviousBookings, setUserPreviousBookings] = useState<BookingType[]>([]);
  const [loadingUserBookings, setLoadingUserBookings] = useState(false);

  // CRITICAL RULE: 1:1 Coaching packages open strictly AFTER ATTENDING the Discovery Call
  // (status === 'completed') OR if the admin explicitly opens it for them.
  // Merely booking a Discovery Call (status === 'confirmed') does NOT open it!
  const hasAttendedDiscovery = Boolean(
    user && userPreviousBookings.some((b) => b.appointment_type_id === 'initial' && b.status === 'completed')
  );
  const isAdminOpened = Boolean(
    profile?.role === 'admin' || (profile as any)?.coaching_unlocked
  );
  const isCoachingUnlocked = hasAttendedDiscovery || isAdminOpened;
  const isReturningClient = isCoachingUnlocked;

  const [returningCoachingTab, setReturningCoachingTab] = useState<'single' | 'packages'>('single');
  const [hoveredDoor, setHoveredDoor] = useState<BookingDoorItem | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const doors = useMemo<BookingDoorItem[]>(() => [
    {
      id: 'discovery',
      eyebrow: 'Recommended First Step',
      title: 'Discovery Call',
      description:
        'A calm 30-minute private call to find a gentle, clear way forward together.',
      meta: '30 min · EGP 500 · Tuesdays',
      badge: 'Start Here',
      icon: <Sparkles className="h-4 w-4" />,
      highlights: ['Private Google Meet', 'Zero judgment', 'Clear next steps'],
      expectations: [
        'A safe, unhurried space to share what feels heavy without judgment.',
        'Unpack root causes behind meltdowns, emotional storms, and stress.',
        'Clear, honest guidance on whether 1:1 or group support fits best.',
        'Zero pressure or sales pitches — pure listening and genuine support.',
      ],
      takeaway: 'A deep breath of relief, clarity on your child’s needs, and peace of mind on what to do next.',
      guarantee: 'Private Google Meet · Calendar invite and gentle reminder sent right away.',
    },
    {
      id: 'coaching',
      eyebrow: 'Dedicated 1-on-1 Support',
      title: '1:1 Parent Coaching',
      description:
        'Focused time together to soothe meltdowns & build calm at home.',
      meta: isReturningClient ? 'Single slot (EGP 3,500) & Packages' : 'Tailored Plan · 60 min',
      badge: isReturningClient ? 'Unlocked' : undefined,
      icon: <Heart className="h-4 w-4" />,
      highlights: ['Weekly 60-min deep dives', 'Gentle, practical scripts', 'WhatsApp voice support'],
      expectations: [
        'Dedicated 60-minute deep dives focused entirely on your child and home.',
        'Loving boundary scripts and practical ways to calm big meltdowns.',
        'Nervous system care to help you parent from patience, not exhaustion.',
        'Private WhatsApp voice check-ins between sessions whenever needed.',
      ],
      takeaway: 'A calmer, more connected home where both you and your child feel deeply understood.',
      guarantee: 'Private session recording provided if you wish · Reschedule anytime with 24h notice.',
    },
    {
      id: 'groups',
      eyebrow: 'Small Parent Circles',
      title: 'Small Parent Circles',
      description:
        'A caring circle of 4 to 8 parents walking through the same parenting moments.',
      meta: '4–8 Parents · Coming Soon',
      badge: 'Coming Soon',
      icon: <Users className="h-4 w-4" />,
      highlights: ['Small group (4–8 parents)', 'Real parent companionship', 'Practical tools for home'],
      expectations: [
        'Small, intimate circles (4–8 parents) so everyone feels heard and unhurried.',
        'Focused topics on shared challenges (meltdowns, sleep, parental burnout).',
        'Heartfelt reassurance and companionship — you are not alone in this.',
        'Gentle guided practice with scripts and practical tools for everyday life.',
      ],
      takeaway: 'Practical parenting tools and a warm community of parents who truly understand.',
      guarantee: 'Group schedule arranged warmly together once 4 parents join.',
    },
  ], [isReturningClient]);

  const selectedAppointment = appointmentTypes.find((a) => a.id === selectedType);

  const userTimeZone = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz && tz.trim() ? tz : 'Africa/Cairo';
    } catch {
      return 'Africa/Cairo';
    }
  }, []);

  const handleSelectDate = (key: string) => {
    setSelectedDate(key);
    setSelectedTime(null);
  };

  const handleSelectDoor = (doorId: BookingDoorId) => {
    setSelectedDoor(doorId);
    if (doorId === 'discovery') {
      setSelectedType('initial');
    } else if (doorId === 'coaching') {
      setSelectedType(isReturningClient ? 'coaching-60' : null);
    } else {
      setSelectedType(null);
    }
    setSelectedTime(null);
  };

  useEffect(() => {
    if (selectedDoor === 'coaching') {
      setSelectedType(isReturningClient ? 'coaching-60' : null);
    }
  }, [selectedDoor, isReturningClient]);

  useEffect(() => {
    if (!selectedType || !selectedDate) {
      setAvailableTimes([]);
      return;
    }

    let isMounted = true;
    async function loadLiveAvailability() {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const slots = await getClientAvailableSlots({
          date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
          appointmentTypeId: selectedType || 'initial',
          timeZone: userTimeZone,
        });

        if (!isMounted) return;

        const validSlots = Array.isArray(slots) ? slots : [];
        setAvailableTimes(validSlots);
        if (selectedTime && !validSlots.includes(selectedTime)) {
          setSelectedTime(null);
        }
      } catch (err) {
        console.error('Error fetching live availability:', err);
        if (isMounted) {
          setAvailableTimes([]);
          setSelectedTime(null);
          setSlotsError("We couldn't load open times. Please try again in a moment.");
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
        query = query.eq('user_id', user.id);
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

  const submitBooking = async (intake?: DiscoveryIntake) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const userPhone = profile?.phone || (user?.user_metadata as any)?.phone || null;
      const userCountry = profile?.country || (user?.user_metadata as any)?.country || null;

      const body: Record<string, any> = {
        appointment_type_id: selectedType,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        parent_name: formData.name.trim(),
        email: formData.email.trim(),
        phone: userPhone,
        country: userCountry,
        notes: formData.notes.trim() || null,
        timeZone: userTimeZone,
      };

      if (intake) {
        body.intake_topics = intake.topics;
        body.intake_need = intake.need;
        body.intake_duration = intake.duration;
      }

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body,
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

      setIntakeOpen(false);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Booking submission error:', err);
      setSubmitError(err.message || 'Something went wrong while confirming your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    if (selectedType === 'initial') {
      setSubmitError(null);
      setIntakeOpen(true);
    } else {
      void submitBooking();
    }
  };

  const canSubmit = Boolean(
    selectedType && selectedDate && selectedTime && formData.name && formData.email && !submitting,
  );

  if (submitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-ivory px-4">
        {selectedType === 'initial' && <ConfettiBurst />}
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage/15 ring-4 ring-sage/20">
            <Check className="h-6 w-6 text-sage-dark" />
          </div>
          <h1 className="mb-2 font-serif text-2xl text-charcoal">Your Session is Reserved!</h1>
          <div className="mb-5 space-y-2 text-sm leading-relaxed text-warm-gray">
            <p>
              I’m so looking forward to connecting for your{' '}
              <span className="font-medium text-charcoal">{selectedAppointment?.title}</span> on{' '}
              <span className="font-medium text-charcoal">
                {selectedDate &&
                  new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
              </span>{' '}
              at <span className="font-medium text-charcoal">{selectedTime}</span>.
            </p>
            <p className="text-xs text-soft-gray">
              I’ve sent your calendar invitation and Google Meet link directly to{' '}
              <span className="font-medium text-charcoal">{formData.email}</span>.
            </p>
            {selectedType === 'initial' && (
              <div className="rounded-xl border border-sage/30 bg-sage/10 p-3.5 text-left text-xs text-charcoal mt-3">
                <p className="font-serif font-semibold text-sage-dark mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>A note from Mai:</span>
                </p>
                <p className="text-[11.5px] leading-relaxed text-ink-2">
                  Take a gentle breath — you’ve taken a wonderful first step for your family today. In our 30 minutes together, we’ll talk through what feels exhausting or heavy in a safe, judgment-free space. You don't need to prepare anything; just come as you are.
                </p>
              </div>
            )}
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sage-dark"
          >
            Return to Home <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ivory pt-safe pb-safe" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))' }}>
      <div
        className="sticky top-[64px] z-40 shrink-0 border-b border-beige/80 bg-ivory/95 px-3 py-2 sm:px-6 sm:py-2 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
        style={{ top: 'calc(64px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <h1 className="shrink-0 font-serif text-sm sm:text-base md:text-lg leading-none font-semibold text-charcoal">
              Reserve Your Time with Mai
            </h1>
            <span className="hidden lg:inline text-beige-dark font-light text-sm">|</span>
            <GentlePromiseText />
          </div>

          <BookingStepper
            hasSelectedType={!!selectedType}
            hasSelectedDate={!!selectedDate}
            hasSelectedTime={!!selectedTime}
            hasDetails={!!(formData.name.trim() && formData.email.trim())}
            selectedType={selectedType}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-2.5 sm:py-3 sm:px-6
          lg:grid lg:grid-cols-12 lg:items-start lg:gap-4"
        >
          {/* Column 1: Three Doors */}
          <div className="flex flex-col gap-2 lg:col-span-4">
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={<Heart className="h-3 w-3 text-sage-dark" />}
                label="How can I support you?"
              />
              <span className="text-[10px] font-semibold text-sage-dark bg-sage/10 px-2 py-0.5 rounded-full hidden sm:inline-block">
                Hover or tap (i) for details
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {doors.map((door) => {
                const sel = selectedDoor === door.id;
                return (
                  <button
                    key={door.id}
                    type="button"
                    onClick={() => handleSelectDoor(door.id)}
                    onMouseEnter={(e) => {
                      setHoverRect(e.currentTarget.getBoundingClientRect());
                      setHoveredDoor(door);
                    }}
                    onMouseLeave={() => setHoveredDoor(null)}
                    className={cn(
                      'group relative rounded-xl border p-2.5 px-3 text-left transition-all duration-200',
                      sel
                        ? 'border-sage bg-sage/8 shadow-sm ring-1 ring-sage/20'
                        : 'border-beige bg-cream hover:border-sage/40 hover:bg-cream/80',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all',
                          sel ? 'bg-sage/15 text-sage-dark' : 'bg-beige/60 text-soft-gray group-hover:bg-beige',
                        )}
                      >
                        {door.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-sage-dark">
                            {door.eyebrow}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {door.badge && (
                              <span className="rounded-full bg-gold/30 px-1.5 py-0.2 text-[8.5px] font-bold text-charcoal border border-gold/40">
                                {door.badge}
                              </span>
                            )}
                            <span
                              title="Hover or tap to view full service expectations"
                              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-beige/80 text-warm-gray group-hover:bg-sage group-hover:text-white transition"
                            >
                              <Info className="h-2 w-2" />
                            </span>
                          </div>
                        </div>
                        <p className="font-serif text-[13px] font-semibold text-charcoal leading-tight mt-0.5">
                          {door.title}
                        </p>
                        <p className="line-clamp-2 text-[11px] leading-snug text-warm-gray mt-0.5">
                          {door.description}
                        </p>

                        <p className="mt-1 text-[10px] text-soft-gray font-medium">
                          {door.meta}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                          sel ? 'border-sage bg-sage' : 'border-beige group-hover:border-sage/50',
                        )}
                      >
                        {sel && <Check className="h-2 w-2 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Center/Right Area */}
          {selectedDoor === 'groups' ? (
            <div className="flex flex-col gap-4 lg:col-span-8">
              <GroupCoachingView
                isReturningClient={isReturningClient}
                onSelectDiscovery={() => handleSelectDoor('discovery')}
              />
            </div>
          ) : selectedDoor === 'coaching' && !isReturningClient ? (
            <div className="flex flex-col gap-4 lg:col-span-8">
              <CoachingPackagesView
                isReturningClient={false}
                onSelectDiscovery={() => handleSelectDoor('discovery')}
              />
            </div>
          ) : selectedDoor === 'coaching' && isReturningClient && returningCoachingTab === 'packages' ? (
            <div className="flex flex-col gap-4 lg:col-span-8">
              <div className="flex items-center justify-between rounded-xl border border-sage/30 bg-sage/10 p-2.5">
                <span className="text-xs font-semibold text-charcoal">Your Unlocked 1:1 Packages</span>
                <button
                  type="button"
                  onClick={() => setReturningCoachingTab('single')}
                  className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white hover:bg-sage-dark transition"
                >
                  Book Single 60-min Session
                </button>
              </div>
              <CoachingPackagesView
                isReturningClient={true}
                onSelectDiscovery={() => handleSelectDoor('discovery')}
              />
            </div>
          ) : (
            <>
              {/* Column 2: Date & Available Times */}
              <div className="flex flex-col gap-2.5 lg:col-span-4">
                {selectedDoor === 'coaching' && isReturningClient && (
                  <div className="rounded-xl border border-sage/30 bg-sage/10 p-2 text-xs text-charcoal mb-1 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sage-dark text-[11px]">Single 60-Minute Session</p>
                      <p className="text-[10px] text-warm-gray mt-0.5">
                        Book a single session slot anytime on Mondays or Wednesdays.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReturningCoachingTab('packages')}
                      className="shrink-0 rounded-full border border-sage/40 bg-white px-2.5 py-1 text-[11px] font-semibold text-sage-dark hover:bg-sage/10 transition"
                    >
                      View Packages
                    </button>
                  </div>
                )}
                <div>
                  <SectionHeader icon={<Calendar className="h-3 w-3 text-sage-dark" />} label="Choose a date" />
                  <div className="mt-1.5">
                    <BookableMonthCalendar
                      appointmentTypeId={selectedType ?? 'initial'}
                      timeZone={userTimeZone}
                      selectedDate={selectedDate}
                      onSelectDate={handleSelectDate}
                    />
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <SectionHeader icon={<Clock className="h-3 w-3 text-terracotta" />} label="Select a time" />
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-sage/20 bg-sage/10 px-2 py-0.5 text-[10px] font-medium text-sage-dark shadow-xs"
                      title={`Times are automatically converted to your local timezone (${userTimeZone})`}
                    >
                      <Globe className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate max-w-[130px] sm:max-w-[160px]">{userTimeZone.replace(/_/g, ' ')}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 rounded-xl border border-beige bg-cream p-2.5">
                    {!selectedDate ? (
                      <p className="py-2 text-center text-xs text-soft-gray">
                        Please choose a date above to see available times.
                      </p>
                    ) : loadingSlots ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-sage-dark">
                        <Loader2 className="h-4 w-4 animate-spin text-sage" />
                        <span>Looking up open times for you...</span>
                      </div>
                    ) : slotsError ? (
                      <p role="alert" className="py-2 text-center text-xs text-terracotta-dark">
                        {slotsError}
                      </p>
                    ) : availableTimes.length === 0 ? (
                      <p className="py-2 text-center text-xs text-warm-gray">
                        No open times on this date. Please pick another day that suits you.
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
              <div className="flex flex-col gap-2 lg:col-span-4">
                <SectionHeader icon={<User className="h-3 w-3 text-dusty-blue-dark" />} label="Your details" />
                <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2.5">
                  {user && (
                    <div className="flex items-center justify-between rounded-xl border border-sage/30 bg-sage/10 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/20 text-sage-dark font-medium text-[11px]">
                          {(formData.name || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-charcoal text-[11px] truncate">
                            {formData.name || 'Account'}
                          </p>
                          <p className="text-[10px] text-warm-gray truncate">{formData.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-sage-dark bg-white/80 px-2 py-0.5 rounded-full border border-sage/20">
                        Signed in
                      </span>
                    </div>
                  )}
                  <div className="shrink-0 flex flex-col gap-2.5">
                    <Field label="Your Name" icon={<User className="h-3 w-3" />}>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                        placeholder="Your full name"
                      />
                    </Field>
                    <Field label="Email Address" icon={<Mail className="h-3 w-3" />}>
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
                        placeholder="Where I can send your invite & link"
                      />
                    </Field>
                    <Field label="Notes for Mai (optional)" icon={<MessageSquare className="h-3 w-3" />}>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full resize-none rounded-xl border border-beige bg-cream py-2 pl-7 pr-3 text-xs transition-all placeholder:text-soft-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
                        placeholder="Anything you'd like me to know before we talk..."
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
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-warm-gray">Session Summary</p>
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
                        {selectedAppointment && selectedAppointment.price !== undefined && (
                          <div className="flex justify-between gap-2 border-t border-beige/80 pt-1.5">
                            <span className="text-soft-gray">Investment</span>
                            <span className="font-semibold text-charcoal">
                              EGP {selectedAppointment.price.toLocaleString('en-US')}
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
                      {submitting ? 'Holding your time...' : 'Confirm My Session with Mai'} <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* Previous Sessions (If any exist for logged-in user) */}
          {user && userPreviousBookings.length > 0 && (
            <div className="col-span-12 mt-3">
              <UserPreviousBookings
                bookings={userPreviousBookings}
                loading={loadingUserBookings}
                user={user}
                onRefresh={fetchUserBookings}
              />
            </div>
          )}
        </div>
      </div>

      <DiscoveryIntakeModal
        isOpen={intakeOpen}
        dateLabel={
          selectedDate
            ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
            : ''
        }
        timeLabel={selectedTime || ''}
        submitting={submitting}
        error={submitError}
        onClose={() => setIntakeOpen(false)}
        onSubmit={(intake) => void submitBooking(intake)}
      />

      {hoveredDoor && hoverRect &&
        createPortal(
          <ServiceExpectationsTooltip
            door={hoveredDoor}
            rect={hoverRect}
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
          <span className="text-xs font-semibold text-charcoal">Already Working Together?</span>
        </div>
        <p className="text-[11px] leading-relaxed text-warm-gray">
          <Link to="/auth/login" state={{ from: '/booking' }} className="font-medium text-sage-dark hover:underline">
            Sign in
          </Link>{' '}
          to view your upcoming sessions, reschedule if needed, and access your meeting links.
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
          No upcoming sessions yet. Once reserved, your meeting times and video links will be safely stored here for you.
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

const GENTLE_PROMISE_TEXT =
  "There is no judgment here. We look together at what your nervous system and your child’s emotions are trying to tell us.";

function GentlePromiseText() {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(GENTLE_PROMISE_TEXT.slice(0, index));
      if (index >= GENTLE_PROMISE_TEXT.length) {
        window.clearInterval(timer);
        setDone(true);
      }
    }, 28);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center min-w-0 text-left">
      <span className="font-serif italic text-xs text-warm-gray text-left whitespace-nowrap overflow-hidden text-ellipsis">
        &ldquo;{displayed}
        {!done && <span className="inline-block animate-pulse text-sage-dark font-normal">|</span>}
        {done ? '\u201d' : null}
      </span>
      {done && (
        <span className="ml-1 text-[11px] font-semibold text-sage-dark shrink-0">
          — Mai
        </span>
      )}
    </div>
  );
}

function ServiceExpectationsTooltip({
  door,
  rect,
}: {
  door: BookingDoorItem;
  rect: DOMRect;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const approxHeight = 280;
  const initialTop = Math.max(
    12,
    Math.min(
      rect.top + rect.height / 2 - approxHeight / 2,
      window.innerHeight - approxHeight - 12
    )
  );
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: Math.round(initialTop),
    left: Math.round(rect.right + 12),
  });

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const tipHeight = tooltipRef.current.offsetHeight;
    const tipWidth = tooltipRef.current.offsetWidth;
    const margin = 12;

    // Horizontally: position to the right of the card, or flip to left if tight
    let left = rect.right + 12;
    if (left + tipWidth > window.innerWidth - margin) {
      left = Math.max(margin, rect.left - tipWidth - 12);
      if (left < margin) {
        left = Math.max(margin, (window.innerWidth - tipWidth) / 2);
      }
    }

    // Vertically: NOT top-aligned. Center vertically with the hovered door card
    const cardCenterY = rect.top + rect.height / 2;
    let top = cardCenterY - tipHeight / 2;

    // Clamp inside the viewport so the entire tooltip is guaranteed to fit
    if (top + tipHeight > window.innerHeight - margin) {
      top = window.innerHeight - tipHeight - margin;
    }
    if (top < margin) {
      top = margin;
    }

    setCoords({ top: Math.round(top), left: Math.round(left) });
  }, [rect, door]);

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none fixed z-[300] w-[320px] sm:w-[350px] max-w-[calc(100vw-24px)] rounded-2xl border border-sage/40 bg-white p-3 sm:p-3.5 shadow-2xl ring-1 ring-sage/20 animate-in fade-in duration-150"
      style={{ left: coords.left, top: coords.top }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-beige/80 pb-2">
        <div>
          <span className="inline-block rounded-full bg-sage/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sage-dark">
            {door.eyebrow}
          </span>
          <h4 className="mt-0.5 font-serif text-sm sm:text-base font-bold text-charcoal leading-snug">
            {door.title}
          </h4>
          <p className="text-[10px] text-warm-gray">{door.meta}</p>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sage/15 text-sage-dark">
          {door.icon}
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sage-dark flex items-center gap-1.5">
          <span>What to expect when we meet:</span>
        </p>
        <ul className="mt-1 space-y-1 text-[11px]">
          {door.expectations.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-charcoal leading-snug">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-sage" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {door.takeaway && (
        <div className="mt-2 rounded-xl border border-beige bg-cream/70 p-2 text-[10px] text-warm-gray leading-snug">
          <strong className="text-charcoal font-semibold">What you take away: </strong>
          {door.takeaway}
        </div>
      )}

      {door.guarantee && (
        <p className="mt-1.5 text-[9px] text-soft-gray italic">
          🌿 {door.guarantee}
        </p>
      )}
    </div>
  );
}

