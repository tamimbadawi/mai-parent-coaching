import { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarOff,
  RotateCcw,
  Plus,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CoachAvailabilityRule } from '../../../types';

export interface SessionTypeInfo {
  label: string;
  badge: string;
  pill: string;
  dot: string;
  duration: string;
}

export interface AvailabilityMonthCalendarProps {
  rules: CoachAvailabilityRule[];
  sessionTypeConfig: Record<string, SessionTypeInfo>;
  onRefreshRules: () => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onUpdated?: () => void;
}

export interface DateAvailability {
  source: 'closed' | 'override' | 'weekly' | 'none';
  windows: CoachAvailabilityRule[];
  hasSpecialHours: boolean;
  hasOverrides: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function availabilityForDate(
  dateKey: string,
  rules: CoachAvailabilityRule[]
): DateAvailability {
  const hasOverrides = rules.some(
    (r) =>
      r.specific_date === dateKey &&
      (r.rule_type === 'date_override' || r.rule_type === 'date_closed')
  );

  // 1. Closed date wins
  const isClosed = rules.some(
    (r) => r.is_active && r.rule_type === 'date_closed' && r.specific_date === dateKey
  );
  if (isClosed) {
    return {
      source: 'closed',
      windows: [],
      hasSpecialHours: false,
      hasOverrides,
    };
  }

  // 2. Date-specific hours replace weekly hours
  const dateOverrides = rules
    .filter(
      (r) =>
        r.is_active &&
        r.rule_type === 'date_override' &&
        r.specific_date === dateKey &&
        Boolean(r.start_time) &&
        Boolean(r.end_time)
    )
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (dateOverrides.length > 0) {
    return {
      source: 'override',
      windows: dateOverrides,
      hasSpecialHours: true,
      hasOverrides,
    };
  }

  // 3. Weekly hours
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const weekday = dateObj.getDay();

  const weeklyRules = rules
    .filter(
      (r) =>
        r.is_active &&
        r.rule_type === 'recurring' &&
        r.day_of_week === weekday &&
        Boolean(r.start_time) &&
        Boolean(r.end_time)
    )
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (weeklyRules.length > 0) {
    return {
      source: 'weekly',
      windows: weeklyRules,
      hasSpecialHours: false,
      hasOverrides,
    };
  }

  // 4. Otherwise not open (closed by default)
  return {
    source: 'none',
    windows: [],
    hasSpecialHours: false,
    hasOverrides,
  };
}

function getHoursSourceDescription(
  source: 'closed' | 'override' | 'weekly' | 'none',
  dayOfWeek: number
): string {
  const WEEKDAY_SINGULAR = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const WEEKDAY_PLURAL = [
    'Sundays',
    'Mondays',
    'Tuesdays',
    'Wednesdays',
    'Thursdays',
    'Fridays',
    'Saturdays',
  ];

  switch (source) {
    case 'weekly':
      return `From your weekly ${WEEKDAY_SINGULAR[dayOfWeek]} hours`;
    case 'override':
      return 'Special hours for this date only';
    case 'closed':
      return 'Closed on this date';
    case 'none':
      return `Not open. You have no weekly hours on ${WEEKDAY_PLURAL[dayOfWeek]}.`;
  }
}

export function AvailabilityMonthCalendar({
  rules,
  sessionTypeConfig,
  onRefreshRules,
  onSuccess,
  onError,
  onUpdated,
}: AvailabilityMonthCalendarProps): JSX.Element {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [saving, setSaving] = useState(false);

  // Special hours inline form state
  const [showSpecialHoursForm, setShowSpecialHoursForm] = useState(false);
  const [specialStartTime, setSpecialStartTime] = useState('10:00');
  const [specialEndTime, setSpecialEndTime] = useState('14:00');
  const [specialSessionType, setSpecialSessionType] = useState('all');
  const [specialLabel, setSpecialLabel] = useState('');

  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  const handlePrevMonth = () => {
    if (isCurrentMonth) return;
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const startWeekday = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const leadingBlanks = Array.from({ length: startWeekday }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Action: Close this day
  const handleCloseDay = async (dateKey: string) => {
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('coach_availability_rules')
        .delete()
        .eq('specific_date', dateKey)
        .in('rule_type', ['date_override', 'date_closed']);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase.from('coach_availability_rules').insert([
        {
          rule_type: 'date_closed',
          specific_date: dateKey,
          label: 'Closed',
          is_active: true,
        },
      ]);
      if (insErr) throw insErr;

      setShowSpecialHoursForm(false);
      await onRefreshRules();
      if (onUpdated) onUpdated();
      onSuccess('Day marked as closed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close day';
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Action: Set special hours
  const handleSaveSpecialHours = async (dateKey: string) => {
    if (specialStartTime >= specialEndTime) {
      onError('Start time must be before end time.');
      return;
    }

    setSaving(true);
    try {
      // Delete closed record first
      const { error: delErr } = await supabase
        .from('coach_availability_rules')
        .delete()
        .eq('specific_date', dateKey)
        .eq('rule_type', 'date_closed');
      if (delErr) throw delErr;

      const { error: insErr } = await supabase.from('coach_availability_rules').insert([
        {
          rule_type: 'date_override',
          specific_date: dateKey,
          start_time: specialStartTime,
          end_time: specialEndTime,
          appointment_type_id: specialSessionType,
          label: specialLabel.trim() || 'Special Hours',
          is_active: true,
        },
      ]);
      if (insErr) throw insErr;

      setShowSpecialHoursForm(false);
      setSpecialLabel('');
      await onRefreshRules();
      if (onUpdated) onUpdated();
      onSuccess('Special hours set successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set special hours';
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Action: Reset to weekly hours
  const handleResetToWeekly = async (dateKey: string) => {
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('coach_availability_rules')
        .delete()
        .eq('specific_date', dateKey)
        .in('rule_type', ['date_override', 'date_closed']);
      if (delErr) throw delErr;

      setShowSpecialHoursForm(false);
      await onRefreshRules();
      if (onUpdated) onUpdated();
      onSuccess('Reset to weekly hours.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset date to weekly hours';
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete individual rule block
  const handleDeleteRuleBlock = async (ruleId: string) => {
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('coach_availability_rules')
        .delete()
        .eq('id', ruleId);
      if (delErr) throw delErr;

      await onRefreshRules();
      if (onUpdated) onUpdated();
      onSuccess('Time block removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove time block';
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-charcoal">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isCurrentMonth}
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="rounded-xl border border-beige bg-white p-2 text-charcoal transition hover:bg-beige/40 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="rounded-xl border border-beige bg-white p-2 text-charcoal transition hover:bg-beige/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-beige/80 bg-white p-3 sm:p-4 shadow-2xs">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-[11px] font-bold text-warm-gray uppercase tracking-wider py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {leadingBlanks.map((i) => (
            <div key={`blank-${i}`} className="min-h-[64px] rounded-xl bg-stone-50/30 p-1.5" />
          ))}

          {days.map((dayNum) => {
            const dateKey = `${currentMonth.getFullYear()}-${String(
              currentMonth.getMonth() + 1
            ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isPast = dateKey < todayKey;
            const isSelected = dateKey === selectedDateKey;
            const avail = availabilityForDate(dateKey, rules);

            return (
              <button
                key={dateKey}
                type="button"
                disabled={isPast}
                onClick={() => {
                  setSelectedDateKey(dateKey);
                  setShowSpecialHoursForm(false);
                }}
                className={`min-h-[64px] rounded-xl border p-1.5 sm:p-2 text-left transition flex flex-col justify-between ${
                  isPast
                    ? 'border-beige/40 bg-stone-50/50 opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'border-sage-dark bg-sage/10 ring-2 ring-sage-dark/40 shadow-xs'
                    : avail.source === 'closed'
                    ? 'border-rose-200/70 bg-rose-50/30 hover:border-rose-300'
                    : avail.hasSpecialHours
                    ? 'border-amber-200/70 bg-amber-50/30 hover:border-amber-300'
                    : 'border-beige bg-white hover:border-sage/60 hover:bg-ivory/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold leading-none ${
                      isPast
                        ? 'text-stone-300'
                        : isSelected
                        ? 'text-sage-dark'
                        : 'text-charcoal'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {avail.hasSpecialHours && !isPast && (
                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" aria-label="Special hours" />
                  )}
                </div>

                <div className="mt-1 flex flex-col gap-0.5 w-full overflow-hidden">
                  {avail.source === 'closed' ? (
                    <span className="text-[11px] font-semibold text-rose-600 leading-tight">
                      Closed
                    </span>
                  ) : (
                    avail.windows.slice(0, 3).map((w, idx) => {
                      const cfg =
                        sessionTypeConfig[w.appointment_type_id || 'all'] ||
                        sessionTypeConfig.all;
                      return (
                        <div
                          key={w.id || idx}
                          className="flex items-center gap-1 text-[10px] leading-tight text-charcoal truncate"
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              cfg?.dot || 'bg-emerald-500'
                            }`}
                          />
                          <span className="truncate">{w.start_time}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-warm-gray border-t border-beige/60 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Weekly hours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Special hours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rose-600">Closed</span>
            <span>Closed day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-stone-300" />
            <span>Not open</span>
          </div>
        </div>
      </div>

      {/* Selected Date Detail Panel */}
      {selectedDateKey && (() => {
        const [y, m, d] = selectedDateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d, 12, 0, 0);
        const fullDate = format(dateObj, 'EEEE, MMMM d, yyyy');
        const avail = availabilityForDate(selectedDateKey, rules);
        const sourceDesc = getHoursSourceDescription(avail.source, dateObj.getDay());
        const isPast = selectedDateKey < todayKey;

        return (
          <div className="rounded-2xl border border-beige/80 bg-[#faf8f4]/80 p-4 sm:p-5 space-y-3.5">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-serif text-base sm:text-lg font-semibold text-charcoal">
                  {fullDate}
                </h4>
                {isPast && (
                  <span className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[10px] text-warm-gray font-medium">
                    Past Date (Read-only)
                  </span>
                )}
              </div>
              <p className="text-xs text-warm-gray mt-0.5">{sourceDesc}</p>
            </div>

            {/* Time windows with type badges */}
            <div>
              {avail.windows.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {avail.windows.map((w, idx) => {
                    const cfg =
                      sessionTypeConfig[w.appointment_type_id || 'all'] ||
                      sessionTypeConfig.all;
                    return (
                      <div
                        key={w.id || idx}
                        className="inline-flex items-center gap-2 rounded-xl border border-beige bg-white px-3 py-1.5 text-xs shadow-2xs"
                      >
                        <span className={`h-2 w-2 rounded-full ${cfg?.dot || 'bg-emerald-500'}`} />
                        <span className="font-semibold text-charcoal">
                          {w.start_time} – {w.end_time}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] border ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                        {w.label && (
                          <span className="text-[11px] text-warm-gray">({w.label})</span>
                        )}
                        {w.rule_type === 'date_override' && !isPast && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleDeleteRuleBlock(w.id)}
                            className="ml-1 p-0.5 text-stone-400 hover:text-rose-600 transition-colors"
                            title="Delete time block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : avail.source === 'closed' ? (
                <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  This date is explicitly closed.
                </div>
              ) : (
                <div className="text-xs text-warm-gray italic">
                  No open hours scheduled for this date.
                </div>
              )}
            </div>

            {/* Action buttons (only for present/future dates) */}
            {!isPast && (
              <div className="border-t border-beige/70 pt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || avail.source === 'closed'}
                    onClick={() => handleCloseDay(selectedDateKey)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CalendarOff className="h-3.5 w-3.5" />
                    )}
                    <span>Close this day</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowSpecialHoursForm((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sage/40 bg-white px-3 py-2 text-xs font-semibold text-sage-dark shadow-2xs hover:bg-sage/10 transition-colors disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Set special hours</span>
                  </button>

                  {avail.hasOverrides && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleResetToWeekly(selectedDateKey)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-charcoal shadow-2xs hover:bg-stone-50 transition-colors disabled:opacity-40"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      <span>Reset to weekly hours</span>
                    </button>
                  )}
                </div>

                {/* Inline form for special hours */}
                {showSpecialHoursForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSaveSpecialHours(selectedDateKey);
                    }}
                    className="rounded-2xl border border-beige bg-white p-3.5 sm:p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-charcoal uppercase tracking-wider">
                        Set Special Hours for this Date
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowSpecialHoursForm(false)}
                        className="rounded-lg p-1 text-stone-400 hover:bg-beige/40 hover:text-charcoal"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-medium text-warm-gray mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          required
                          value={specialStartTime}
                          onChange={(e) => setSpecialStartTime(e.target.value)}
                          className="w-full rounded-xl border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-warm-gray mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          required
                          value={specialEndTime}
                          onChange={(e) => setSpecialEndTime(e.target.value)}
                          className="w-full rounded-xl border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-warm-gray mb-1">
                          Session Type
                        </label>
                        <select
                          value={specialSessionType}
                          onChange={(e) => setSpecialSessionType(e.target.value)}
                          className="w-full rounded-xl border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                        >
                          <option value="all">🌿 All Session Types</option>
                          <option value="initial">💬 Discovery Call (30m)</option>
                          <option value="coaching-60">⏱️ 60-Min Coaching</option>
                          <option value="intensive-90">🔥 90-Min Intensive</option>
                          <option value="family">👨‍👩‍👧 Family Consultation (75m)</option>
                          <option value="follow-up">🔄 Follow-up Session (45m)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-warm-gray mb-1">
                        Label / Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={specialLabel}
                        onChange={(e) => setSpecialLabel(e.target.value)}
                        placeholder="e.g. Saturday Special Consultation"
                        className="w-full rounded-xl border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowSpecialHoursForm(false)}
                        className="rounded-xl border border-beige bg-white px-3 py-1.5 text-xs font-semibold text-warm-gray hover:text-charcoal"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark disabled:opacity-40"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>Save Special Hours</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
