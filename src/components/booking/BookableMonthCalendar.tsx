import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthAvailability } from '../../lib/bookingAvailability';
import { cn } from '../../lib/utils';

export interface BookableMonthCalendarProps {
  appointmentTypeId: string;
  timeZone: string;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function BookableMonthCalendar({
  appointmentTypeId,
  timeZone,
  selectedDate,
  onSelectDate,
}: BookableMonthCalendarProps): JSX.Element {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(today));
  const [monthSlots, setMonthSlots] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDatesFound, setNoDatesFound] = useState(false);

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const onSelectDateRef = useRef(onSelectDate);
  onSelectDateRef.current = onSelectDate;

  const isCurrentMonth =
    calendarMonth.getFullYear() === today.getFullYear() &&
    calendarMonth.getMonth() === today.getMonth();

  // Load slots for a specific month
  const loadMonthSlots = useCallback(
    async (month: Date): Promise<Record<string, number>> => {
      setLoading(true);
      setError(null);
      try {
        const monthStr = format(month, 'yyyy-MM');
        const slots = await getMonthAvailability({
          month: monthStr,
          appointmentTypeId,
          timeZone,
        });
        setMonthSlots(slots);
        return slots;
      } catch {
        setError("Couldn't load open dates.");
        return {};
      } finally {
        setLoading(false);
      }
    },
    [appointmentTypeId, timeZone]
  );

  // Find first open day from today (searching up to 2 months ahead)
  const findFirstOpenDate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoDatesFound(false);

    const currentSelected = selectedDateRef.current;
    // If selectedDate is valid and >= todayKey, check if it's already open
    if (currentSelected && currentSelected >= todayKey) {
      const selectedMonthStr = currentSelected.slice(0, 7);
      try {
        const slots = await getMonthAvailability({
          month: selectedMonthStr,
          appointmentTypeId,
          timeZone,
        });
        if ((slots[currentSelected] ?? 0) > 0) {
          const [year, month] = selectedMonthStr.split('-').map(Number);
          setCalendarMonth(new Date(year, month - 1, 1));
          setMonthSlots(slots);
          setLoading(false);
          return;
        }
      } catch {
        setError("Couldn't load open dates.");
        setLoading(false);
        return;
      }
    }

    // Otherwise, search from today up to 2 months ahead
    const start = startOfMonth(today);
    for (let offset = 0; offset <= 2; offset++) {
      const monthToSearch = addMonths(start, offset);
      const monthStr = format(monthToSearch, 'yyyy-MM');
      try {
        const slots = await getMonthAvailability({
          month: monthStr,
          appointmentTypeId,
          timeZone,
        });

        const openKeys = Object.keys(slots)
          .filter((k) => k >= todayKey && (slots[k] || 0) > 0)
          .sort();

        if (openKeys.length > 0) {
          setCalendarMonth(monthToSearch);
          setMonthSlots(slots);
          onSelectDateRef.current(openKeys[0]);
          setLoading(false);
          return;
        }
      } catch {
        setError("Couldn't load open dates.");
        setLoading(false);
        return;
      }
    }

    setNoDatesFound(true);
    setLoading(false);
  }, [appointmentTypeId, timeZone, today, todayKey]);

  useEffect(() => {
    void findFirstOpenDate();
  }, [appointmentTypeId, timeZone, findFirstOpenDate]);

  const handlePrevMonth = () => {
    if (isCurrentMonth) return;
    const prev = subMonths(calendarMonth, 1);
    setCalendarMonth(prev);
    void loadMonthSlots(prev);
  };

  const handleNextMonth = () => {
    const next = addMonths(calendarMonth, 1);
    setCalendarMonth(next);
    void loadMonthSlots(next);
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [calendarMonth]);

  return (
    <div className="rounded-xl border border-beige bg-cream p-3 sm:p-4">
      {/* Month Navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          disabled={isCurrentMonth}
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal hover:bg-beige/50 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-xs font-semibold text-charcoal">{format(calendarMonth, 'MMMM yyyy')}</p>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal hover:bg-beige/50"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-xs text-rose-600 mb-2">{error}</p>
          <button
            type="button"
            onClick={() => void loadMonthSlots(calendarMonth)}
            className="rounded-lg border border-beige bg-white px-3 py-1 text-xs font-semibold text-charcoal shadow-2xs hover:bg-beige/40"
          >
            Try again
          </button>
        </div>
      ) : noDatesFound ? (
        <div className="py-6 text-center text-xs text-warm-gray">
          No open dates in the next two months.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1 text-[10px] font-semibold text-soft-gray">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const key = toDateKey(day);
              const inMonth = isSameMonth(day, calendarMonth);
              const isPast = key < todayKey;
              const totalSlots = monthSlots[key] || 0;
              const isBookable = inMonth && !isPast && totalSlots > 0 && !loading;
              const sel = selectedDate === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!isBookable}
                  aria-disabled={!isBookable}
                  onClick={() => onSelectDate(key)}
                  className={cn(
                    'relative flex h-8 sm:h-9 items-center justify-center rounded-lg text-xs font-medium transition',
                    loading && inMonth && 'animate-pulse opacity-60',
                    !inMonth && 'text-soft-gray/30 cursor-not-allowed',
                    inMonth && !isBookable && 'cursor-not-allowed text-soft-gray/35',
                    inMonth && isBookable && !sel && 'text-charcoal hover:bg-sage/10',
                    sel && 'bg-sage text-white shadow-2xs',
                    isToday(day) && !sel && isBookable && 'ring-1 ring-sage/40'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {inMonth && isBookable && (
                    <span
                      className={cn(
                        'absolute bottom-1 h-1 w-1 rounded-full',
                        sel ? 'bg-white' : 'bg-sage-dark'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-warm-gray border-t border-beige/60 pt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-dark" />
            <span>Open day</span>
          </div>
        </>
      )}
    </div>
  );
}
