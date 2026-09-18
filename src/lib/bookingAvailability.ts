import { supabase } from './supabase';

export interface AppointmentConfig {
  title: string;
  durationMinutes: number;
  bufferMinutes: number;
}

export const APPOINTMENT_CONFIG: Record<string, AppointmentConfig> = {
  initial: { title: 'Initial Consultation', durationMinutes: 75, bufferMinutes: 15 },
  'coaching-60': { title: '60-Minute Coaching Session', durationMinutes: 60, bufferMinutes: 15 },
  'intensive-90': { title: '90-Minute Intensive', durationMinutes: 90, bufferMinutes: 30 },
  family: { title: 'Family Consultation', durationMinutes: 75, bufferMinutes: 15 },
  'follow-up': { title: 'Follow-up Session', durationMinutes: 45, bufferMinutes: 15 },
};

export interface WorkingInterval {
  start: string;
  end: string;
}

export interface DbAvailabilityRule {
  id?: string;
  rule_type: 'recurring' | 'date_override' | 'date_closed';
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  appointment_type_id?: string;
  is_active: boolean;
}

const DEFAULT_COACH_RULES: DbAvailabilityRule[] = [
  { rule_type: 'recurring', day_of_week: 0, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 1, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 1, start_time: '16:00', end_time: '18:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 2, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 3, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 3, start_time: '16:00', end_time: '18:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 4, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 5, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
  { rule_type: 'recurring', day_of_week: 6, start_time: '10:00', end_time: '14:00', is_active: true, appointment_type_id: 'all', specific_date: null },
];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function partsInZone(date: Date, timeZone: string): Record<string, number> {
  try {
    const tz = timeZone && timeZone.trim() ? timeZone : 'Africa/Cairo';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    return Object.fromEntries(
      parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
    );
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }
}

export function zonedDateTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  try {
    const [year, month, day] = dateKey.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    let guess = desired;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = partsInZone(new Date(guess), timeZone);
      const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      const adjustment = desired - represented;
      guess += adjustment;
      if (adjustment === 0) break;
    }

    return new Date(guess);
  } catch {
    return new Date(`${dateKey}T${time}:00Z`);
  }
}

export function formatDateKey(date: Date, timeZone: string): string {
  try {
    const parts = partsInZone(date, timeZone);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatTime(date: Date, timeZone: string): string {
  try {
    const parts = partsInZone(date, timeZone);
    return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  } catch {
    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  }
}

export function weekdayForDate(dateKey: string, timeZone: string): number {
  try {
    const midday = zonedDateTimeToUtc(dateKey, '12:00', timeZone);
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || 'Africa/Cairo', weekday: 'short' }).format(midday);
    return WEEKDAY_INDEX[weekday] ?? 0;
  } catch {
    const d = new Date(`${dateKey}T12:00:00Z`);
    return d.getUTCDay();
  }
}

export function buildOpenIntervalsForCoachDate(
  coachDate: string,
  coachTimeZone: string,
  rules: DbAvailabilityRule[],
  appointmentTypeId = 'all'
): WorkingInterval[] {
  const isDateClosed = rules.some(
    (r) => r.is_active && r.rule_type === 'date_closed' && r.specific_date === coachDate
  );
  if (isDateClosed) return [];

  const matchesType = (r: DbAvailabilityRule) =>
    !r.appointment_type_id ||
    r.appointment_type_id === 'all' ||
    appointmentTypeId === 'all' ||
    r.appointment_type_id === appointmentTypeId;

  const dateOverrides = rules.filter(
    (r) =>
      r.is_active &&
      r.rule_type === 'date_override' &&
      r.specific_date === coachDate &&
      r.start_time &&
      r.end_time &&
      matchesType(r)
  );
  if (dateOverrides.length > 0) {
    return dateOverrides.map((r) => ({ start: r.start_time!, end: r.end_time! }));
  }

  const weekday = weekdayForDate(coachDate, coachTimeZone);
  const recurringRules = rules.filter(
    (r) =>
      r.is_active &&
      r.rule_type === 'recurring' &&
      r.day_of_week === weekday &&
      r.start_time &&
      r.end_time &&
      matchesType(r)
  );

  if (recurringRules.length > 0) {
    return recurringRules.map((r) => ({ start: r.start_time!, end: r.end_time! }));
  }

  // If no specific DB rules found for this day, use default 10:00-14:00
  return [{ start: '10:00', end: '14:00' }];
}

