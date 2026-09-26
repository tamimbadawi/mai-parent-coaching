import { useState, useEffect, useMemo } from 'react';
import {
  CalendarClock,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Check,
  Clock,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CoachAvailabilityRule } from '../../../types';
import { AvailabilityMonthCalendar } from './AvailabilityMonthCalendar';

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
    label: 'Discovery Call',
    badge: 'bg-sky-50 text-sky-800 border-sky-300 font-medium',
    pill: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    duration: '30 min',
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
  const [activeTab, setActiveTab] = useState<'calendar' | 'weekly'>('calendar');
  const [rules, setRules] = useState<CoachAvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch rules
  const fetchRules = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
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
            is_active: true,
          },
        ]);
        if (insErr) throw insErr;
      }

      await fetchRules(true);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update day availability');
    } finally {
      setSaving(false);
    }
  };

  // Add time block to day
  const handleAddTimeBlock = async (dayIndex: number) => {
    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from('coach_availability_rules').insert([
        {
          rule_type: 'recurring',
          day_of_week: dayIndex,
          start_time: '10:00',
          end_time: '14:00',
          appointment_type_id: 'all',
          is_active: true,
        },
      ]);
      if (insErr) throw insErr;

      await fetchRules(true);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time block');
    } finally {
      setSaving(false);
    }
  };

  // Update rule field
  const handleUpdateRuleField = async (
    ruleId: string,
    field: 'start_time' | 'end_time' | 'appointment_type_id',
    value: string
  ) => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('coach_availability_rules')
        .update({ [field]: value })
        .eq('id', ruleId);
      if (updateErr) throw updateErr;

      await fetchRules(true);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time block');
    } finally {
      setSaving(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    setSaving(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('coach_availability_rules')
        .delete()
        .eq('id', ruleId);
      if (delErr) throw delErr;

      await fetchRules(true);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time block');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-hidden rounded-3xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xl flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 rounded-xl p-1.5 text-stone-400 transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/15 text-sage-dark">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-xl text-charcoal font-semibold leading-tight">
              Manage Practice Availability
            </h2>
            <p className="text-[11px] text-warm-gray leading-snug">
              Define your recurring hours and session types. All other times are{' '}
              <span className="font-semibold text-charcoal">closed by default</span>.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex items-center gap-2 border-b border-beige/70 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-sage text-white shadow-2xs'
                : 'text-warm-gray hover:bg-[#faf8f4] hover:text-charcoal'
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'bg-sage text-white shadow-2xs'
                : 'text-warm-gray hover:bg-[#faf8f4] hover:text-charcoal'
            }`}
          >
            Weekly hours
          </button>
        </div>

        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Content area: fits without scrolling */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-warm-gray gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-sage" />
              <span className="text-xs">Loading availability rules...</span>
            </div>
          ) : activeTab === 'calendar' ? (
            /* ── TAB 1: CALENDAR (DEFAULT) ────────────────────────────── */
            <AvailabilityMonthCalendar
              rules={rules}
              sessionTypeConfig={SESSION_TYPE_CONFIG}
              onRefreshRules={() => fetchRules(true)}
              onSuccess={(msg) => {
                setSuccess(msg);
                setTimeout(() => setSuccess(null), 3000);
              }}
              onError={(msg) => setError(msg)}
              onUpdated={onUpdated}
            />
          ) : (
            /* ── TAB 2: WEEKLY RECURRING HOURS (Compact, 7 rows fit) ────────────────────────────── */
            <div className="divide-y divide-beige/50 rounded-2xl border border-beige/80 bg-white px-3 sm:px-4 py-1">
              {DAYS_OF_WEEK.map(({ dayIndex, name }) => {
                const dayRules = recurringByDay[dayIndex] || [];
                const isOpenDay = dayRules.length > 0;

                return (
                  <div
                    key={dayIndex}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    {/* Left: Switch + Day Name */}
                    <div className="flex items-center gap-2.5 min-w-[120px]">
                      <button
                        type="button"
                        onClick={() => handleToggleDay(dayIndex)}
                        disabled={saving}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isOpenDay ? 'bg-sage' : 'bg-stone-300'
                        }`}
                        aria-label={`Toggle ${name}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isOpenDay ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-semibold text-charcoal">{name}</span>
                    </div>

                    {/* Right: Inline Time Windows + Add Button */}
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
                      {!isOpenDay ? (
                        <span className="text-xs text-soft-gray italic">Closed</span>
                      ) : (
                        <>
                          {dayRules.map((rule) => {
                            const currentSessionType =
                              SESSION_TYPE_CONFIG[rule.appointment_type_id || 'all'] ||
                              SESSION_TYPE_CONFIG.all;

                            return (
                              <div
                                key={rule.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-beige/80 bg-[#faf8f4] px-2 py-1"
                              >
                                <Clock className="h-3 w-3 text-warm-gray shrink-0" />
                                <input
                                  type="time"
                                  value={rule.start_time || '10:00'}
                                  onChange={(e) =>
                                    handleUpdateRuleField(rule.id, 'start_time', e.target.value)
                                  }
                                  className="rounded border border-beige bg-white px-1 py-0.5 text-[11px] font-medium text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                                />
                                <span className="text-[10px] text-warm-gray">to</span>
                                <input
                                  type="time"
                                  value={rule.end_time || '14:00'}
                                  onChange={(e) =>
                                    handleUpdateRuleField(rule.id, 'end_time', e.target.value)
                                  }
                                  className="rounded border border-beige bg-white px-1 py-0.5 text-[11px] font-medium text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                                />

                                <select
                                  value={rule.appointment_type_id || 'all'}
                                  onChange={(e) =>
                                    handleUpdateRuleField(
                                      rule.id,
                                      'appointment_type_id',
                                      e.target.value
                                    )
                                  }
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-medium focus:outline-none cursor-pointer ${currentSessionType.badge}`}
                                >
                                  <option value="all">All Types</option>
                                  <option value="initial">Discovery (30m)</option>
                                  <option value="coaching-60">60-Min</option>
                                  <option value="intensive-90">90-Min</option>
                                  <option value="family">Family (75m)</option>
                                  <option value="follow-up">Follow-up (45m)</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-0.5 text-stone-400 hover:text-rose-500 rounded transition-colors"
                                  title="Delete time block"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => handleAddTimeBlock(dayIndex)}
                            disabled={saving}
                            className="inline-flex items-center gap-0.5 rounded-lg border border-dashed border-sage/60 px-2 py-1 text-[11px] font-medium text-sage-dark hover:bg-sage/10 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex justify-end border-t border-beige/70 pt-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-charcoal px-4 py-1.5 text-xs font-medium text-white transition hover:bg-stone-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
