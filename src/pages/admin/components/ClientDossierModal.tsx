import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Phone,
  Mail,
  Calendar,
  CalendarDays,
  MessageSquare,
  MessageCircle,
  Sparkles,
  Compass,
  Pause,
  Play,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Inbox,
  ArrowRight,
  FileText,
  Users,
  ListTodo,
  Tag,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CustomerJourneyState, CRMContentItem, CRMLifecycleStage } from '../../../types';
import { roleLabel, currentAge, type Household, type HouseholdMember } from '../../../types/family';
import { COUNTRIES } from '../../../data/countries';
import InternalWhatsAppMessengerModal from './InternalWhatsAppMessengerModal';
import { StartFamilyCaseModal } from '../family/StartFamilyCaseModal';

export interface TimelineEvent {
  id: string;
  category: 'whatsapp' | 'booking' | 'contact' | 'crm' | 'session';
  timestamp: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  badge?: {
    text: string;
    tone: 'sage' | 'amber' | 'sky' | 'rose' | 'charcoal' | 'green' | 'teal';
  };
  details?: Record<string, any>;
  link?: string;
}

interface ClientDossierModalProps {
  client: CustomerJourneyState;
  onClose: () => void;
  onClientUpdated?: (updatedClient: Partial<CustomerJourneyState>) => void;
}

const LIFECYCLE_CONFIG: Record<
  CRMLifecycleStage,
  { label: string; tone: 'sage' | 'amber' | 'rose' | 'sky' | 'charcoal'; description: string }
> = {
  track_a_active: {
    label: 'Track A: Active Nurture',
    tone: 'sage',
    description: 'Pre-client engaged within the last 60 days. Receiving calm taste content.',
  },
  track_a_booked: {
    label: 'Track A: First Paid Session Booked',
    tone: 'sky',
    description: 'Awaiting completion of first paid session to officially transition to Track B.',
  },
  track_a_taper: {
    label: 'Track A: Taper Window (60–90d)',
    tone: 'amber',
    description: 'No touchpoints for over 60 days. Outbound nurture is throttled to 30-day intervals.',
  },
  track_a_inactive: {
    label: 'Track A: Inactive (>90d)',
    tone: 'charcoal',
    description: 'Over 90 days without touchpoint. Automated nurture halted to respect client space.',
  },
  track_b_active_coaching: {
    label: 'Track B: Active Coaching',
    tone: 'sage',
    description: 'Ongoing relationship with upcoming session already booked on the calendar.',
  },
  track_b_between_sessions: {
    label: 'Track B: Between Sessions (<30d)',
    tone: 'sky',
    description: 'Recent session completed. Continuity care and reflection prompts in effect.',
  },
  track_b_quiet: {
    label: 'Track B: Relationship Quiet (30–45d)',
    tone: 'amber',
    description: 'Approaching the 45-day threshold without a new booking scheduled.',
  },
  track_b_reengagement_due: {
    label: 'Track B: Re-engagement Due (>45d)',
    tone: 'rose',
    description: 'More than 45 days since last session. Relationship continuity check-in recommended.',
  },
  paused: {
    label: 'Outreach Paused',
    tone: 'amber',
    description: 'Automated CRM outreach temporarily paused by admin preference.',
  },
  opted_out: {
    label: 'Opted Out',
    tone: 'rose',
    description: 'Client replied STOP or unsubscribed from automated WhatsApp messages.',
  },
  unknown: {
    label: 'Stage Pending',
    tone: 'charcoal',
    description: 'Calculating lifecycle state from activity.',
  },
};

