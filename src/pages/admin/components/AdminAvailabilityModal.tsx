import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  CalendarClock,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Check,
  Clock,
  CalendarOff,
  Sparkles,
  Layers,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CoachAvailabilityRule } from '../../../types';

interface AdminAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const DAYS_OF_WEEK = [
  { dayIndex: 0, name: 'Sunday', short: 'Sun' },
  { dayIndex: 1, name: 'Monday', short: 'Mon' },
  { dayIndex: 2, name: 'Tuesday', short: 'Tue' },
  { dayIndex: 3, name: 'Wednesday', short: 'Wed' },
  { dayIndex: 4, name: 'Thursday', short: 'Thu' },
  { dayIndex: 5, name: 'Friday', short: 'Fri' },
  { dayIndex: 6, name: 'Saturday', short: 'Sat' },
];

export const SESSION_TYPE_CONFIG: Record<
  string,
  { label: string; badge: string; pill: string; dot: string; duration: string }
> = {
  all: {
    label: 'All Session Types',
    badge: 'bg-charcoal text-white border-charcoal/80',
    pill: 'bg-stone-100 text-charcoal border-stone-200',
    dot: 'bg-emerald-500',
    duration: 'Any',
  },
  initial: {
    label: 'Initial Consultation',
    badge: 'bg-sky-50 text-sky-800 border-sky-300 font-medium',
    pill: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    duration: '75 min',
  },
  'coaching-60': {
    label: '60-Min Coaching',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 font-medium',
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    duration: '60 min',
  },
  'intensive-90': {
    label: '90-Min Intensive',
    badge: 'bg-orange-50 text-orange-800 border-orange-300 font-medium',
    pill: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
    duration: '90 min',
  },
  family: {
    label: 'Family Consultation',
    badge: 'bg-rose-50 text-rose-800 border-rose-300 font-medium',
    pill: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    duration: '75 min',
  },
  'follow-up': {
    label: 'Follow-up Session',
    badge: 'bg-teal-50 text-teal-800 border-teal-300 font-medium',
    pill: 'bg-teal-50 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
    duration: '45 min',
  },
};

