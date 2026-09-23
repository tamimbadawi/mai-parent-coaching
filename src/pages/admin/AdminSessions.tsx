import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Users, Calendar, User, CheckCircle2, Loader2, AlertCircle, Home, ExternalLink } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { SuperAdminGate } from '../../components/auth/SuperAdminGate';
import { TranscriptViewer } from '../../components/sessions/TranscriptViewer';
import { SessionChatPanel } from '../../components/sessions/SessionChatPanel';
import { ClientDossierModal } from './components/ClientDossierModal';
import { useSessionChat } from '../../hooks/useSessionChat';
import { MOCK_CLIENT_SESSIONS } from '../../data/mockSessions';
import { supabase } from '../../lib/supabase';
import type { ClientSessionSummary, SessionTranscript, TranscriptUtterance } from '../../types/session';
import type { CustomerJourneyState } from '../../types';

export const AdminSessions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Start empty rather than seeded with mock data — real Supabase data (which already
  // incorporates the mock content as a fallback) replaces this almost immediately, and
  // rendering the mock set first just causes a visible flash/swap on every page load.
  const [clients, setClients] = useState<ClientSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Floating CRM Dossier modal (opened in place, no page navigation)
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierClient, setDossierClient] = useState<CustomerJourneyState | null>(null);

  // Client and Session state with URL synchronization
  const initialClientId = searchParams.get('client') || clients[0]?.clientId || '';
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);

  const activeClient = useMemo(
    () => clients.find((c) => c.clientId === selectedClientId) || clients[0],
    [clients, selectedClientId]
  );

  const initialSessionId =
    searchParams.get('session') || activeClient?.sessions[0]?.id || '';
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId);

  // Sync state if URL search params change externally
  useEffect(() => {
    const urlClient = searchParams.get('client');
    const urlSession = searchParams.get('session');

    if (urlClient && urlClient !== selectedClientId) {
      const match = clients.find((c) => c.clientId === urlClient);
      if (match) {
        setSelectedClientId(urlClient);
        if (urlSession && match.sessions.some((s) => s.id === urlSession)) {
          setSelectedSessionId(urlSession);
        } else if (match.sessions.length > 0) {
          setSelectedSessionId(match.sessions[0].id);
        }
      }
    } else if (urlSession && urlSession !== selectedSessionId) {
      if (activeClient?.sessions.some((s) => s.id === urlSession)) {
        setSelectedSessionId(urlSession);
      }
    }
  }, [searchParams, clients, selectedClientId, selectedSessionId, activeClient]);

  // Load real clients, households, case_sessions, and bookings from Supabase
  const loadRealClientSessions = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .order('created_at', { ascending: false });

      // 2. Fetch households with members
      const { data: householdsData } = await supabase
        .from('households')
        .select('id, primary_contact_profile_id, family_name, presenting_issue, working_plan, next_step, status, household_members(id, full_name, role, birth_year, notes)');

      // 3. Fetch case sessions with content
      const { data: sessionsData } = await supabase
        .from('case_sessions')
        .select('id, household_id, booking_id, session_date, duration_minutes, google_meet_url, drive_web_view_url, status, session_content(id, content_type, content, source_metadata)')
        .order('session_date', { ascending: true });

      // 4. Fetch bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, user_id, parent_name, email, phone, child_name, child_age, appointment_date, appointment_time, status, notes, google_meet_url')
        .order('appointment_date', { ascending: false });

      const profiles = profilesData || [];
      const households = householdsData || [];
      const dbSessions = sessionsData || [];
      const bookings = bookingsData || [];

      // Map indexed by profile ID or mock client ID
      const seedMap = new Map<string, ClientSessionSummary>();
      for (const m of MOCK_CLIENT_SESSIONS) {
        seedMap.set(m.clientId, m);
        if (m.clientEmail) {
          seedMap.set(m.clientEmail.toLowerCase(), m);
        }
      }

      const unifiedClients: ClientSessionSummary[] = [];

      for (const profile of profiles) {
        const pEmail = (profile.email || '').toLowerCase();
        const seed = seedMap.get(profile.id) || seedMap.get(pEmail);

        // Find linked household
        const household = households.find((h) => h.primary_contact_profile_id === profile.id);

        // Extract child details
        let childName = seed?.childName;
        let childAge = seed?.childAge;

        if (household && household.household_members) {
          const children = household.household_members.filter((m: { role: string }) => m.role === 'child');
          if (children.length > 0) {
            childName = children.map((c: { full_name: string }) => c.full_name).join(' & ');
            const currentYear = new Date().getFullYear();
            const ages = children
              .map((c: { birth_year: number | null }) => (c.birth_year ? `${currentYear - c.birth_year}y` : ''))
              .filter(Boolean);
            if (ages.length > 0) {
              childAge = ages.join(', ');
            }
          }
        }

        // Fallback child details from bookings
        if (!childName) {
          const userBooking = bookings.find(
            (b) => b.user_id === profile.id || (b.email && b.email.toLowerCase() === pEmail)
          );
          if (userBooking?.child_name) {
            childName = userBooking.child_name;
            childAge = userBooking.child_age || undefined;
          }
        }

        // Build Sessions
        const clientSessions: SessionTranscript[] = [];

        // A. Check if household has case_sessions
        if (household) {
          const matchedSessions = dbSessions.filter((s) => s.household_id === household.id);
          matchedSessions.forEach((dbSess, idx) => {
            const seedSession = seed?.sessions.find((s) => s.id === dbSess.id) || seed?.sessions[idx];

            const postNotes = dbSess.session_content?.find(
              (c: { content_type: string }) => c.content_type === 'post_session_notes'
            );
            const liveTranscript = dbSess.session_content?.find(
              (c: { content_type: string }) => c.content_type === 'live_transcript'
            );
            const handNotes = dbSess.session_content?.find(
              (c: { content_type: string }) => c.content_type === 'handwritten_notes'
            );

            // Parse live transcript into utterances if available
            let parsedTranscript: TranscriptUtterance[] = seedSession?.rawTranscript || [];
            if (liveTranscript?.content) {
              const lines = liveTranscript.content.split('\n').filter((l: string) => l.trim());
              const utterances: TranscriptUtterance[] = [];
              lines.forEach((line: string, lineIdx: number) => {
                const match = line.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
                if (match) {
                  utterances.push({
                    id: `utt-${dbSess.id}-${lineIdx}`,
                    timestamp: match[1],
                    speaker: match[2].includes('Mai') ? 'Mai (Coach)' : 'Parent',
                    text: match[3],
                  });
                }
              });
              if (utterances.length > 0) {
                parsedTranscript = utterances;
              }
            }

            const clinicalSummary =
              postNotes?.content ||
              seedSession?.clinicalSummary ||
              `### Session #${idx + 1} Consultation Notes\n\n**Date**: ${new Date(dbSess.session_date).toLocaleDateString()}\n**Status**: ${dbSess.status}\n\n${household.presenting_issue ? `**Presenting Focus**: ${household.presenting_issue}\n\n` : ''}${household.working_plan ? `**Working Plan**: ${household.working_plan}\n\n` : ''}No detailed clinical notes transcribed yet. Use the editor below to document observations and action commitments.`;

            const handwrittenNotes =
              handNotes?.content ||
              seedSession?.handwrittenNotes ||
              '';

            let keyInsights = seedSession?.keyInsights || (household.presenting_issue ? [household.presenting_issue] : ['Focus on consistent co-regulation routines.']);
            if (postNotes?.source_metadata && typeof postNotes.source_metadata === 'object') {
              const meta = postNotes.source_metadata as Record<string, unknown>;
              if (Array.isArray(meta.keyInsights) && meta.keyInsights.length > 0) {
                keyInsights = meta.keyInsights as string[];
              }
            }

            const actionItems = seedSession?.actionItems || (household.next_step ? [
              {
                id: `act-${dbSess.id}-1`,
                text: household.next_step,
                category: 'parent' as const,
                completed: false,
                priority: 'high' as const,
              },
            ] : []);

            clientSessions.push({
              id: dbSess.id,
              bookingId: dbSess.booking_id || undefined,
              clientId: profile.id,
              clientName: profile.full_name || seed?.clientName || 'Parent',
              clientEmail: profile.email || seed?.clientEmail || '',
              sessionNumber: idx + 1,
              sessionDate: dbSess.session_date,
              durationMinutes: dbSess.duration_minutes || seedSession?.durationMinutes || 50,
              googleMeetUrl: dbSess.google_meet_url || seedSession?.googleMeetUrl,
              driveWebViewUrl: dbSess.drive_web_view_url || seedSession?.driveWebViewUrl,
              focusAreas: seedSession?.focusAreas || (household.presenting_issue ? [household.presenting_issue.slice(0, 40)] : ['Parent Coaching']),
              clinicalSummary,
              handwrittenNotes,
              keyInsights,
              actionItems,
              emotionalObservations: seedSession?.emotionalObservations || {
                parentalStressLevel: 'moderate',
                nervousSystemState: 'fluctuating',
                identifiedTriggers: ['Transition windows', 'Evening exhaustion'],
                strengthsNoted: ['Deep dedication to child well-being', 'High receptivity to coaching'],
                childDynamicsSummary: childName ? `${childName} is responsive to calm co-regulation and consistent routines.` : undefined,
              },
              rawTranscript: parsedTranscript,
              status: (dbSess.status === 'completed' ? 'completed' : 'processing') as 'completed' | 'processing' | 'failed',
              createdAt: dbSess.session_date,
              updatedAt: dbSess.session_date,
            });
          });
        }

        // B. If no case_sessions exist, check bookings
        if (clientSessions.length === 0) {
          const userBookings = bookings.filter(
            (b) => b.user_id === profile.id || (b.email && b.email.toLowerCase() === pEmail)
          );

          if (userBookings.length > 0) {
            userBookings.forEach((b, bIdx) => {
              clientSessions.push({
                id: b.id,
                bookingId: b.id,
                clientId: profile.id,
                clientName: profile.full_name || b.parent_name || 'Parent',
                clientEmail: profile.email || b.email || '',
                sessionNumber: bIdx + 1,
                sessionDate: `${b.appointment_date}T${b.appointment_time ? b.appointment_time + ':00Z' : '10:00:00Z'}`,
                durationMinutes: 50,
                googleMeetUrl: b.google_meet_url || undefined,
                focusAreas: b.notes ? [b.notes.slice(0, 40)] : ['Initial Consultation'],
                clinicalSummary: `### Booking Consultation #${bIdx + 1}\n\n**Date**: ${b.appointment_date} (${b.appointment_time || '10:00 AM'})\n**Status**: ${b.status}\n${b.notes ? `\n**Client Notes**: ${b.notes}\n` : ''}\n### Key Focus\n- Establish baseline connection and nervous system safety.\n- Understand child triggers and transition patterns.\n- Introduce practical somatic anchors.`,
                keyInsights: [
                  'Session scheduled via booking calendar.',
                  'Focus on assessing family dynamics and emotional triggers.',
                ],
                actionItems: [
                  {
                    id: `act-book-${b.id}-1`,
                    text: 'Conduct initial consultation and map out child emotional triggers.',
                    category: 'coach',
                    completed: b.status === 'completed',
                    priority: 'high',
                  },
                ],
                emotionalObservations: {
                  parentalStressLevel: 'moderate',
                  nervousSystemState: 'regulated_ventral',
                  identifiedTriggers: ['Intake review in progress'],
                  strengthsNoted: ['Proactive booking of supportive consultation'],
                },
                rawTranscript: [],
                status: b.status === 'completed' ? 'completed' : 'processing',
                createdAt: `${b.appointment_date}T10:00:00Z`,
                updatedAt: `${b.appointment_date}T10:00:00Z`,
              });
            });
          }
        }

        // C. If still no sessions, check if seed has sessions, or create a ready-to-use intake slot
        if (clientSessions.length === 0) {
          if (seed && seed.sessions.length > 0) {
            // Re-bind seed sessions to this real profile ID
            seed.sessions.forEach((s, sIdx) => {
              clientSessions.push({
                ...s,
                clientId: profile.id,
                clientName: profile.full_name || seed.clientName,
                clientEmail: profile.email || seed.clientEmail,
                sessionNumber: sIdx + 1,
              });
            });
          } else {
            // Provide an initial intake slot so Mai can write notes for ANY registered client
            clientSessions.push({
              id: `intake-${profile.id}`,
              clientId: profile.id,
              clientName: profile.full_name || 'Parent',
              clientEmail: profile.email || '',
              sessionNumber: 1,
              sessionDate: new Date().toISOString(),
              durationMinutes: 50,
              focusAreas: ['Initial Assessment & Parent Consultation'],
              clinicalSummary: `### Intake & Clinical Assessment\n\nClient account registered. No clinical sessions logged yet.\n\n### Clinical Observations\nUse the tabs below to record:\n1. Executive clinical summary and progress milestones\n2. Practical action commitments (parent and coach tasks)\n3. Nervous system state and behavioral triggers\n4. Dialogue transcript or session audio insights`,
              keyInsights: ['Initial intake ready for documentation.'],
              actionItems: [
                {
                  id: `act-init-${profile.id}`,
                  text: 'Complete baseline family intake and agree on initial regulation goals.',
                  category: 'coach',
                  completed: false,
                  priority: 'high',
                },
              ],
              emotionalObservations: {
                parentalStressLevel: 'moderate',
                nervousSystemState: 'fluctuating',
                identifiedTriggers: ['Awaiting intake documentation'],
                strengthsNoted: ['Initiated parent coaching support'],
              },
              rawTranscript: [],
              status: 'processing',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        unifiedClients.push({
          clientId: profile.id,
          clientName: profile.full_name || seed?.clientName || (profile.email ? profile.email.split('@')[0] : 'Parent'),
          clientEmail: profile.email || '',
          phone: profile.phone || seed?.phone || undefined,
          childName,
          childAge,
          householdId: household?.id,
          totalSessions: clientSessions.length,
          sessions: clientSessions,
        });
      }

      // Preserve any mock clients that might not be in Supabase profiles yet (fallback)
      for (const m of MOCK_CLIENT_SESSIONS) {
        if (!unifiedClients.some((c) => c.clientId === m.clientId || (c.clientEmail && c.clientEmail.toLowerCase() === m.clientEmail.toLowerCase()))) {
          unifiedClients.push(m);
        }
      }

      // Sort: clients with completed sessions or active names first
      unifiedClients.sort((a, b) => {
        const aCompleted = a.sessions.filter((s) => s.status === 'completed').length;
        const bCompleted = b.sessions.filter((s) => s.status === 'completed').length;
        if (bCompleted !== aCompleted) return bCompleted - aCompleted;
        return a.clientName.localeCompare(b.clientName);
      });

      setClients(unifiedClients);

      // Check if URL specifies a client
      const urlClientId = searchParams.get('client');
      if (urlClientId) {
        const found = unifiedClients.find((c) => c.clientId === urlClientId);
        if (found) {
          setSelectedClientId(urlClientId);
          const urlSessionId = searchParams.get('session');
          if (urlSessionId && found.sessions.some((s) => s.id === urlSessionId)) {
            setSelectedSessionId(urlSessionId);
          } else if (found.sessions.length > 0) {
            setSelectedSessionId(found.sessions[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load real client sessions from Supabase:', err);
      // Fall back to mock data rather than leaving the page stuck on its loading state.
      setClients((prev) => (prev.length > 0 ? prev : MOCK_CLIENT_SESSIONS));
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadRealClientSessions();
  }, [loadRealClientSessions]);

  // When client changes, auto-select their first session
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const targetClient = clients.find((c) => c.clientId === clientId);
    if (targetClient && targetClient.sessions.length > 0) {
      const nextSessionId = targetClient.sessions[0].id;
      setSelectedSessionId(nextSessionId);
      setSearchParams({ client: clientId, session: nextSessionId });
    } else {
      setSearchParams({ client: clientId });
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSearchParams({ client: selectedClientId, session: sessionId });
  };

  // Open the CRM Dossier in place, without navigating away from Session Notes
  const openClientDossier = async (client: ClientSessionSummary) => {
    setShowDossierModal(true);
    const { data } = await supabase
      .from('customer_journey_state')
      .select('*')
      .eq('client_id', client.clientId)
      .maybeSingle();

    if (data) {
      setDossierClient(data as CustomerJourneyState);
      return;
    }

    // Fallback: no CRM journey row yet, build a minimal one from what Session Notes already knows
    setDossierClient({
      client_id: client.clientId,
      parent_name: client.clientName,
      email: client.clientEmail,
      phone: client.phone || null,
      country: null,
      role: 'student',
      client_created_at: new Date().toISOString(),
      engagement_status: 'active',
      engagement_cadence_days: 14,
      current_track: 'track_a',
      completed_paid_sessions_count: client.sessions.filter((s) => s.status === 'completed').length,
      completed_free_sessions_count: 0,
      upcoming_sessions_count: 0,
      cancelled_sessions_count: 0,
      first_completed_paid_session_at: null,
      last_completed_paid_session_at: null,
      next_upcoming_session_at: null,
      last_engagement_at: new Date().toISOString(),
      days_since_last_engagement: 0,
      days_since_last_session: null,
      lifecycle_stage: 'track_a_active',
      next_step_recommendation: '',
    });
  };

  // Find active session
  const activeSession = useMemo(() => {
    return (
      activeClient?.sessions.find((s) => s.id === selectedSessionId) ||
      activeClient?.sessions[0]
    );
  }, [activeClient, selectedSessionId]);

  // Handler to update session across all 4 editable tabs and persist to Supabase
  const handleUpdateSession = async (updatedSession: SessionTranscript) => {
    // 1. Optimistic local update
    setClients((prevClients) =>
      prevClients.map((client) => {
        if (client.clientId !== activeClient.clientId) return client;
        return {
          ...client,
          sessions: client.sessions.map((sess) =>
            sess.id === updatedSession.id ? updatedSession : sess
          ),
        };
      })
    );

    // 2. Persist to Supabase if session has a valid database UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedSession.id);
    if (!isUuid) return;

    setSaveStatus('saving');
    try {
      // Update case_session duration, status & recording link
      await supabase
        .from('case_sessions')
        .update({
          duration_minutes: updatedSession.durationMinutes,
          status: updatedSession.status === 'completed' ? 'completed' : 'scheduled',
          drive_web_view_url: updatedSession.driveWebViewUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedSession.id);

      // Upsert post_session_notes
      await supabase
        .from('session_content')
        .upsert(
          {
            session_id: updatedSession.id,
            content_type: 'post_session_notes',
            content: updatedSession.clinicalSummary,
            source_metadata: {
              keyInsights: updatedSession.keyInsights,
              actionItems: updatedSession.actionItems,
              emotionalObservations: updatedSession.emotionalObservations,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,content_type' }
        );

      // Upsert live_transcript if modified
      if (updatedSession.rawTranscript && updatedSession.rawTranscript.length > 0) {
        const transcriptText = updatedSession.rawTranscript
          .map((u) => `[${u.timestamp}] ${u.speaker}: ${u.text}`)
          .join('\n');

        await supabase
          .from('session_content')
          .upsert(
            {
              session_id: updatedSession.id,
              content_type: 'live_transcript',
              content: transcriptText,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'session_id,content_type' }
          );
      }

      // Upsert handwritten_notes if present
      if (updatedSession.handwrittenNotes !== undefined) {
        await supabase
          .from('session_content')
          .upsert(
            {
              session_id: updatedSession.id,
              content_type: 'handwritten_notes',
              content: updatedSession.handwrittenNotes,
              source_metadata: {},
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'session_id,content_type' }
          );
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (saveErr) {
      console.error('Failed to persist session updates to Supabase:', saveErr);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Google Drive link editing state
  const [driveInput, setDriveInput] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  // Sync drive link input when active session changes
  useEffect(() => {
    setDriveInput(activeSession?.driveWebViewUrl || '');
    setDriveError(null);
  }, [activeSession?.id, activeSession?.driveWebViewUrl]);

  const handleSaveDriveLink = async () => {
    if (!activeSession) return;
    const trimmed = driveInput.trim();
    if (!trimmed.startsWith('https://drive.google.com/')) {
      setDriveError('Link must start with https://drive.google.com/');
      return;
    }
    setDriveError(null);
    setIsSavingDrive(true);
    try {
      await handleUpdateSession({
        ...activeSession,
        driveWebViewUrl: trimmed,
      });
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleClearDriveLink = async () => {
    if (!activeSession) return;
    setDriveInput('');
    setDriveError(null);
    setIsSavingDrive(true);
    try {
      await handleUpdateSession({
        ...activeSession,
        driveWebViewUrl: null,
      });
    } finally {
      setIsSavingDrive(false);
    }
  };

  // Conversational Chat Hook
  const {
    messages,
    isGenerating,
    error,
    isMockMode,
    setIsMockMode,
    sendMessage,
    clearChat,
  } = useSessionChat({
    session: activeSession,
    allClientSessions: activeClient?.sessions || [],
  });

  if (!activeClient || !activeSession) {
    return (
      <SuperAdminGate>
        {() => (
          <AdminLayout
            title="Session Notes"
            subtitle="Clinical notes and consultation intelligence."
          >
            <div className="flex flex-col items-center justify-center py-20 text-warm-gray">
              <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
              <p className="text-sm font-medium">Loading connected client records...</p>
            </div>
          </AdminLayout>
        )}
      </SuperAdminGate>
    );
  }

  return (
    <SuperAdminGate>
      {() => (
        <AdminLayout
          title="Session Notes"
          subtitle="Structured clinical insights, action items, and conversational consultation."
          action={
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              {/* Status Indicator (Syncing / Saved / Error) */}
              {loading && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-10 text-[11px] font-medium text-warm-gray bg-white rounded-xl border border-beige/80 shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-sage-dark" />
                  <span>Syncing...</span>
                </div>
              )}
              {!loading && saveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 px-2.5 h-10 text-[11px] font-medium text-warm-gray bg-white rounded-xl border border-beige/80 animate-pulse shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-sage-dark" />
                  <span>Saving...</span>
                </div>
              )}
              {!loading && saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 px-2.5 h-10 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Saved</span>
                </div>
              )}
              {!loading && saveStatus === 'error' && (
                <div className="flex items-center gap-1.5 px-2.5 h-10 text-[11px] font-medium text-rose-700 bg-rose-50 rounded-xl border border-rose-200 shrink-0">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Local Save</span>
                </div>
              )}

              {/* 1. Client Selector Dropdown */}
              <div className="h-10 flex items-center gap-2 bg-[#faf8f4] px-2.5 rounded-xl border border-beige/80 shadow-2xs shrink-0">
                <div className="w-6 h-6 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
                  <Users className="w-3 h-3" />
                </div>

                <div className="flex flex-col text-left justify-center">
                  <span className="text-[9px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
                    Client ({clients.length})
                  </span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="font-serif text-xs font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer hover:text-sage-dark transition-colors py-0 pl-0 pr-3 max-w-[130px] sm:max-w-[170px] truncate leading-tight"
                  >
                    {clients.map((c) => (
                      <option key={c.clientId} value={c.clientId}>
                        {c.clientName} {c.totalSessions > 0 ? `(${c.totalSessions})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {activeClient.childName && (
                  <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium bg-white text-charcoal/70 border border-beige/80 px-1.5 py-0.5 rounded-md shrink-0">
                    <User className="w-2.5 h-2.5 text-sage-dark" />
                    <span className="max-w-[80px] truncate">{activeClient.childName}</span>
                  </span>
                )}
              </div>

              {/* 2. Session Selector Dropdown */}
              <div className="h-10 flex items-center gap-2 bg-[#faf8f4] px-2.5 rounded-xl border border-beige/80 shadow-2xs shrink-0">
                <div className="w-6 h-6 rounded-lg bg-charcoal/10 border border-charcoal/20 flex items-center justify-center text-charcoal shrink-0">
                  <Calendar className="w-3 h-3" />
                </div>

                <div className="flex flex-col text-left justify-center">
                  <span className="text-[9px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
                    Session
                  </span>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => handleSelectSession(e.target.value)}
                    className="text-xs font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer hover:text-sage-dark transition-colors py-0 pl-0 pr-3 max-w-[140px] sm:max-w-[190px] truncate leading-tight"
                  >
                    {activeClient.sessions.map((sess) => {
                      const sDate = new Date(sess.sessionDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      return (
                        <option key={sess.id} value={sess.id}>
                          #{sess.sessionNumber} — {sDate} ({sess.durationMinutes}m)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* 3. Open Client CRM Dossier in place (no page navigation) */}
              <button
                type="button"
                onClick={() => void openClientDossier(activeClient)}
                className="h-10 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-charcoal bg-[#faf8f4] hover:bg-white hover:text-sage-dark hover:border-sage/60 rounded-xl border border-beige/80 transition shadow-2xs shrink-0"
                title="View Client in CRM"
              >
                <Users className="w-3.5 h-3.5 text-sage-dark" />
                <span>CRM Dossier</span>
              </button>

              {/* 4. Direct Link to this client's Family Case, when one exists */}
              {activeClient.householdId && (
                <Link
                  to={`/admin/families/${activeClient.householdId}`}
                  className="h-10 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-charcoal bg-[#faf8f4] hover:bg-white hover:text-sage-dark hover:border-sage/60 rounded-xl border border-beige/80 transition shadow-2xs shrink-0"
                  title="View Family Case"
                >
                  <Home className="w-3.5 h-3.5 text-sage-dark" />
                  <span>Family Case</span>
                </Link>
              )}
            </div>
          }
        >
          {/* Google Drive Link Bar */}
          <div className="mb-3 rounded-2xl border border-beige bg-white p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-charcoal">Voice Recording (Google Drive)</span>
                    {activeSession.driveWebViewUrl ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Linked
                      </span>
                    ) : (
                      <span className="text-[10px] text-warm-gray">Not linked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-warm-gray truncate">
                    {activeSession.driveWebViewUrl ? (
                      <a
                        href={activeSession.driveWebViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono text-[10px]"
                      >
                        {activeSession.driveWebViewUrl}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      'Paste the Google Drive link to the session voice recording'
                    )}
                  </p>
                </div>
              </div>

              {/* Input & Action buttons */}
              <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="url"
                    value={driveInput}
                    onChange={(e) => {
                      setDriveInput(e.target.value);
                      if (driveError) setDriveError(null);
                    }}
                    placeholder="https://drive.google.com/..."
                    className="w-full sm:w-72 text-xs rounded-xl border border-beige bg-[#faf8f4] px-3 py-1.5 text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDriveLink}
                    disabled={isSavingDrive}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl bg-sage text-white hover:bg-sage-dark transition shrink-0 disabled:opacity-50"
                  >
                    {isSavingDrive ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDriveLink}
                    disabled={isSavingDrive || (!driveInput && !activeSession.driveWebViewUrl)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-beige bg-white text-warm-gray hover:text-rose-600 hover:border-rose-200 transition shrink-0 disabled:opacity-40 disabled:hover:text-warm-gray disabled:hover:border-beige"
                    title="Clear Drive link"
                  >
                    Clear
                  </button>
                </div>
                {driveError && (
                  <span className="text-[11px] font-medium text-rose-600">
                    {driveError}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Grid directly under Header: Left 7/12 (Notes) + Right 5/12 (Assistant) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start lg:h-[calc(100vh-175px)] lg:max-h-[calc(100vh-175px)]">
            <div className="lg:col-span-7 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
              <TranscriptViewer
                session={activeSession}
                onUpdateSession={handleUpdateSession}
              />
            </div>

            <div className="lg:col-span-5 h-full min-h-0 min-w-0 flex flex-col sticky top-2 overflow-hidden">
              <SessionChatPanel
                messages={messages}
                isGenerating={isGenerating}
                error={error}
                isMockMode={isMockMode}
                clientName={activeClient.clientName}
                onSendMessage={sendMessage}
                onClearChat={clearChat}
                onToggleMockMode={setIsMockMode}
              />
            </div>
          </div>

          {/* Floating CRM Dossier Modal — opened in place, no page navigation */}
          {showDossierModal && dossierClient ? (
            <ClientDossierModal
              client={dossierClient}
              sessions={activeClient?.sessions}
              onClose={() => setShowDossierModal(false)}
              onClientUpdated={(updated) => {
                setDossierClient((prev) => (prev ? { ...prev, ...updated } : null));
              }}
            />
          ) : null}
        </AdminLayout>
      )}
    </SuperAdminGate>
  );
};

export default AdminSessions;
