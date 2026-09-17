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

export type WorkingHours = Partial<Record<number, WorkingInterval[]>>;

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

export const DEFAULT_WORKING_HOURS: WorkingHours = {};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function isValidDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsInZone(date: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
  );
}

export function zonedDateTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  if (!isValidDateKey(dateKey) || !isValidTime(time) || !isValidTimeZone(timeZone)) {
    throw new Error('Invalid date, time, or timezone.');
  }
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

  const result = new Date(guess);
  const verified = partsInZone(result, timeZone);
  if (
    verified.year !== year || verified.month !== month || verified.day !== day ||
    verified.hour !== hour || verified.minute !== minute
  ) {
    throw new Error('The selected local time does not exist in that timezone.');
  }
  return result;
}

export function formatDateKey(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function formatTime(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone);
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function weekdayForDate(dateKey: string, timeZone: string): number {
  const midday = zonedDateTimeToUtc(dateKey, '12:00', timeZone);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(midday);
  return WEEKDAY_INDEX[weekday];
}

export function parseWorkingHours(raw: string | undefined): WorkingHours {
  if (!raw) return DEFAULT_WORKING_HOURS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') throw new Error('Expected an object.');
    const result: WorkingHours = {};
    for (const [dayKey, intervals] of Object.entries(parsed as Record<string, unknown>)) {
      const day = Number(dayKey);
      if (!Number.isInteger(day) || day < 0 || day > 6 || !Array.isArray(intervals)) throw new Error('Invalid weekday.');
      result[day] = intervals.map((interval) => {
        if (!interval || typeof interval !== 'object') throw new Error('Invalid interval.');
        const { start, end } = interval as Record<string, unknown>;
        if (typeof start !== 'string' || typeof end !== 'string' || !isValidTime(start) || !isValidTime(end) || start >= end) {
          throw new Error('Invalid working-hours time range.');
        }
        return { start, end };
      });
    }
    return result;
  } catch (error) {
    throw new Error(`BOOKING_WORKING_HOURS is invalid: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function buildOpenIntervalsForCoachDate(
  coachDate: string,
  coachTimeZone: string,
  rules: DbAvailabilityRule[],
  appointmentTypeId = 'all'
): WorkingInterval[] {
  // Check if date is explicitly marked closed
  const isDateClosed = rules.some(
    (r) => r.is_active && r.rule_type === 'date_closed' && r.specific_date === coachDate
  );
  if (isDateClosed) return [];

  // Helper to check if rule matches appointment type
  const matchesType = (r: DbAvailabilityRule) =>
    !r.appointment_type_id ||
    r.appointment_type_id === 'all' ||
    appointmentTypeId === 'all' ||
    r.appointment_type_id === appointmentTypeId;

  // Check if there are date-specific open overrides for this exact date
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

  // Otherwise, use active weekly recurring rules for this weekday
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

  // If no recurring rules exist for this weekday, return empty (CLOSED BY DEFAULT)
  return recurringRules.map((r) => ({ start: r.start_time!, end: r.end_time! }));
}

export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
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
  const nextDate = new Date(Date.UTC(...clientDate.split('-').map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]));
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
