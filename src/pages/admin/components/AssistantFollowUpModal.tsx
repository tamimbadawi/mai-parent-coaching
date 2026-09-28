import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartHandshake,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { COUNTRIES } from '../../../data/countries';
import { normalizePhoneForWhatsApp } from './InternalWhatsAppMessengerModal';
import type { CustomerJourneyState } from '../../../types';

interface AssistantFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: CustomerJourneyState;
  onFollowUpCompleted?: () => void;
}

type FollowUpType = 'schedule' | 'intake' | 'continuity' | 'custom';

export const AssistantFollowUpModal = ({
  isOpen,
  onClose,
  client,
  onFollowUpCompleted,
}: AssistantFollowUpModalProps): JSX.Element | null => {
  const [selectedType, setSelectedType] = useState<FollowUpType>('schedule');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [logging, setLogging] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Client country details
  const countryObj = useMemo(() => {
    if (!client.country) return null;
    return (
      COUNTRIES.find(
        (c) => c.iso === client.country || c.name.toLowerCase() === client.country?.toLowerCase()
      ) ?? null
    );
  }, [client.country]);

  // Normalized phone for WhatsApp
  const normalizedPhone = useMemo(() => {
    return normalizePhoneForWhatsApp(client.phone, client.country);
  }, [client.phone, client.country]);

  // Clean phone digits for wa.me link
  const cleanPhoneDigits = useMemo(() => {
    return (normalizedPhone || '').replace(/\D/g, '');
  }, [normalizedPhone]);

  // Pre-crafted message templates from Mai's Assistant
  const templates: Record<FollowUpType, string> = useMemo(() => {
    const parent = client.parent_name || 'there';
    return {
      schedule: `Hello ${parent}, this is Mai Elbadawy's assistant reaching out regarding your coaching package.\n\nWe are ready to schedule your consultation sessions on Mai's calendar. Could you please share which days and times work best for you this coming week? I'll coordinate everything and lock in your appointments directly!`,
      intake: `Hello ${parent}, this is Mai Elbadawy's assistant.\n\nBefore your upcoming consultation with Mai, please take a few moments to complete your family intake questionnaire. Having this context in advance allows Mai to prepare thoroughly for your session. Please let me know if you need any assistance with it!`,
      continuity: `Hello ${parent}, I'm checking in from Mai Elbadawy's practice to see how things have been going for you and your family following your recent session.\n\nMai and I are here to support your family's journey. Would you like to schedule your next continuity session?`,
      custom: customMessage,
    };
  }, [client.parent_name, customMessage]);

  const activeMessageText = selectedType === 'custom' ? customMessage : templates[selectedType];

  useEffect(() => {
    if (!isOpen) {
      setNotice(null);
      setCustomMessage('');
      setSelectedType('schedule');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Direct WhatsApp Web / App URL
  const waUrl = cleanPhoneDigits
    ? `https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(activeMessageText)}`
    : '';

  // Send message via backend dispatcher
  const handleDispatchMessage = async () => {
    if (!client.phone) {
      setNotice({ type: 'error', message: 'No phone number on record for this client.' });
      return;
    }
    setSending(true);
    setNotice(null);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-dispatcher', {
        body: {
          trigger: 'assistant_followup',
          recipient_phone: client.phone,
          recipient_name: client.parent_name,
          client_id: client.client_id,
          params: {
            content: activeMessageText,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        setNotice({
          type: 'success',
          message: `Follow-up message successfully delivered via WhatsApp to ${client.phone}!`,
        });
        onFollowUpCompleted?.();
      } else {
        setNotice({
          type: 'error',
          message: data?.error || 'Failed to dispatch message.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice({ type: 'error', message: msg || 'Failed to send WhatsApp message.' });
    } finally {
      setSending(false);
    }
  };

  // Log follow-up activity record in database
  const handleLogFollowUp = async () => {
    setLogging(true);
    setNotice(null);

    try {
      const { error } = await supabase.from('admin_notifications').insert({
        type: 'assistant_followup',
        title: `Assistant Follow-up: ${client.parent_name}`,
        message: `Assistant completed a "${selectedType.toUpperCase()}" follow-up with ${client.parent_name} (${client.phone || client.email}).`,
        read_at: new Date().toISOString(),
      });

      if (error) throw error;

      setNotice({
        type: 'success',
        message: 'Follow-up activity recorded in practice logs.',
      });
      onFollowUpCompleted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice({ type: 'error', message: msg || 'Failed to log follow-up.' });
    } finally {
      setLogging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-2 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl sm:rounded-3xl border border-beige bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige/70 bg-[#faf8f4] px-5 py-3.5 sm:px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="assistant-modal-title" className="font-serif text-lg sm:text-xl font-semibold text-charcoal truncate">
                  Assistant Follow-up Hub
                </h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300 shrink-0">
                  Client Outreach
                </span>
              </div>
              <p className="text-xs text-warm-gray truncate">
                Direct client coordination for {client.parent_name} ({client.email})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-warm-gray transition hover:bg-beige/40 hover:text-charcoal cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Notice Banner if present */}
        {notice && (
          <div
            className={`px-5 py-2 text-xs flex items-center gap-2 border-b shrink-0 ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium truncate">{notice.message}</span>
          </div>
        )}

        {/* Content Body: Two columns on desktop, fits comfortably */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto">
          {/* Left Column: Client Diagnostics & Follow-up Checklist (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl border border-beige/80 bg-[#faf8f4] p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warm-gray">
                <HeartHandshake className="h-4 w-4 text-sage-dark" />
                <span>Client Overview</span>
              </div>

              <div className="space-y-1.5 text-xs text-charcoal">
                <div className="flex items-center justify-between">
                  <span className="text-warm-gray">Full Name:</span>
                  <span className="font-medium truncate max-w-[150px]">{client.parent_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-warm-gray">Track:</span>
                  <span className="font-semibold uppercase text-[10px] px-2 py-0.5 rounded-full bg-white border border-beige/80">
                    {client.current_track === 'track_b' ? 'Track B (Continuity)' : 'Track A (Nurture)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-warm-gray">Last Contact:</span>
                  <span className="font-medium">{client.days_since_last_engagement}d ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-warm-gray">Phone:</span>
                  {client.phone ? (
                    <span className="font-mono text-sage-dark font-medium">{client.phone}</span>
                  ) : (
                    <span className="text-rose-500 font-medium">No phone</span>
                  )}
                </div>
                {countryObj && (
                  <div className="flex items-center justify-between">
                    <span className="text-warm-gray">Country:</span>
                    <span className="font-medium">
                      {countryObj.flag} {countryObj.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up Checklist Card */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900">
                <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                <span>Assistant Action Items</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Calendar check */}
                <div className="flex items-start gap-2 rounded-xl bg-white p-2.5 border border-amber-200/80 shadow-2xs">
                  <CalendarDays className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal">Calendar Scheduling</p>
                    <p className="text-[11px] text-warm-gray leading-tight mt-0.5">
                      {client.upcoming_sessions_count > 0
                        ? `${client.upcoming_sessions_count} session(s) already scheduled.`
                        : 'No upcoming session on calendar. Outreach recommended.'}
                    </p>
                  </div>
                </div>

                {/* Continuity check */}
                <div className="flex items-start gap-2 rounded-xl bg-white p-2.5 border border-amber-200/80 shadow-2xs">
                  <Clock className="h-4 w-4 shrink-0 text-sage-dark mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal">Relationship Stage</p>
                    <p className="text-[11px] text-warm-gray leading-tight mt-0.5">
                      {client.lifecycle_stage.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pre-Crafted Outreach Templates & Actions (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between rounded-2xl border border-beige/80 bg-white p-3.5 sm:p-4 gap-3">
            <div>
              <div className="flex items-center justify-between border-b border-beige/60 pb-2.5 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-warm-gray">
                  Choose Follow-up Scenario
                </span>
                <span className="text-[11px] text-sage-dark font-medium">
                  Assistant Persona Preset
                </span>
              </div>

              {/* Template Tab Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#faf8f4] rounded-xl border border-beige/60 mb-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('schedule')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center truncate ${
                    selectedType === 'schedule'
                      ? 'bg-white text-amber-900 shadow-2xs font-semibold'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  📅 Book Times
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('intake')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center truncate ${
                    selectedType === 'intake'
                      ? 'bg-white text-amber-900 shadow-2xs font-semibold'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  📝 Intake Form
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('continuity')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center truncate ${
                    selectedType === 'continuity'
                      ? 'bg-white text-amber-900 shadow-2xs font-semibold'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  🌿 Continuity
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('custom')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center truncate ${
                    selectedType === 'custom'
                      ? 'bg-white text-amber-900 shadow-2xs font-semibold'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  ✏️ Custom
                </button>
              </div>

              {/* Message Composer Area */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-warm-gray flex items-center justify-between">
                  <span>Message Draft (WhatsApp)</span>
                  <span className="text-[10px] text-warm-gray font-normal">
                    {activeMessageText.length} characters
                  </span>
                </label>

                {selectedType === 'custom' ? (
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder={`Write your follow-up message to ${client.parent_name}...`}
                    rows={6}
                    className="w-full rounded-xl border border-beige bg-[#faf8f4] p-3 text-xs text-charcoal outline-none focus:border-sage focus:bg-white transition leading-relaxed resize-none"
                  />
                ) : (
                  <div className="rounded-xl border border-emerald-200/60 bg-[#edf7f1]/40 p-3 text-xs text-charcoal leading-relaxed whitespace-pre-wrap font-sans max-h-[160px] overflow-y-auto">
                    {templates[selectedType]}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-beige/60">
              <button
                type="button"
                onClick={handleLogFollowUp}
                disabled={logging}
                className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-[#faf8f4] px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-beige/40 transition cursor-pointer disabled:opacity-50"
                title="Record that you followed up with this client"
              >
                {logging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-sage-dark" />
                )}
                <span>Log Outreach Note</span>
              </button>

              <div className="flex items-center gap-2">
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open in WhatsApp</span>
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleDispatchMessage}
                  disabled={sending || !client.phone || !activeMessageText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Send to Client</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantFollowUpModal;