export const ClientDossierModal = ({
  client: initialClient,
  onClose,
  onClientUpdated,
}: ClientDossierModalProps): JSX.Element => {
  const [client, setClient] = useState<CustomerJourneyState>(initialClient);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'sessions' | 'whatsapp' | 'contact' | 'family'>('all');
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [householdInfo, setHouseholdInfo] = useState<{
    household: Household | null;
    members: HouseholdMember[];
    openActionCounts: Record<string, number>;
  } | null>(null);

  // Content pieces for manual dispatch
  const [libraryPieces, setLibraryPieces] = useState<CRMContentItem[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status and cadence overrides
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingCadence, setUpdatingCadence] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isStartFamilyCaseOpen, setIsStartFamilyCaseOpen] = useState(false);

  // Country details
  const countryObj = useMemo(() => {
    if (!client.country) return null;
    return COUNTRIES.find((c) => c.iso === client.country || c.name.toLowerCase() === client.country?.toLowerCase()) ?? null;
  }, [client.country]);

  // Load Content Library pieces for manual dispatch
  useEffect(() => {
    const loadContentPieces = async () => {
      const { data } = await supabase
        .from('crm_content_library')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data) {
        setLibraryPieces(data as CRMContentItem[]);
        if (data.length > 0) {
          const match = data.find((p: any) => p.target_track === client.current_track || p.target_track === 'all');
          setSelectedPieceId(match ? match.id : data[0].id);
        }
      }
    };

    void loadContentPieces();
  }, [client.current_track]);

  // Selected piece for manual dispatch
  const selectedPiece = useMemo(() => {
    return libraryPieces.find((p) => p.id === selectedPieceId) ?? null;
  }, [libraryPieces, selectedPieceId]);

  const renderedDispatchPreview = useMemo(() => {
    if (!selectedPiece) return '';
    return selectedPiece.body_template.replace(/\{parentName\}/g, client.parent_name || 'Parent');
  }, [selectedPiece, client.parent_name]);

  // Load unified timeline data
  const loadTimeline = async () => {
    setLoadingTimeline(true);
    setTimelineError(null);

    try {
      const events: TimelineEvent[] = [];

      // 1. Fetch Bookings
      let bookingQuery = supabase.from('bookings').select('*');
      if (client.client_id) {
        bookingQuery = bookingQuery.or(
          `user_id.eq.${client.client_id}${client.email ? `,email.eq.${client.email}` : ''}${
            client.phone ? `,phone.eq.${client.phone}` : ''
          }`
        );
      } else {
        bookingQuery = bookingQuery.eq('email', client.email);
      }

      const { data: bookingsData } = await bookingQuery.order('starts_at', { ascending: false });

      if (bookingsData) {
        for (const b of bookingsData) {
          const isPaid = b.appointment_type_id !== 'initial';
          let tone: 'sage' | 'sky' | 'amber' | 'rose' | 'charcoal' = 'sky';
          if (b.status === 'completed') tone = 'sage';
          else if (b.status === 'cancelled') tone = 'rose';
          else if (b.status === 'pending') tone = 'amber';

          events.push({
            id: `booking-${b.id}`,
            category: 'booking',
            timestamp: b.starts_at || b.created_at,
            title: b.appointment_type_title || (isPaid ? 'Coaching Session' : 'Initial Consultation'),
            subtitle: `${b.appointment_date || ''} at ${b.appointment_time || ''} (${b.time_zone || 'UTC'})`,
            description: b.notes ? `Client Notes: "${b.notes}"` : undefined,
            status: b.status,
            badge: {
              text: `${isPaid ? 'Paid Session' : 'Free Consultation'} • ${b.status}`,
              tone,
            },
            details: {
              starts_at: b.starts_at,
              ends_at: b.ends_at,
              child_name: b.child_name,
              child_age: b.child_age,
              country: b.country,
              meet_url: b.google_meet_url,
            },
            link: b.google_meet_url || undefined,
          });
        }
      }

      // 2. Fetch WhatsApp Messages
      if (client.phone) {
        const cleanPhone = client.phone.trim();
        const phoneVariants = [
          cleanPhone,
          cleanPhone.replace(/^\+/, ''),
          cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
        ];

        const { data: whatsappData } = await supabase
          .from('whatsapp_messages')
          .select('*, crm_content_library(title, content_type)')
          .in('recipient_phone', phoneVariants)
          .order('created_at', { ascending: false });

        if (whatsappData) {
          for (const msg of whatsappData) {
            const isInbound = msg.message_type === 'inbound';
            const isNurture = msg.message_type === 'crm_nurture';

            let tone: 'sage' | 'green' | 'sky' | 'amber' | 'charcoal' | 'teal' = 'sky';
            let categoryTitle = 'WhatsApp Message';

            if (isInbound) {
              tone = 'teal';
              categoryTitle = 'Incoming Message from Client';
            } else if (isNurture) {
              tone = 'sage';
              categoryTitle = `CRM Nurture: ${msg.crm_content_library?.title || 'Reflective Piece'}`;
            } else if (msg.message_type === 'booking_confirmation') {
              tone = 'green';
              categoryTitle = 'Booking Confirmation Sent';
            } else if (msg.message_type.startsWith('reminder')) {
              tone = 'amber';
              categoryTitle = `Session Reminder (${msg.message_type === 'reminder_24h' ? '24h' : '1h'})`;
            } else if (msg.message_type === 'follow_up') {
              tone = 'sage';
              categoryTitle = 'Post-Session Follow-Up';
            }

            events.push({
              id: `wa-${msg.id}`,
              category: 'whatsapp',
              timestamp: msg.sent_at || msg.created_at,
              title: categoryTitle,
              subtitle: isInbound ? 'Received via WhatsApp' : `Sent via WhatsApp • Status: ${msg.status}`,
              description: msg.message_content,
              status: msg.status,
              badge: {
                text: isInbound ? 'Inbound Reply' : isNurture ? 'CRM Touchpoint' : msg.message_type,
                tone,
              },
              details: {
                message_type: msg.message_type,
                whatsapp_message_id: msg.whatsapp_message_id,
                error_message: msg.error_message,
              },
            });
          }
        }
      }

      // 3. Fetch Contact Form Submissions
      let contactQuery = supabase.from('contact_messages').select('*');
      if (client.email && client.phone) {
        contactQuery = contactQuery.or(`email.eq.${client.email},phone.eq.${client.phone}`);
      } else if (client.email) {
        contactQuery = contactQuery.eq('email', client.email);
      }

      const { data: contactData } = await contactQuery.order('created_at', { ascending: false });

      if (contactData) {
        for (const cm of contactData) {
          events.push({
            id: `contact-${cm.id}`,
            category: 'contact',
            timestamp: cm.created_at,
            title: `Website Inquiry: ${cm.subject || 'General Question'}`,
            subtitle: `Submitted via website contact form`,
            description: cm.message,
            badge: {
              text: 'Website Inquiry',
              tone: 'charcoal',
            },
            details: {
              status: cm.status,
              email: cm.email,
              phone: cm.phone,
            },
          });
        }
      }

      // 4. Fetch Household & Case Sessions
      if (client.client_id) {
        const { data: householdData } = await supabase
          .from('households')
          .select('*, household_members(*)')
          .eq('primary_contact_profile_id', client.client_id)
          .maybeSingle();

        if (householdData) {
          const membersList: HouseholdMember[] = householdData.household_members || [];
          const memberIds = membersList.map((m) => m.id);
          const openActionCountsByMember: Record<string, number> = {};

          if (memberIds.length > 0) {
            const { data: actionItems } = await supabase
              .from('member_action_items')
              .select('household_member_id')
              .in('household_member_id', memberIds)
              .eq('status', 'open');

            for (const act of actionItems || []) {
              openActionCountsByMember[act.household_member_id] =
                (openActionCountsByMember[act.household_member_id] || 0) + 1;
            }
          }

          setHouseholdInfo({
            household: householdData as Household,
            members: membersList,
            openActionCounts: openActionCountsByMember,
          });

          const { data: caseSessions } = await supabase
            .from('case_sessions')
            .select('*, session_content(id, content_type, content, source_metadata), session_attendees(household_member_id)')
            .eq('household_id', householdData.id)
            .order('session_date', { ascending: false });

          if (caseSessions && caseSessions.length > 0) {
            caseSessions.forEach((cs, csIdx) => {
              const postNotes = cs.session_content?.find(
                (c: { content_type: string; content: string | null }) => c.content_type === 'post_session_notes'
              );
              const liveTranscript = cs.session_content?.find(
                (c: { content_type: string; content: string | null }) => c.content_type === 'live_transcript'
              );
              const driveUrl = cs.drive_web_view_url || null;

              const attendeeIds = (cs.session_attendees || []).map(
                (a: { household_member_id: string }) => a.household_member_id
              );
              const attendeeNames = membersList
                .filter((m) => attendeeIds.includes(m.id))
                .map((m) => m.full_name);

              events.push({
                id: `case-session-${cs.id}`,
                category: 'session',
                timestamp: cs.session_date,
                title: `Case Session #${caseSessions.length - csIdx}`,
                subtitle: `${new Date(cs.session_date).toLocaleDateString()} · ${
                  attendeeNames.length > 0 ? `Attendees: ${attendeeNames.join(', ')}` : 'Household Coaching'
                }`,
                description: postNotes?.content || (liveTranscript?.content ? 'Live Arabic session transcript recorded.' : undefined),
                status: cs.status,
                badge: {
                  text: cs.status === 'completed' ? 'Session • Completed' : 'Session • Scheduled',
                  tone: cs.status === 'completed' ? 'sage' : 'sky',
                },
                details: {
                  session_id: cs.id,
                  household_id: cs.household_id,
                  google_meet_url: cs.google_meet_url,
                  drive_recording_url: driveUrl,
                  has_transcript: Boolean(liveTranscript?.content),
                  has_notes: Boolean(postNotes?.content),
                  attendee_names: attendeeNames,
                },
                link: driveUrl || cs.google_meet_url || undefined,
              });
            });
          }
        } else {
          setHouseholdInfo(null);
        }
      } else {
        setHouseholdInfo(null);
      }

      // Sort chronological descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setTimeline(events);
    } catch (err: any) {
      setTimelineError(err.message || 'Failed to load timeline history');
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    void loadTimeline();
  }, [client.client_id, client.email, client.phone]);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return timeline;
    if (timelineFilter === 'sessions') return timeline.filter((e) => e.category === 'booking' || e.category === 'session');
    return timeline.filter((e) => e.category === timelineFilter);
  }, [timeline, timelineFilter]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Toggle Engagement Status (Pause / Resume)
  const handleToggleStatus = async () => {
    const nextStatus: 'active' | 'paused' = client.engagement_status === 'active' ? 'paused' : 'active';
    setUpdatingStatus(true);
    setDispatchMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          engagement_status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.client_id);

      if (error) throw error;

      const updated: CustomerJourneyState = {
        ...client,
        engagement_status: nextStatus,
        lifecycle_stage: nextStatus === 'paused' ? ('paused' as const) : client.lifecycle_stage,
      };

      setClient(updated);
      onClientUpdated?.(updated);
      setDispatchMessage({
        type: 'success',
        text: `Engagement status updated to ${nextStatus.toUpperCase()}.`,
      });
    } catch (err: any) {
      setDispatchMessage({
        type: 'error',
        text: `Failed to update engagement status: ${err.message}`,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Update Engagement Cadence
  const handleUpdateCadence = async (newCadence: number) => {
    setUpdatingCadence(true);
    setDispatchMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          engagement_cadence_days: newCadence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.client_id);

      if (error) throw error;

      const updated = {
        ...client,
        engagement_cadence_days: newCadence,
      };

      setClient(updated);
      onClientUpdated?.(updated);
      setDispatchMessage({
        type: 'success',
        text: `Engagement cadence updated to every ${newCadence} days.`,
      });
    } catch (err: any) {
      setDispatchMessage({
        type: 'error',
        text: `Failed to update cadence: ${err.message}`,
      });
    } finally {
      setUpdatingCadence(false);
    }
  };

  // Immediate Manual Dispatch of Content Piece
  const handleManualDispatch = async () => {
    if (!selectedPiece || !client.phone) return;

    setDispatching(true);
    setDispatchMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-dispatcher', {
        body: {
          trigger: 'crm_nurture',
          recipient_phone: client.phone,
          recipient_name: client.parent_name,
          client_id: client.client_id,
          related_content_id: selectedPiece.id,
          params: {
            content: renderedDispatchPreview,
          },
        },
      });

      if (error) throw error;

      if (data?.skipped) {
        setDispatchMessage({
          type: 'error',
          text: `Message skipped: ${data.message || data.reason}`,
        });
      } else if (data?.success) {
        setDispatchMessage({
          type: 'success',
          text: `"${selectedPiece.title}" successfully dispatched to ${client.phone}!`,
        });
        // Refresh timeline
        void loadTimeline();
      } else {
        setDispatchMessage({
          type: 'error',
          text: data?.error || 'Failed to dispatch message.',
        });
      }
    } catch (err: any) {
      setDispatchMessage({
        type: 'error',
        text: err.message || 'Dispatch failed',
      });
    } finally {
      setDispatching(false);
    }
  };

  const currentStageConfig = LIFECYCLE_CONFIG[client.lifecycle_stage] || LIFECYCLE_CONFIG.unknown;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-beige bg-white shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Header */}
        <div className="flex items-start justify-between border-b border-beige/60 bg-[#faf8f4] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage/20 text-sage-dark font-serif text-xl font-medium">
              {client.parent_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-2xl font-semibold text-charcoal">{client.parent_name}</h2>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium uppercase tracking-wider ${
                    client.current_track === 'track_b'
                      ? 'bg-sage text-white'
                      : 'bg-white text-charcoal border border-beige'
                  }`}
                >
                  {client.current_track === 'track_b' ? 'Track B: Relationship Continuity' : 'Track A: Nurture & Taste'}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    client.engagement_status === 'opted_out'
                      ? 'bg-rose-100 text-rose-800'
                      : client.engagement_status === 'paused'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {client.engagement_status.toUpperCase()}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-warm-gray">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-warm-gray" />
                  {client.email}
                </span>
                {client.phone ? (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3.5 w-3.5 text-sage-dark" />
                    {client.phone}
                  </span>
                ) : (
                  <span className="text-rose-500 font-medium">No phone on file</span>
                )}
                {countryObj ? (
                  <span className="flex items-center gap-1">
                    <span>{countryObj.flag}</span>
                    <span>{countryObj.name}</span>
                  </span>
                ) : null}
                {client.phone ? (
                  <button
                    type="button"
                    onClick={() => setIsMessengerOpen(true)}
                    className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Send WhatsApp Message</span>
                  </button>
                ) : null}
                <Link
                  to={`/admin/sessions?client=${client.client_id}`}
                  className="inline-flex items-center gap-1.5 font-medium text-sage-dark hover:text-charcoal hover:underline cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
                  <span>Session Notes</span>
                </Link>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-warm-gray transition hover:bg-beige/40 hover:text-charcoal"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications banner */}
          {dispatchMessage ? (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                dispatchMessage.type === 'success'
                  ? 'border-sage/30 bg-sage/10 text-sage-dark'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {dispatchMessage.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-sage-dark mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{dispatchMessage.text}</p>
              </div>
            </div>
          ) : null}

          {/* Section 1: State & Next Step Intelligence Card */}
          <div className="rounded-2xl border border-beige bg-[#faf8f4] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-beige/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-charcoal">Relationship Intelligence</h3>
                  <p className="text-xs text-warm-gray">Dynamically calculated from session and message history</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-charcoal border border-beige/80">
                  {currentStageConfig.label}
                </span>
              </div>
            </div>

            {/* Smart Next Step Banner */}
            <div className="flex items-start gap-3.5 rounded-xl border border-sage/30 bg-white p-4 shadow-2xs">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sage-dark" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-charcoal">Next Step Recommendation</p>
                <p className="mt-1 text-warm-gray leading-relaxed">{client.next_step_recommendation}</p>
                <p className="mt-2 text-xs text-sage-dark font-medium italic">
                  Rationale: {currentStageConfig.description}
                </p>
              </div>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white p-3 border border-beige/60">
                <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Paid Sessions</p>
                <p className="mt-1 font-serif text-2xl font-medium text-charcoal">
                  {client.completed_paid_sessions_count}
                </p>
                <p className="text-[11px] text-warm-gray">
                  {client.completed_free_sessions_count} free consultations
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-beige/60">
                <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Upcoming Sessions</p>
                <p className="mt-1 font-serif text-2xl font-medium text-charcoal">
                  {client.upcoming_sessions_count}
                </p>
                <p className="text-[11px] text-warm-gray">
                  {client.next_upcoming_session_at
                    ? new Date(client.next_upcoming_session_at).toLocaleDateString()
                    : 'None scheduled'}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-beige/60">
                <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Last Touchpoint</p>
                <p className="mt-1 font-serif text-2xl font-medium text-charcoal">
                  {client.days_since_last_engagement}d
                </p>
                <p className="text-[11px] text-warm-gray">
                  {new Date(client.last_engagement_at).toLocaleDateString()}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-beige/60">
                <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Last Session</p>
                <p className="mt-1 font-serif text-2xl font-medium text-charcoal">
                  {client.days_since_last_session !== null ? `${client.days_since_last_session}d` : '—'}
                </p>
                <p className="text-[11px] text-warm-gray">
                  {client.last_completed_paid_session_at
                    ? new Date(client.last_completed_paid_session_at).toLocaleDateString()
                    : 'No paid session yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Engagement Controls & Manual Dispatch */}
          <div className="rounded-2xl border border-beige bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-beige/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-medium text-charcoal">Engagement Controls & Dispatch</h3>
                <p className="text-xs text-warm-gray">Adjust cadence, toggle automated pause, or send a specific prompt now</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Toggle Card */}
              <div className="rounded-xl border border-beige/80 bg-[#faf8f4] p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-warm-gray">Automated Outreach</p>
                  <p className="mt-1 text-xs text-charcoal">
                    Current status is <span className="font-semibold">{client.engagement_status}</span>.
                    {client.engagement_status === 'opted_out'
                      ? ' Client requested STOP.'
                      : client.engagement_status === 'paused'
                      ? ' Automated nurture is paused.'
                      : ' Outreach is active.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={updatingStatus || client.engagement_status === 'opted_out'}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-beige bg-white px-3 py-2 text-xs font-medium text-charcoal transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
                >
                  {updatingStatus ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : client.engagement_status === 'active' ? (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-600" /> Pause Nurture
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-emerald-600" /> Resume Nurture
                    </>
                  )}
                </button>
              </div>

              {/* Cadence Selector Card */}
              <div className="rounded-xl border border-beige/80 bg-[#faf8f4] p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-warm-gray">Outreach Cadence</p>
                  <p className="mt-1 text-xs text-charcoal">
                    Delivers unseen pieces every <span className="font-semibold">{client.engagement_cadence_days} days</span>.
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <select
                    value={client.engagement_cadence_days}
                    onChange={(e) => handleUpdateCadence(Number(e.target.value))}
                    disabled={updatingCadence}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs font-medium text-charcoal outline-none focus:border-sage"
                  >
                    <option value={7}>Every 7 days (Weekly)</option>
                    <option value={10}>Every 10 days (Standard)</option>
                    <option value={14}>Every 14 days (Bi-weekly, default)</option>
                    <option value={21}>Every 21 days (Gentle)</option>
                    <option value={30}>Every 30 days (Monthly)</option>
                  </select>
                </div>
              </div>

              {/* Manual Dispatch Card */}
              <div className="rounded-xl border border-beige/80 bg-[#faf8f4] p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-warm-gray">Manual WhatsApp Send</p>
                  <p className="mt-1 text-xs text-charcoal">Select and dispatch any piece from the library right now.</p>
                </div>

                <div className="mt-3 space-y-2">
                  <select
                    value={selectedPieceId}
                    onChange={(e) => setSelectedPieceId(e.target.value)}
                    disabled={dispatching || libraryPieces.length === 0}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-sage"
                  >
                    {libraryPieces.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.target_track.toUpperCase()}] {p.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleManualDispatch}
                    disabled={dispatching || !client.phone || !selectedPiece}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2 text-xs font-medium text-white transition hover:bg-sage-dark disabled:opacity-50"
                  >
                    {dispatching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Send to Client Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Message Dispatch Preview */}
            {selectedPiece ? (
              <div className="rounded-xl border border-beige/60 bg-[#faf8f4] p-3 text-xs">
                <div className="flex items-center justify-between text-warm-gray mb-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Preview for {client.parent_name}:</span>
                  <span>Content ID: {selectedPiece.id.slice(0, 8)}...</span>
                </div>
                <p className="whitespace-pre-wrap font-sans text-charcoal bg-white p-3 rounded-lg border border-beige/50 text-[13px] leading-relaxed">
                  {renderedDispatchPreview}
                </p>
              </div>
            ) : null}
          </div>

          {/* Section 3: Unified Chronological Timeline */}
          <div className="rounded-2xl border border-beige bg-white p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-beige/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-medium text-charcoal">Unified Touchpoint History</h3>
                <p className="text-xs text-warm-gray">
                  Consolidated chronological stream of bookings, sessions, recordings, WhatsApp messages, and website inquiries
                </p>
              </div>

              {/* Sub-filter tabs */}
              <div className="flex items-center gap-1 rounded-xl bg-[#faf8f4] p-1 border border-beige/60 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setTimelineFilter('all')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap ${
                    timelineFilter === 'all' ? 'bg-white text-charcoal shadow-2xs' : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  All ({timeline.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('sessions')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap ${
                    timelineFilter === 'sessions' ? 'bg-white text-charcoal shadow-2xs' : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  Sessions & Recordings ({timeline.filter((e) => e.category === 'booking' || e.category === 'session').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('whatsapp')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap ${
                    timelineFilter === 'whatsapp' ? 'bg-white text-charcoal shadow-2xs' : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  WhatsApp ({timeline.filter((e) => e.category === 'whatsapp').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('contact')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap ${
                    timelineFilter === 'contact' ? 'bg-white text-charcoal shadow-2xs' : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  Inquiries ({timeline.filter((e) => e.category === 'contact').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('family')}
                  className={`rounded-lg px-2.5 py-1 font-medium transition whitespace-nowrap ${
                    timelineFilter === 'family' ? 'bg-white text-charcoal shadow-2xs' : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  Family Unit ({householdInfo?.members ? householdInfo.members.length : 0})
                </button>
                <button
                  type="button"
                  onClick={() => void loadTimeline()}
                  className="rounded-lg p-1 text-warm-gray hover:text-charcoal hover:bg-white shrink-0"
                  title="Refresh Timeline"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTimeline ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* View Body */}
            {timelineFilter === 'family' ? (
              /* Family Unit & Personas Hub */
              <div className="space-y-4">
                {householdInfo?.household ? (
                  <>
                    <div className="rounded-xl border border-beige/80 bg-[#faf8f4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-sage-dark" />
                          <h4 className="font-serif text-base font-medium text-charcoal">
                            {householdInfo.household.family_name} Household
                          </h4>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                              householdInfo.household.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-100 text-charcoal border-gray-200'
                            }`}
                          >
                            {householdInfo.household.status?.toUpperCase() || 'ACTIVE'}
                          </span>
                        </div>
                        {householdInfo.household.presenting_issue ? (
                          <p className="mt-1 text-xs text-warm-gray line-clamp-2">
                            {householdInfo.household.presenting_issue}
                          </p>
                        ) : null}
                      </div>

                      <Link
                        to={`/admin/sessions?client=${client.client_id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white px-3 py-2 text-xs font-medium text-charcoal hover:border-sage hover:text-sage-dark transition shadow-2xs shrink-0"
                      >
                        Open in Session Notes
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Member Personas Cards */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-warm-gray">
                        Family Members & Psychological Personas ({householdInfo.members.length})
                      </h5>

                      {householdInfo.members.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-beige bg-[#faf8f4] py-8 text-center text-xs text-warm-gray">
                          No members registered in this household yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {householdInfo.members.map((member) => {
                            const openTasks = householdInfo.openActionCounts[member.id] || 0;
                            const age = currentAge(member.birth_year);
                            const householdId = householdInfo.household?.id;

                            return (
                              <div
                                key={member.id}
                                className="rounded-xl border border-beige/80 bg-white p-4 shadow-2xs hover:border-sage/60 transition flex flex-col justify-between space-y-3"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h6 className="text-sm font-medium text-charcoal">{member.full_name}</h6>
                                        <span className="rounded-md bg-beige/60 px-1.5 py-0.5 text-[10px] text-warm-gray font-medium">
                                          {roleLabel(member.role)}
                                        </span>
                                      </div>
                                      {age !== null ? (
                                        <p className="text-[11px] text-warm-gray mt-0.5">{age} years old</p>
                                      ) : null}
                                    </div>

                                    {/* Neutral concern level badge (per decisions.md §6 placeholder taxonomy) */}
                                    {member.concern_level ? (
                                      <span className="inline-flex items-center rounded-md bg-[#faf8f4] px-2 py-0.5 text-[10px] font-medium text-charcoal border border-beige">
                                        {member.concern_level}
                                      </span>
                                    ) : null}
                                  </div>

                                  {/* Dynamic role */}
                                  {member.family_dynamic_role ? (
                                    <div className="mt-2 flex items-center gap-1 text-[11px] text-warm-gray">
                                      <Tag className="h-3 w-3 text-sage-dark shrink-0" />
                                      <span className="font-medium text-charcoal">{member.family_dynamic_role}</span>
                                    </div>
                                  ) : null}

                                  {/* Persona summary */}
                                  {member.persona_summary ? (
                                    <p className="mt-2 text-xs text-charcoal/80 bg-[#faf8f4] p-2.5 rounded-lg border border-beige/60 leading-relaxed line-clamp-3">
                                      {member.persona_summary}
                                    </p>
                                  ) : null}

                                  {/* Triggers & Strengths */}
                                  <div className="mt-2 space-y-1">
                                    {member.known_triggers && member.known_triggers.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span className="text-[10px] text-rose-700 font-medium">Triggers:</span>
                                        {member.known_triggers.slice(0, 3).map((t, idx) => (
                                          <span
                                            key={idx}
                                            className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.5 text-[10px] border border-rose-200"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}

                                    {member.strengths && member.strengths.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span className="text-[10px] text-emerald-700 font-medium">Strengths:</span>
                                        {member.strengths.slice(0, 3).map((s, idx) => (
                                          <span
                                            key={idx}
                                            className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] border border-emerald-200"
                                          >
                                            {s}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-beige/50 pt-2 text-xs">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                      openTasks > 0 ? 'text-amber-700' : 'text-warm-gray'
                                    }`}
                                  >
                                    <ListTodo className="h-3 w-3" />
                                    {openTasks} open requirement{openTasks === 1 ? '' : 's'}
                                  </span>

                                  {householdId ? (
                                    <Link
                                      to={`/admin/sessions?client=${client.client_id}&member=${member.id}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-dark hover:underline"
                                    >
                                      Clinical Study
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-beige bg-[#faf8f4] py-12 text-center">
                    <Users className="mx-auto h-8 w-8 text-warm-gray/60 mb-2" />
                    <h5 className="font-medium text-sm text-charcoal">No Household Linked</h5>
                    <p className="mt-1 text-xs text-warm-gray max-w-sm mx-auto">
                      This client is not yet linked to a household in Family Cases. You can establish a household to record family personas, longitudinal notes, and member action items.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsStartFamilyCaseOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sage px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-dark transition shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Start Family Case
                    </button>
                  </div>
                )}
              </div>
            ) : loadingTimeline ? (
              <div className="flex items-center justify-center py-12 text-sm text-warm-gray">
                <Loader2 className="h-5 w-5 animate-spin text-sage-dark mr-2" />
                Aggregating historical touchpoints...
              </div>
            ) : timelineError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                {timelineError}
              </div>
            ) : filteredTimeline.length === 0 ? (
              <div className="rounded-xl border border-dashed border-beige bg-[#faf8f4] py-10 text-center text-xs text-warm-gray">
                No touchpoint events recorded for this category yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-beige">
                {filteredTimeline.map((item) => {
                  const isExpanded = expandedEventId === item.id;
                  const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline node icon */}
                      <div
                        className={`absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-xs ${
                          item.category === 'session'
                            ? 'bg-purple-100 text-purple-700'
                            : item.category === 'booking'
                            ? 'bg-sky-100 text-sky-700'
                            : item.badge?.tone === 'teal'
                            ? 'bg-teal-100 text-teal-700'
                            : item.badge?.tone === 'sage'
                            ? 'bg-sage/30 text-sage-dark'
                            : item.category === 'contact'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-beige text-charcoal'
                        }`}
                      >
                        {item.category === 'session' ? (
                          <FileText className="h-3 w-3" />
                        ) : item.category === 'booking' ? (
                          <Calendar className="h-3 w-3" />
                        ) : item.badge?.tone === 'teal' ? (
                          <MessageSquare className="h-3 w-3" />
                        ) : item.category === 'contact' ? (
                          <Inbox className="h-3 w-3" />
                        ) : (
                          <MessageCircle className="h-3 w-3" />
                        )}
                      </div>

                      {/* Event Card */}
                      <div className="rounded-xl border border-beige/70 bg-[#faf8f4] p-4 transition hover:border-sage/50 hover:bg-white">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm text-charcoal">{item.title}</h4>
                              {item.badge ? (
                                <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-white text-charcoal border border-beige">
                                  {item.badge.text}
                                </span>
                              ) : null}
                            </div>
                            {item.subtitle ? (
                              <p className="mt-0.5 text-xs text-warm-gray">{item.subtitle}</p>
                            ) : null}
                          </div>

                          <span className="text-[11px] text-warm-gray font-mono">{dateStr}</span>
                        </div>

                        {/* Attendee chips */}
                        {item.details?.attendee_names && item.details.attendee_names.length > 0 ? (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-warm-gray flex items-center gap-1">
                              <Users className="h-3 w-3" /> Attendees:
                            </span>
                            {item.details.attendee_names.map((name: string) => (
                              <span
                                key={name}
                                className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-charcoal border border-beige"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {/* Transcript indicator */}
                        {item.details?.has_transcript ? (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Live Arabic Transcript Recorded
                            </span>
                          </div>
                        ) : null}

                        {/* Description / Content Body */}
                        {item.description ? (
                          <div className="mt-2.5">
                            <p
                              className={`text-xs text-charcoal/90 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-beige/50 leading-relaxed ${
                                !isExpanded && item.description.length > 200 ? 'line-clamp-3' : ''
                              }`}
                            >
                              {item.description}
                            </p>
                            {item.description.length > 200 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedEventId(isExpanded ? null : item.id)}
                                className="mt-1 text-[11px] font-medium text-sage-dark hover:underline inline-flex items-center gap-0.5"
                              >
                                {isExpanded ? (
                                  <>
                                    Show less <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    Read full message <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Session Actions or Booking Link */}
                        {item.category === 'session' ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {item.details?.drive_recording_url ? (
                              <a
                                href={item.details.drive_recording_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                                Open Voice Recording in Google Drive
                              </a>
                            ) : null}

                            {item.details?.session_id ? (
                              <a
                                href={`/admin/sessions?client=${client.client_id}&session=${item.details.session_id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-beige bg-white px-2.5 py-1 text-xs font-medium text-charcoal hover:border-sage hover:text-sage-dark transition shadow-2xs"
                              >
                                <FileText className="h-3.5 w-3.5 text-sage" />
                                Session Workspace & Notes
                              </a>
                            ) : null}
                          </div>
                        ) : item.link ? (
                          <div className="mt-2.5">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline"
                            >
                              <CalendarDays className="h-3.5 w-3.5" /> Open Google Meet Call{' '}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-beige/60 bg-[#faf8f4] px-6 py-4">
          <p className="text-xs text-warm-gray">
            Client ID: <span className="font-mono text-charcoal">{client.client_id}</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-beige bg-white px-4 py-2 text-xs font-medium text-charcoal hover:border-sage transition"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* Internal WhatsApp Messenger Modal */}
      <InternalWhatsAppMessengerModal
        isOpen={isMessengerOpen}
        onClose={() => setIsMessengerOpen(false)}
        client={client}
        onMessageSent={() => void loadTimeline()}
      />

      {/* Start Family Case Modal */}
      {isStartFamilyCaseOpen && (
        <StartFamilyCaseModal
          client={{
            id: client.client_id,
            full_name: client.parent_name,
            email: client.email,
          }}
          isOpen={isStartFamilyCaseOpen}
          onClose={() => setIsStartFamilyCaseOpen(false)}
          onSuccess={() => {
            setIsStartFamilyCaseOpen(false);
            void loadTimeline();
          }}
        />
      )}
    </div>
  );
};