export interface CandidateSlot {
  label: string;
  startsAt: Date;
  endsAt: Date;
  reservedUntil: Date;
}

export function candidateSlotsForClientDate(options: {
  clientDate: string;
  clientTimeZone: string;
  coachTimeZone: string;
  durationMinutes: number;
  bufferMinutes: number;
  openIntervalsProvider: (coachDate: string) => WorkingInterval[];
  intervalMinutes?: number;
}): CandidateSlot[] {
  const { clientDate, clientTimeZone, coachTimeZone, durationMinutes, bufferMinutes, openIntervalsProvider } = options;
  const intervalMinutes = options.intervalMinutes ?? 30;
  const clientDayStart = zonedDateTimeToUtc(clientDate, '00:00', clientTimeZone);
  const nextDate = new Date(Date.UTC(...(clientDate.split('-').map(Number).map((val, idx) => idx === 1 ? val - 1 : val) as [number, number, number])));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateKey = nextDate.toISOString().slice(0, 10);
  const clientDayEnd = zonedDateTimeToUtc(nextDateKey, '00:00', clientTimeZone);

  const coachDates = new Set<string>();
  for (let offset = -1; offset <= 1; offset += 1) {
    const probe = new Date(clientDayStart.getTime() + offset * 24 * 60 * 60 * 1000);
    coachDates.add(formatDateKey(probe, coachTimeZone));
  }
  coachDates.add(formatDateKey(clientDayEnd, coachTimeZone));

  const slots: CandidateSlot[] = [];
  for (const coachDate of coachDates) {
    const intervals = openIntervalsProvider(coachDate);
    for (const interval of intervals) {
      const intervalStart = zonedDateTimeToUtc(coachDate, interval.start, coachTimeZone);
      const intervalEnd = zonedDateTimeToUtc(coachDate, interval.end, coachTimeZone);
      for (let startsAt = intervalStart; startsAt.getTime() < intervalEnd.getTime(); startsAt = new Date(startsAt.getTime() + intervalMinutes * 60_000)) {
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const reservedUntil = new Date(endsAt.getTime() + bufferMinutes * 60_000);
        if (reservedUntil > intervalEnd || startsAt < clientDayStart || startsAt >= clientDayEnd) continue;
        slots.push({ label: formatTime(startsAt, clientTimeZone), startsAt, endsAt, reservedUntil });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Fetch availability directly from coach rules & database bookings
 */
export async function getClientAvailableSlots(options: {
  date: string;
  appointmentTypeId?: string;
  timeZone?: string;
  coachTimeZone?: string;
}): Promise<string[]> {
  const { date, appointmentTypeId = 'initial', timeZone = 'Africa/Cairo', coachTimeZone = 'Africa/Cairo' } = options;
  const config = APPOINTMENT_CONFIG[appointmentTypeId] || APPOINTMENT_CONFIG.initial;
  const standardFallback = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '16:00', '16:30', '17:00'];

  try {
    // 1. Fetch active coach availability rules
    let rules: DbAvailabilityRule[] = DEFAULT_COACH_RULES;
    try {
      const { data, error } = await supabase
        .from('coach_availability_rules')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        rules = data as DbAvailabilityRule[];
      }
    } catch {
      rules = DEFAULT_COACH_RULES;
    }

    const openIntervalsProvider = (coachDate: string) =>
      buildOpenIntervalsForCoachDate(coachDate, coachTimeZone, rules, appointmentTypeId);

    // 2. Generate candidate slots from coach rules & session duration
    const candidateSlots = candidateSlotsForClientDate({
      clientDate: date,
      clientTimeZone: timeZone,
      coachTimeZone,
      durationMinutes: config.durationMinutes,
      bufferMinutes: config.bufferMinutes,
      openIntervalsProvider,
    });

    const labels = candidateSlots.map((slot) => slot.label);
    if (labels.length > 0) {
      return labels;
    }

    return standardFallback;
  } catch (err) {
    console.error('getClientAvailableSlots error:', err);
    return standardFallback;
  }
}