export const AdminAvailabilityModal = ({
  isOpen,
  onClose,
  onUpdated,
}: AdminAvailabilityModalProps): JSX.Element | null => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'overrides'>('weekly');
  const [rules, setRules] = useState<CoachAvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Date Override Form State
  const [overrideDate, setOverrideDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [overrideType, setOverrideType] = useState<'date_override' | 'date_closed'>('date_override');
  const [overrideAppointmentType, setOverrideAppointmentType] = useState('all');
  const [overrideStartTime, setOverrideStartTime] = useState('10:00');
  const [overrideEndTime, setOverrideEndTime] = useState('14:00');
  const [overrideLabel, setOverrideLabel] = useState('');

  // Fetch rules
  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('coach_availability_rules')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchErr) throw fetchErr;
      setRules((data as CoachAvailabilityRule[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchRules();
    }
  }, [isOpen]);

  // Recurring rules grouped by day
  const recurringByDay = useMemo(() => {
    const map: Record<number, CoachAvailabilityRule[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    rules
      .filter((r) => r.rule_type === 'recurring' && r.day_of_week !== null)
      .forEach((r) => {
        if (r.day_of_week !== null && map[r.day_of_week]) {
          map[r.day_of_week].push(r);
        }
      });
    return map;
  }, [rules]);

  // Date specific overrides
  const dateOverrides = useMemo(
    () => rules.filter((r) => r.rule_type === 'date_override' || r.rule_type === 'date_closed'),
    [rules]
  );

  // Toggle whole day on / off
  const handleToggleDay = async (dayIndex: number) => {
    const existingRules = recurringByDay[dayIndex] || [];
    setSaving(true);
    setError(null);
    try {
      if (existingRules.length > 0) {
        // Day is open -> delete rules to close it
        const ids = existingRules.map((r) => r.id);
        const { error: delErr } = await supabase
          .from('coach_availability_rules')
          .delete()
          .in('id', ids);
        if (delErr) throw delErr;
      } else {
        // Day is closed -> add default time window
        const { error: insErr } = await supabase.from('coach_availability_rules').insert([
          {
            rule_type: 'recurring',
            day_of_week: dayIndex,
            start_time: '10:00',
            end_time: '14:00',
            appointment_type_id: 'all',
            label: `${DAYS_OF_WEEK[dayIndex].name} Hours`,
            is_active: true,
          },
        ]);
        if (insErr) throw insErr;
      }
      await fetchRules();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update day availability');
    } finally {
      setSaving(false);
    }
  };

  // Add extra time block to a day
  const handleAddTimeBlock = async (dayIndex: number) => {
    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from('coach_availability_rules').insert([
        {
          rule_type: 'recurring',
          day_of_week: dayIndex,
          start_time: '16:00',
          end_time: '18:00',
          appointment_type_id: 'all',
          label: `${DAYS_OF_WEEK[dayIndex].name} Afternoon`,
          is_active: true,
        },
      ]);
      if (insErr) throw insErr;
      await fetchRules();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time block');
    } finally {
      setSaving(false);
    }
  };

  // Update rule field (start_time, end_time, appointment_type_id)
  const handleUpdateRuleField = async (
    ruleId: string,
    field: 'start_time' | 'end_time' | 'appointment_type_id',
    value: string
  ) => {
    try {
      const { error: updErr } = await supabase
        .from('coach_availability_rules')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', ruleId);
      if (updErr) throw updErr;
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r))
      );
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Update rule error:', err);
    }
  };

  // Delete a specific rule
  const handleDeleteRule = async (ruleId: string) => {
    setSaving(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('coach_availability_rules')
        .delete()
        .eq('id', ruleId);
      if (delErr) throw delErr;
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    } finally {
      setSaving(false);
    }
  };

  // Add Date Override
  const handleAddDateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate || saving) return;

    if (overrideType === 'date_override' && overrideStartTime >= overrideEndTime) {
      setError('Start time must be before end time.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from('coach_availability_rules').insert([
        {
          rule_type: overrideType,
          specific_date: overrideDate,
          start_time: overrideType === 'date_override' ? overrideStartTime : null,
          end_time: overrideType === 'date_override' ? overrideEndTime : null,
          appointment_type_id: overrideType === 'date_override' ? overrideAppointmentType : 'all',
          label:
            overrideLabel.trim() ||
            (overrideType === 'date_closed' ? 'Closed for Holiday' : 'Special Hours'),
          is_active: true,
        },
      ]);
      if (insErr) throw insErr;
      setOverrideLabel('');
      setSuccess('Date rule added successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await fetchRules();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add date override');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-beige/80 bg-white p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-xl p-2 text-stone-400 transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-5 flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage/15 text-sage-dark">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-charcoal font-normal">
              Manage Practice Availability
            </h2>
            <p className="mt-1 text-xs text-warm-gray leading-relaxed">
              Define your recurring hours and session types. All other times are{' '}
              <span className="font-semibold text-charcoal">closed by default</span>.
            </p>
          </div>
        </div>

        {/* ── COLOR-CODED SESSION TYPES LEGEND ─────────────────────────────── */}
        <div className="mb-5 rounded-2xl border border-beige/80 bg-[#faf8f4] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-3.5 w-3.5 text-sage-dark" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal">
              Session Types Color Legend
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(SESSION_TYPE_CONFIG).map(([key, config]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border ${config.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                <span>{config.label}</span>
                <span className="opacity-75 text-[10px]">({config.duration})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-beige/70 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'bg-sage text-white shadow-xs'
                : 'text-warm-gray hover:bg-[#faf8f4] hover:text-charcoal'
            }`}
          >
            Weekly Recurring Hours
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overrides')}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'overrides'
                ? 'bg-sage text-white shadow-xs'
                : 'text-warm-gray hover:bg-[#faf8f4] hover:text-charcoal'
            }`}
          >
            Date-Specific Overrides ({dateOverrides.length})
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-warm-gray gap-2.5">
            <Loader2 className="h-5 w-5 animate-spin text-sage" />
            <span className="text-xs">Loading availability rules...</span>
          </div>
        ) : activeTab === 'weekly' ? (
          /* ── TAB 1: WEEKLY RECURRING HOURS ────────────────────────────── */
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(({ dayIndex, name }) => {
              const dayRules = recurringByDay[dayIndex] || [];
              const isOpenDay = dayRules.length > 0;

              return (
                <div
                  key={dayIndex}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isOpenDay
                      ? 'border-sage/40 bg-white shadow-xs'
                      : 'border-beige/70 bg-[#faf8f4]/60'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Day Header & Switch */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleDay(dayIndex)}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isOpenDay ? 'bg-sage' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isOpenDay ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{name}</p>
                          <p className="text-[11px] text-warm-gray">
                            {isOpenDay
                              ? `${dayRules.length} active time window(s)`
                              : 'Closed / Unavailable'}
                          </p>
                        </div>
                      </div>

                      {isOpenDay && (
                        <button
                          type="button"
                          onClick={() => handleAddTimeBlock(dayIndex)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-sage/60 px-3 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage/10 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add time block</span>
                        </button>
                      )}
                    </div>

                    {/* Time blocks list for this day */}
                    {isOpenDay && (
                      <div className="space-y-2.5 pt-2 border-t border-beige/60">
                        {dayRules.map((rule) => {
                          const currentSessionType =
                            SESSION_TYPE_CONFIG[rule.appointment_type_id || 'all'] ||
                            SESSION_TYPE_CONFIG.all;

                          return (
                            <div
                              key={rule.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-beige/80 bg-[#faf8f4] p-2.5"
                            >
                              {/* Times */}
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-warm-gray shrink-0" />
                                <input
                                  type="time"
                                  value={rule.start_time || '10:00'}
                                  onChange={(e) =>
                                    handleUpdateRuleField(rule.id, 'start_time', e.target.value)
                                  }
                                  className="rounded-lg border border-beige bg-white px-2 py-1 text-xs font-medium text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                                />
                                <span className="text-warm-gray text-xs">to</span>
                                <input
                                  type="time"
                                  value={rule.end_time || '14:00'}
                                  onChange={(e) =>
                                    handleUpdateRuleField(rule.id, 'end_time', e.target.value)
                                  }
                                  className="rounded-lg border border-beige bg-white px-2 py-1 text-xs font-medium text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                                />
                              </div>

                              {/* Session Type Picker with Color Badge */}
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <select
                                    value={rule.appointment_type_id || 'all'}
                                    onChange={(e) =>
                                      handleUpdateRuleField(
                                        rule.id,
                                        'appointment_type_id',
                                        e.target.value
                                      )
                                    }
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium focus:outline-none cursor-pointer ${currentSessionType.badge}`}
                                  >
                                    <option value="all">🌿 All Session Types</option>
                                    <option value="initial">💬 Initial Consultation (75m)</option>
                                    <option value="coaching-60">⏱️ 60-Min Coaching</option>
                                    <option value="intensive-90">🔥 90-Min Intensive</option>
                                    <option value="family">👨‍👩‍👧 Family Consultation (75m)</option>
                                    <option value="follow-up">🔄 Follow-up Session (45m)</option>
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete time block"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TAB 2: DATE-SPECIFIC OVERRIDES & CLOSURES ──────────────────── */
          <div className="space-y-6">
            {/* Add Override Form */}
            <form
              onSubmit={handleAddDateOverride}
              className="rounded-2xl border border-beige/80 bg-[#faf8f4]/70 p-4 sm:p-5"
            >
              <p className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-3">
                Add Date Override, Session Type, or Holiday
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-warm-gray">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-warm-gray">
                    Action Type
                  </label>
                  <select
                    value={overrideType}
                    onChange={(e) =>
                      setOverrideType(e.target.value as 'date_override' | 'date_closed')
                    }
                    className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  >
                    <option value="date_override">Open Specific Hours</option>
                    <option value="date_closed">Close Entire Day (Holiday/Off)</option>
                  </select>
                </div>

                {overrideType === 'date_override' && (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-warm-gray">
                      Session Type
                    </label>
                    <select
                      value={overrideAppointmentType}
                      onChange={(e) => setOverrideAppointmentType(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    >
                      <option value="all">🌿 All Session Types</option>
                      <option value="initial">💬 Initial Consultation (75m)</option>
                      <option value="coaching-60">⏱️ 60-Min Coaching</option>
                      <option value="intensive-90">🔥 90-Min Intensive</option>
                      <option value="family">👨‍👩‍👧 Family Consultation (75m)</option>
                      <option value="follow-up">🔄 Follow-up Session (45m)</option>
                    </select>
                  </div>
                )}
              </div>

              {overrideType === 'date_override' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-warm-gray">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-warm-gray">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>
                </div>
              )}

              <div className="mt-3">
                <label className="mb-1 block text-[11px] font-medium text-warm-gray">
                  Label / Description (Optional)
                </label>
                <input
                  type="text"
                  value={overrideLabel}
                  onChange={(e) => setOverrideLabel(e.target.value)}
                  placeholder={
                    overrideType === 'date_closed'
                      ? 'e.g. National Holiday, Personal Vacation'
                      : 'e.g. Special Intensive Consultation Saturday'
                  }
                  className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sage py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>Add Date Rule</span>
              </button>
            </form>

            {/* Active Date Overrides List */}
            <div>
              <p className="mb-3 text-xs font-semibold text-charcoal uppercase tracking-wider">
                Configured Date Overrides ({dateOverrides.length})
              </p>
              {dateOverrides.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-beige bg-[#faf8f4]/60 p-6 text-center text-xs text-warm-gray">
                  No date-specific overrides set. Standard weekly recurring schedule applies.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dateOverrides.map((r) => {
                    const sessionType =
                      SESSION_TYPE_CONFIG[r.appointment_type_id || 'all'] ||
                      SESSION_TYPE_CONFIG.all;

                    return (
                      <div
                        key={r.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-beige/80 bg-white p-3.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              r.rule_type === 'date_closed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : 'bg-sage/15 text-sage-dark border border-sage/30'
                            }`}
                          >
                            {r.rule_type === 'date_closed' ? (
                              <CalendarOff className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-charcoal">
                                {r.label ||
                                  (r.rule_type === 'date_closed' ? 'Closed' : 'Special Hours')}
                              </p>
                              {r.rule_type === 'date_override' && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] border ${sessionType.badge}`}
                                >
                                  {sessionType.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-warm-gray">
                              {r.specific_date &&
                                format(
                                  new Date(`${r.specific_date}T12:00:00`),
                                  'EEEE, MMMM d, yyyy'
                                )}
                              {r.rule_type === 'date_override' &&
                                ` · ${r.start_time} to ${r.end_time}`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(r.id)}
                          disabled={saving}
                          className="self-end sm:self-center rounded-lg p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete override"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-beige/70 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-charcoal px-5 py-2.5 text-xs font-medium text-white transition hover:bg-stone-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
