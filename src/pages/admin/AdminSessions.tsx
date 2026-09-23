import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Calendar, User, CheckCircle2, Loader2, AlertCircle, Plus, Sparkles, X } from 'lucide-react';
import { isToday, isFuture, parseISO } from 'date-fns';
import AdminLayout from './AdminLayout';
import { TranscriptViewer } from '../../components/sessions/TranscriptViewer';
import { FamilyGlancePanel } from '../../components/sessions/FamilyGlancePanel';
import { MemberStudyModal } from './family/MemberStudyModal';
import { StartFamilyCaseModal } from './family/StartFamilyCaseModal';
import { ClientDossierModal } from './components/ClientDossierModal';
import { MOCK_CLIENT_SESSIONS } from '../../data/mockSessions';
import { supabase } from '../../lib/supabase';
import type { ClientSessionSummary, SessionTranscript, TranscriptUtterance, EmotionalObservation } from '../../types/session';
import type { CustomerJourneyState } from '../../types';
import type { WorkflowStep } from '../../components/sessions/SessionWorkflowTabs';
import type { Household, HouseholdMember, MemberActionItem, MemberNote, SessionAttendee, MemberNoteType, CaseSession, HouseholdStatus, HouseholdMemberRole } from '../../types/family';
import type { InkPage } from '../../types/ink';

export const AdminSessions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Active household lazy data (fetched only when active household changes, 3 queries in Promise.all)
  const [householdData, setHouseholdData] = useState<{
    householdId: string | null;
    household: Household | null;
    members: HouseholdMember[];
    actionItems: MemberActionItem[];
    notes: MemberNote[];
    attendees: SessionAttendee[];
  }>({
    householdId: null,
    household: null,
    members: [],
    actionItems: [],
    notes: [],
    attendees: [],
  });

  const loadedHouseholdIdRef = useRef<string | null>(null);

  // Floating CRM Dossier modal
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierClient, setDossierClient] = useState<CustomerJourneyState | null>(null);

  // Floating Member Study Dossier modal
  const [selectedStudyMember, setSelectedStudyMember] = useState<HouseholdMember | null>(null);

  // New session & Start Family Case state
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [clientBookings, setClientBookings] = useState<any[]>([]);
  const [loadingClientBookings, setLoadingClientBookings] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [newSessionError, setNewSessionError] = useState<string | null>(null);
  const [isStartFamilyCaseOpen, setIsStartFamilyCaseOpen] = useState(false);

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

  // Workflow step (Before · Session · After)
  const [activeStep, setActiveStep] = useState<WorkflowStep>('before');
  const lastSessionIdRef = useRef<string | null>(null);

  // Find active session
  const activeSession = useMemo(() => {
    return (
      activeClient?.sessions.find((s) => s.id === selectedSessionId) ||
      activeClient?.sessions[0]
    );
  }, [activeClient, selectedSessionId]);

  // Default step: only set when a session is first opened; never override Mai's manual selection on re-render/save
  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.id !== lastSessionIdRef.current) {
      lastSessionIdRef.current = activeSession.id;
      try {
        const parsedDate = typeof activeSession.sessionDate === 'string'
          ? parseISO(activeSession.sessionDate)
          : new Date(activeSession.sessionDate);

        if (isToday(parsedDate)) {
          setActiveStep('session');
        } else if (isFuture(parsedDate)) {
          setActiveStep('before');
        } else {
          setActiveStep('after');
        }
      } catch {
        setActiveStep('after');
      }
    }
  }, [activeSession?.id, activeSession?.sessionDate]);

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
  // Note: DO NOT fetch member_action_items, member_notes, or session_attendees here!
  const loadRealClientSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: profilesData },
        { data: householdsData },
        { data: sessionsData },
        { data: bookingsData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .order('created_at', { ascending: false }),
        supabase
          .from('households')
          .select('id, primary_contact_profile_id, family_name, presenting_issue, working_plan, next_step, status, household_members(id, full_name, role, birth_year, notes)'),
        supabase
          .from('case_sessions')
          .select('id, household_id, booking_id, session_date, duration_minutes, google_meet_url, drive_web_view_url, status, session_content(id, content_type, content, source_metadata)')
          .order('session_date', { ascending: true }),
        supabase
          .from('bookings')
          .select('id, user_id, parent_name, email, phone, child_name, child_age, appointment_date, appointment_time, status, notes, google_meet_url')
          .order('appointment_date', { ascending: false }),
      ]);

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
            const prepNotes = dbSess.session_content?.find(
              (c: { content_type: string }) => c.content_type === 'pre_session_recap'
            );
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
            let parsedTranscript: TranscriptUtterance[] = [];
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
              `### Session #${idx + 1} Consultation Notes\n\n**Date**: ${new Date(dbSess.session_date).toLocaleDateString()}\n**Status**: ${dbSess.status}\n\n${household.presenting_issue ? `**Presenting Focus**: ${household.presenting_issue}\n\n` : ''}${household.working_plan ? `**Working Plan**: ${household.working_plan}\n\n` : ''}No detailed clinical write-up transcribed yet. Use the editor below to document observations and action commitments.`;

            let keyInsights: string[] = household.presenting_issue ? [household.presenting_issue] : [];
            if (postNotes?.source_metadata && typeof postNotes.source_metadata === 'object') {
              const meta = postNotes.source_metadata as Record<string, unknown>;
              if (Array.isArray(meta.keyInsights) && meta.keyInsights.length > 0) {
                keyInsights = meta.keyInsights as string[];
              }
            }

            clientSessions.push({
              id: dbSess.id,
              bookingId: dbSess.booking_id || undefined,
              clientId: profile.id,
              clientName: profile.full_name || 'Parent',
              clientEmail: profile.email || '',
              sessionNumber: idx + 1,
              sessionDate: dbSess.session_date,
              durationMinutes: dbSess.duration_minutes || 50,
              googleMeetUrl: dbSess.google_meet_url || undefined,
              driveWebViewUrl: dbSess.drive_web_view_url || null,
              focusAreas: household.presenting_issue ? [household.presenting_issue.slice(0, 40)] : ['Parent Coaching'],
              clinicalSummary,
              preSessionRecap: prepNotes?.content || '',
              hasRealPostNotes: Boolean(postNotes?.content),
              handwrittenNotes: handNotes?.content || '',
              inkPages: ((handNotes?.source_metadata as Record<string, unknown>)?.ink_pages as InkPage[]) || [],
              keyInsights,
              actionItems: [],
              emotionalObservations: {
                parentalStressLevel: 'moderate',
                nervousSystemState: 'fluctuating',
                identifiedTriggers: ['Transition windows', 'Evening exhaustion'],
                strengthsNoted: ['Deep dedication to child well-being', 'High receptivity to coaching'],
                childDynamicsSummary: childName ? `${childName} is responsive to calm co-regulation.` : undefined,
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
                driveWebViewUrl: null,
                focusAreas: b.notes ? [b.notes.slice(0, 40)] : ['Initial Consultation'],
                clinicalSummary: `### Booking Consultation #${bIdx + 1}\n\n**Date**: ${b.appointment_date} (${b.appointment_time || '10:00 AM'})\n**Status**: ${b.status}\n${b.notes ? `\n**Client Notes**: ${b.notes}\n` : ''}\n### Key Focus\n- Establish baseline connection and nervous system safety.\n- Understand child triggers and transition patterns.`,
                preSessionRecap: '',
                hasRealPostNotes: false,
                handwrittenNotes: '',
                keyInsights: ['Session scheduled via booking calendar.'],
                actionItems: [],
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

        // C. If still no sessions, create a ready-to-use intake slot
        if (clientSessions.length === 0) {
          clientSessions.push({
            id: `intake-${profile.id}`,
            clientId: profile.id,
            clientName: profile.full_name || 'Parent',
            clientEmail: profile.email || '',
            sessionNumber: 1,
            sessionDate: new Date().toISOString(),
            durationMinutes: 50,
            focusAreas: ['Initial Assessment & Parent Consultation'],
            clinicalSummary: `### Intake & Clinical Assessment\n\nClient account registered. No clinical sessions logged yet.`,
            preSessionRecap: '',
            hasRealPostNotes: false,
            handwrittenNotes: '',
            keyInsights: ['Initial intake ready for documentation.'],
            actionItems: [],
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

        unifiedClients.push({
          clientId: profile.id,
          clientName: profile.full_name || (profile.email ? profile.email.split('@')[0] : 'Parent'),
          clientEmail: profile.email || '',
          phone: profile.phone || undefined,
          childName,
          childAge,
          householdId: household?.id,
          totalSessions: clientSessions.length,
          isDemo: false,
          sessions: clientSessions,
        });
      }

      // Preserve any mock clients that don't exist in Supabase profiles yet, flagged as Demo
      for (const m of MOCK_CLIENT_SESSIONS) {
        if (!unifiedClients.some((c) => c.clientId === m.clientId || (c.clientEmail && c.clientEmail.toLowerCase() === m.clientEmail.toLowerCase()))) {
          unifiedClients.push({
            ...m,
            isDemo: true,
          });
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

      // Check if initial URL specifies a client
      const initialParams = new URLSearchParams(window.location.search);
      const urlClientId = initialParams.get('client');
      if (urlClientId) {
        const found = unifiedClients.find((c) => c.clientId === urlClientId);
        if (found) {
          setSelectedClientId(urlClientId);
          const urlSessionId = initialParams.get('session');
          if (urlSessionId && found.sessions.some((s) => s.id === urlSessionId)) {
            setSelectedSessionId(urlSessionId);
          } else if (found.sessions.length > 0) {
            setSelectedSessionId(found.sessions[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load real client sessions from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRealClientSessions();
  }, [loadRealClientSessions]);

  // Lazy load active household data (members, action items, notes, attendees)
  // Executes exactly 3 queries in Promise.all for the active household; 0 requests when switching sessions of same client.
  const fetchHouseholdData = useCallback(async (hId: string) => {
    loadedHouseholdIdRef.current = hId;
    try {
      // 1. Get household with members
      const { data: hData } = await supabase
        .from('households')
        .select('id, primary_contact_profile_id, family_name, presenting_issue, working_plan, next_step, status, created_at, updated_at, household_members(*)')
        .eq('id', hId)
        .maybeSingle();

      if (!hData) return;

      const members: HouseholdMember[] = (hData.household_members as any[]) || [];
      const memberIds = members.map((m) => m.id);

      // 2. Fetch member_action_items, member_notes, and session_attendees in Promise.all (3 queries)
      const [actionsRes, notesRes, attendeesRes] = await Promise.all([
        memberIds.length > 0
          ? supabase
              .from('member_action_items')
              .select('*')
              .in('household_member_id', memberIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        memberIds.length > 0
          ? supabase
              .from('member_notes')
              .select('*')
              .in('household_member_id', memberIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from('case_sessions')
          .select('id')
          .eq('household_id', hId)
          .then(async ({ data: sessList }) => {
            const sIds = (sessList || []).map((s) => s.id);
            if (sIds.length === 0) return { data: [] };
            return supabase
              .from('session_attendees')
              .select('*')
              .in('session_id', sIds);
          }),
      ]);

      setHouseholdData({
        householdId: hId,
        household: {
          id: hData.id,
          primary_contact_profile_id: hData.primary_contact_profile_id,
          family_name: hData.family_name,
          presenting_issue: hData.presenting_issue,
          working_plan: hData.working_plan,
          next_step: hData.next_step,
          status: hData.status,
          created_at: hData.created_at,
          updated_at: hData.updated_at,
        },
        members,
        actionItems: (actionsRes.data as MemberActionItem[]) || [],
        notes: (notesRes.data as MemberNote[]) || [],
        attendees: (attendeesRes.data as SessionAttendee[]) || [],
      });
    } catch (err) {
      console.error('Failed to load active household data:', err);
    }
  }, []);

  // Trigger lazy household fetch only when the active household changes
  useEffect(() => {
    if (!activeClient?.householdId) {
      setHouseholdData({
        householdId: null,
        household: null,
        members: [],
        actionItems: [],
        notes: [],
        attendees: [],
      });
      loadedHouseholdIdRef.current = null;
      return;
    }

    if (activeClient.householdId !== loadedHouseholdIdRef.current) {
      void fetchHouseholdData(activeClient.householdId);
    }
  }, [activeClient?.householdId, fetchHouseholdData]);

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

  // Open the CRM Dossier in place
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

  // Previous session calculation (the session immediately preceding activeSession)
  const previousSession = useMemo(() => {
    if (!activeClient || !activeSession) return null;
    const currentIdx = activeClient.sessions.findIndex((s) => s.id === activeSession.id);
    if (currentIdx > 0) {
      return activeClient.sessions[currentIdx - 1];
    }
    return null;
  }, [activeClient, activeSession]);

  /* ------------------------------------------------------------------ */
  /* PER-SECTION SAVE HANDLERS (Saves only its own database row)       */
  /* ------------------------------------------------------------------ */

  // 1. Save Prep Notes (session_content -> pre_session_recap)
  const handleSavePrepNotes = async (text: string): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id ? { ...s, preSessionRecap: text } : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    setSaveStatus('saving');
    const { error } = await supabase
      .from('session_content')
      .upsert(
        {
          session_id: activeSession.id,
          content_type: 'pre_session_recap',
          content: text,
          source_metadata: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,content_type' }
      );

    if (error) {
      console.error('Failed to save pre-session recap:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
    return true;
  };

  // 2a. Save Handwritten Notes Text (session_content.content only)
  const handleSaveHandwrittenText = async (text: string): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id
                  ? { ...s, handwrittenNotes: text }
                  : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    setSaveStatus('saving');
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('session_content')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('content_type', 'handwritten_notes')
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to query handwritten notes row:', fetchError);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }

      let saveError;
      if (existing) {
        const { error } = await supabase
          .from('session_content')
          .update({
            content: text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        saveError = error;
      } else {
        const { error: insertError } = await supabase
          .from('session_content')
          .insert({
            session_id: activeSession.id,
            content_type: 'handwritten_notes',
            content: text,
            source_metadata: {},
            updated_at: new Date().toISOString(),
          });
        if (insertError) {
          const { data: retryExisting } = await supabase
            .from('session_content')
            .select('id')
            .eq('session_id', activeSession.id)
            .eq('content_type', 'handwritten_notes')
            .maybeSingle();

          if (retryExisting) {
            const { error: updateError } = await supabase
              .from('session_content')
              .update({
                content: text,
                updated_at: new Date().toISOString(),
              })
              .eq('id', retryExisting.id);
            saveError = updateError;
          } else {
            saveError = insertError;
          }
        }
      }

      if (saveError) {
        console.error('Failed to save handwritten text:', saveError);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return true;
    } catch (err) {
      console.error('Error saving handwritten text:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }
  };

  // 2b. Save Ink Pages (session_content.source_metadata.ink_pages only)
  const handleSaveInkPages = async (pages: InkPage[]): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id
                  ? { ...s, inkPages: pages }
                  : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    setSaveStatus('saving');
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('session_content')
        .select('id, source_metadata')
        .eq('session_id', activeSession.id)
        .eq('content_type', 'handwritten_notes')
        .maybeSingle();

      if (fetchError) {
        console.error('Failed to query handwritten notes row for ink:', fetchError);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }

      let saveError;
      if (existing) {
        const currentMeta =
          existing.source_metadata &&
          typeof existing.source_metadata === 'object' &&
          !Array.isArray(existing.source_metadata)
            ? (existing.source_metadata as Record<string, unknown>)
            : {};
        const updatedMeta = { ...currentMeta, ink_pages: pages };

        const { error } = await supabase
          .from('session_content')
          .update({
            source_metadata: updatedMeta,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        saveError = error;
      } else {
        const { error: insertError } = await supabase
          .from('session_content')
          .insert({
            session_id: activeSession.id,
            content_type: 'handwritten_notes',
            content: '',
            source_metadata: { ink_pages: pages },
            updated_at: new Date().toISOString(),
          });
        if (insertError) {
          const { data: retryExisting } = await supabase
            .from('session_content')
            .select('id, source_metadata')
            .eq('session_id', activeSession.id)
            .eq('content_type', 'handwritten_notes')
            .maybeSingle();

          if (retryExisting) {
            const currentMeta =
              retryExisting.source_metadata &&
              typeof retryExisting.source_metadata === 'object' &&
              !Array.isArray(retryExisting.source_metadata)
                ? (retryExisting.source_metadata as Record<string, unknown>)
                : {};
            const updatedMeta = { ...currentMeta, ink_pages: pages };
            const { error: updateError } = await supabase
              .from('session_content')
              .update({
                source_metadata: updatedMeta,
                updated_at: new Date().toISOString(),
              })
              .eq('id', retryExisting.id);
            saveError = updateError;
          } else {
            saveError = insertError;
          }
        }
      }

      if (saveError) {
        console.error('Failed to save ink pages:', saveError);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return true;
    } catch (err) {
      console.error('Error saving ink pages:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }
  };

  // 3. Save Write-Up (session_content -> post_session_notes)
  const handleSavePostNotes = async (
    writeUp: string,
    metadata: { keyInsights: string[]; emotionalObservations: EmotionalObservation }
  ): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id
                  ? {
                      ...s,
                      clinicalSummary: writeUp,
                      keyInsights: metadata.keyInsights,
                      emotionalObservations: metadata.emotionalObservations,
                      hasRealPostNotes: true,
                    }
                  : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    setSaveStatus('saving');
    const { error } = await supabase
      .from('session_content')
      .upsert(
        {
          session_id: activeSession.id,
          content_type: 'post_session_notes',
          content: writeUp,
          source_metadata: {
            keyInsights: metadata.keyInsights,
            emotionalObservations: metadata.emotionalObservations,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,content_type' }
      );

    if (error) {
      console.error('Failed to save post-session write-up:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
    return true;
  };

  // 4. Save Drive Link (case_sessions.drive_web_view_url)
  const handleSaveDriveLink = async (url: string): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id ? { ...s, driveWebViewUrl: url } : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    setSaveStatus('saving');
    const { error } = await supabase
      .from('case_sessions')
      .update({
        drive_web_view_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Failed to save Drive link:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
    return true;
  };

  // Clear Drive Link
  const handleClearDriveLink = async (): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id ? { ...s, driveWebViewUrl: null } : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    const { error } = await supabase
      .from('case_sessions')
      .update({
        drive_web_view_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    return !error;
  };

  // 5. Save Transcript utterances (session_content -> live_transcript)
  const handleSaveTranscript = async (utterances: TranscriptUtterance[]): Promise<boolean> => {
    if (!activeSession) return false;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);

    setClients((prev) =>
      prev.map((c) =>
        c.clientId === activeClient.clientId
          ? {
              ...c,
              sessions: c.sessions.map((s) =>
                s.id === activeSession.id ? { ...s, rawTranscript: utterances } : s
              ),
            }
          : c
      )
    );

    if (!isUuid) return true;

    const transcriptText = utterances.map((u) => `[${u.timestamp}] ${u.speaker}: ${u.text}`).join('\n');

    const { error } = await supabase
      .from('session_content')
      .upsert(
        {
          session_id: activeSession.id,
          content_type: 'live_transcript',
          content: transcriptText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,content_type' }
      );

    return !error;
  };

  // 6. Action items handlers (saves directly into member_action_items table)
  const handleToggleActionItem = async (id: string, newStatus: 'open' | 'done') => {
    setHouseholdData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    }));

    const { error } = await supabase
      .from('member_action_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Failed to toggle action item status:', error);
    }
    if (householdData.householdId) {
      await fetchHouseholdData(householdData.householdId);
    }
  };

  const handleCreateActionItem = async (item: {
    memberId: string;
    task: string;
    priority: 'normal' | 'high';
    dueDate?: string | null;
  }): Promise<boolean> => {
    const isUuid = activeSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);
    const sessionId = isUuid ? activeSession.id : null;

    const { error } = await supabase.from('member_action_items').insert({
      household_member_id: item.memberId,
      session_id: sessionId,
      task: item.task,
      priority: item.priority,
      due_date: item.dueDate || null,
      status: 'open',
      source: 'coach',
    });

    if (error) {
      console.error('Failed to create member action item:', error);
      return false;
    }

    if (householdData.householdId) {
      await fetchHouseholdData(householdData.householdId);
    }
    return true;
  };

  const handleDeleteActionItem = async (id: string) => {
    setHouseholdData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((a) => a.id !== id),
    }));

    const { error } = await supabase.from('member_action_items').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete member action item:', error);
    }
    if (householdData.householdId) {
      await fetchHouseholdData(householdData.householdId);
    }
  };

  // 7. Member notes handler (saves directly into member_notes table)
  const handleCreateMemberNote = async (note: {
    memberId: string;
    noteType: MemberNoteType;
    body: string;
  }): Promise<boolean> => {
    const isUuid = activeSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSession.id);
    const sessionId = isUuid ? activeSession.id : null;

    const { error } = await supabase.from('member_notes').insert({
      household_member_id: note.memberId,
      session_id: sessionId,
      note_type: note.noteType,
      body: note.body,
    });

    if (error) {
      console.error('Failed to create member note:', error);
      return false;
    }

    if (householdData.householdId) {
      await fetchHouseholdData(householdData.householdId);
    }
    return true;
  };

  // Open New Session modal (or Start Family Case if client has no household)
  const handleOpenNewSession = async () => {
    if (!activeClient) return;
    if (!activeClient.householdId) {
      setIsStartFamilyCaseOpen(true);
      return;
    }
    setIsNewSessionModalOpen(true);
    setNewSessionError(null);
    setLoadingClientBookings(true);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, appointment_date, appointment_time, parent_name, email, child_name, child_age, google_meet_url, status, notes')
        .eq('user_id', activeClient.clientId)
        .order('appointment_date', { ascending: false });
      setClientBookings(data || []);
    } catch (err: any) {
      console.error('Failed to load client bookings:', err);
    } finally {
      setLoadingClientBookings(false);
    }
  };

  const handleCreateBlankSession = async () => {
    if (!activeClient || !activeClient.householdId) return;
    setCreatingSession(true);
    setNewSessionError(null);
    try {
      const { data, error } = await supabase
        .from('case_sessions')
        .insert({
          household_id: activeClient.householdId,
          session_date: new Date().toISOString(),
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      if (householdData.members.length > 0) {
        await supabase.from('session_attendees').insert(
          householdData.members.map((m) => ({
            session_id: data.id,
            household_member_id: m.id,
          }))
        );
      }

      await loadRealClientSessions();
      setSelectedSessionId(data.id);
      setIsNewSessionModalOpen(false);
    } catch (err: any) {
      setNewSessionError(err.message || 'Failed to create session.');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCreateSessionFromBooking = async (booking: any) => {
    if (!activeClient || !activeClient.householdId) return;
    setCreatingSession(true);
    setNewSessionError(null);
    try {
      const { data, error } = await supabase
        .from('case_sessions')
        .insert({
          household_id: activeClient.householdId,
          booking_id: booking.id,
          session_date: new Date(`${booking.appointment_date}T00:00:00`).toISOString(),
          google_meet_url: booking.google_meet_url,
          status: booking.status === 'completed' ? 'completed' : 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      if (householdData.members.length > 0) {
        await supabase.from('session_attendees').insert(
          householdData.members.map((m) => ({
            session_id: data.id,
            household_member_id: m.id,
          }))
        );
      }

      await loadRealClientSessions();
      setSelectedSessionId(data.id);
      setIsNewSessionModalOpen(false);
    } catch (err: any) {
      setNewSessionError(err.message || 'Failed to create session from booking.');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleUpdateHousehold = async (updated: {
    presenting_issue?: string | null;
    working_plan?: string | null;
    next_step?: string | null;
    status?: HouseholdStatus;
  }): Promise<boolean> => {
    if (!householdData.householdId) return false;
    const { error } = await supabase
      .from('households')
      .update(updated)
      .eq('id', householdData.householdId);
    if (error) {
      console.error('Failed to update household:', error);
      return false;
    }
    await fetchHouseholdData(householdData.householdId);
    return true;
  };

  const handleAddMember = async (draft: {
    full_name: string;
    role: HouseholdMemberRole;
    birth_year?: number | null;
    notes?: string | null;
  }): Promise<boolean> => {
    if (!householdData.householdId) return false;
    const { error } = await supabase
      .from('household_members')
      .insert({
        household_id: householdData.householdId,
        full_name: draft.full_name,
        role: draft.role,
        birth_year: draft.birth_year ?? null,
        notes: draft.notes ?? null,
      });
    if (error) {
      console.error('Failed to add member:', error);
      return false;
    }
    await fetchHouseholdData(householdData.householdId);
    return true;
  };

  // Mapped sessions and fallback household for MemberStudyModal
  const mapStatusToCaseSession = (status: string): CaseSession['status'] => {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'scheduled';
  };

  const mappedCaseSessions: CaseSession[] = useMemo(() => {
    if (!activeClient) return [];
    return activeClient.sessions.map((s) => ({
      id: s.id,
      household_id: householdData.householdId || '',
      booking_id: null,
      session_date: s.sessionDate,
      duration_minutes: null,
      google_meet_url: null,
      status: mapStatusToCaseSession(s.status),
      drive_web_view_url: s.driveWebViewUrl,
      created_at: s.sessionDate,
      updated_at: s.sessionDate,
    }));
  }, [activeClient, householdData.householdId]);

  const effectiveHousehold: Household = useMemo(() => {
    return (
      householdData.household || {
        id: householdData.householdId || activeClient?.householdId || activeClient?.clientId || 'default',
        primary_contact_profile_id: activeClient?.clientId || '',
        family_name: activeClient?.clientName || 'Family',
        presenting_issue: null,
        working_plan: null,
        next_step: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }, [householdData.household, householdData.householdId, activeClient]);

  if (!activeClient || !activeSession) {
    return (
      <AdminLayout
        title="Session Notes"
        subtitle="Clinical notes and structured consultation records."
      >
        <div className="flex flex-col items-center justify-center py-20 text-warm-gray">
          <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
          <p className="text-sm font-medium">Loading connected client records...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      fillHeight
      title="Session Notes"
      subtitle="Structured clinical insights, action items, and family progress."
      action={
        <div className="flex items-center gap-2 flex-wrap shrink-0">
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
              <span>Error</span>
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
                    {c.clientName}
                    {c.isDemo ? ' (Demo)' : ''} {c.totalSessions > 0 ? `(${c.totalSessions})` : ''}
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

          {/* 2b. + New Session Button */}
          <button
            type="button"
            onClick={handleOpenNewSession}
            className="h-10 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-charcoal bg-[#faf8f4] hover:bg-white hover:text-sage-dark hover:border-sage/60 rounded-xl border border-beige/80 transition shadow-2xs shrink-0 cursor-pointer"
            title="Add a new session (blank or from past booking)"
          >
            <Plus className="w-3.5 h-3.5 text-sage-dark" />
            <span>New Session</span>
          </button>

          {/* 2c. Start Family Case Button (if no household linked yet) */}
          {!activeClient.householdId && (
            <button
              type="button"
              onClick={() => setIsStartFamilyCaseOpen(true)}
              className="h-10 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-sage-dark bg-sage/15 hover:bg-sage/25 rounded-xl border border-sage/40 transition shadow-2xs shrink-0 cursor-pointer"
              title="Start family case for this client"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Family Case</span>
            </button>
          )}

          {/* 3. Open Users CRM Dossier in place (no page navigation) */}
          <button
            type="button"
            onClick={() => void openClientDossier(activeClient)}
            className="h-10 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-charcoal bg-[#faf8f4] hover:bg-white hover:text-sage-dark hover:border-sage/60 rounded-xl border border-beige/80 transition shadow-2xs shrink-0 cursor-pointer"
            title="View Client in CRM"
          >
            <Users className="w-3.5 h-3.5 text-sage-dark" />
            <span>CRM Dossier</span>
          </button>
        </div>
      }
    >
      {/* Full-height page body: Left ~2/3 (Steps) + Right ~1/3 (Family at a glance) */}
      <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch lg:flex-1 lg:min-h-0">
          <div className="lg:col-span-8 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            <TranscriptViewer
              session={activeSession}
              activeStep={activeStep}
              onSelectStep={setActiveStep}
              household={householdData.household}
              householdMembers={householdData.members}
              openActionItems={householdData.actionItems.filter((a) => a.status === 'open')}
              householdMemberNotes={householdData.notes}
              previousSession={previousSession}
              sessionActionItems={householdData.actionItems.filter((a) => a.session_id === activeSession.id)}
              sessionMemberNotes={householdData.notes.filter((n) => n.session_id === activeSession.id)}
              onSavePrepNotes={handleSavePrepNotes}
              onSaveHandwrittenText={handleSaveHandwrittenText}
              onSaveInkPages={handleSaveInkPages}
              onSaveDriveLink={handleSaveDriveLink}
              onClearDriveLink={handleClearDriveLink}
              onSavePostNotes={handleSavePostNotes}
              onSaveTranscript={handleSaveTranscript}
              onToggleActionItem={handleToggleActionItem}
              onCreateActionItem={handleCreateActionItem}
              onDeleteActionItem={handleDeleteActionItem}
              onCreateMemberNote={handleCreateMemberNote}
            />
          </div>

          <div className="lg:col-span-4 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            <FamilyGlancePanel
              household={householdData.household}
              clientName={activeClient.clientName}
              members={householdData.members}
              openActionItems={householdData.actionItems.filter((a) => a.status === 'open')}
              currentSession={activeSession}
              sessions={activeClient.sessions}
              onSelectSession={handleSelectSession}
              onOpenMemberStudy={(member) => setSelectedStudyMember(member)}
              onToggleActionItem={handleToggleActionItem}
              onUpdateHousehold={handleUpdateHousehold}
              onAddMember={handleAddMember}
              onStartFamilyCase={() => setIsStartFamilyCaseOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Floating CRM Dossier Modal */}
      {showDossierModal && dossierClient ? (
        <ClientDossierModal
          client={dossierClient}
          onClose={() => setShowDossierModal(false)}
          onClientUpdated={(updated) => {
            setDossierClient((prev) => (prev ? { ...prev, ...updated } : null));
          }}
        />
      ) : null}

      {/* Floating Member Study Dossier Modal */}
      {selectedStudyMember && (
        <MemberStudyModal
          member={selectedStudyMember}
          household={effectiveHousehold}
          allHouseholdSessions={mappedCaseSessions}
          onClose={() => setSelectedStudyMember(null)}
          onMemberUpdated={(updated) => {
            setSelectedStudyMember(updated);
            setHouseholdData((prev) => ({
              ...prev,
              members: prev.members.map((m) => (m.id === updated.id ? updated : m)),
            }));
          }}
          onMemberDeleted={(deletedId) => {
            setSelectedStudyMember(null);
            setHouseholdData((prev) => ({
              ...prev,
              members: prev.members.filter((m) => m.id !== deletedId),
            }));
          }}
          onStudyGenerated={() => {}}
          onAttendanceChanged={() => {
            if (householdData.householdId) {
              void fetchHouseholdData(householdData.householdId);
            }
          }}
        />
      )}

      {/* Floating Start Family Case Modal */}
      {isStartFamilyCaseOpen && activeClient && (
        <StartFamilyCaseModal
          client={{
            id: activeClient.clientId,
            full_name: activeClient.clientName,
            email: activeClient.clientEmail,
          }}
          isOpen={isStartFamilyCaseOpen}
          onClose={() => setIsStartFamilyCaseOpen(false)}
          onSuccess={async (_hId, clientId) => {
            await loadRealClientSessions();
            setSelectedClientId(clientId);
          }}
        />
      )}

      {/* Floating New Session Modal */}
      {isNewSessionModalOpen && activeClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-beige/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-beige/70 bg-[#faf8f4] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-charcoal">
                    Add Session
                  </h3>
                  <p className="text-xs text-warm-gray">
                    {activeClient.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1.5 text-warm-gray hover:text-charcoal rounded-xl hover:bg-beige/40 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {newSessionError && (
                <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newSessionError}</span>
                </div>
              )}

              {/* Option 1: Blank Session Today */}
              <div className="p-4 rounded-2xl border border-beige/80 bg-[#faf8f4] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                      Blank Session (Today)
                    </h4>
                    <p className="text-xs text-warm-gray mt-0.5">
                      Create an immediate blank consultation slot dated today.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateBlankSession}
                    disabled={creatingSession}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-charcoal text-white hover:bg-charcoal/90 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {creatingSession ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-sage" />
                    )}
                    <span>Create Blank</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Unconverted Bookings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Or Convert from Booking Calendar
                  </h4>
                  <span className="text-[11px] text-warm-gray">
                    {(() => {
                      const usedBookingIds = new Set(activeClient.sessions.map((s) => s.bookingId).filter(Boolean));
                      const unconverted = clientBookings.filter((b) => !usedBookingIds.has(b.id));
                      return `${unconverted.length} available`;
                    })()}
                  </span>
                </div>

                {loadingClientBookings ? (
                  <div className="py-6 text-center text-xs text-warm-gray flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-dark" />
                    <span>Loading bookings...</span>
                  </div>
                ) : (() => {
                  const usedBookingIds = new Set(activeClient.sessions.map((s) => s.bookingId).filter(Boolean));
                  const unconverted = clientBookings.filter((b) => !usedBookingIds.has(b.id));

                  if (unconverted.length === 0) {
                    return (
                      <div className="p-4 rounded-xl border border-dashed border-beige bg-[#faf8f4] text-center text-xs text-warm-gray">
                        No unconverted bookings found for this client. All bookings are already linked to sessions.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {unconverted.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-beige/80 bg-white hover:border-sage transition shadow-2xs text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-charcoal">
                                {b.appointment_date} · {b.appointment_time}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cream border border-beige text-charcoal/70">
                                {b.status}
                              </span>
                            </div>
                            {b.child_name && (
                              <p className="text-[11px] text-warm-gray mt-0.5">
                                Child: {b.child_name} {b.child_age ? `(${b.child_age} yrs)` : ''}
                              </p>
                            )}
                            {b.notes && (
                              <p className="text-[11px] text-warm-gray/80 truncate mt-0.5">
                                Notes: {b.notes}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCreateSessionFromBooking(b)}
                            disabled={creatingSession}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sage/20 text-sage-dark hover:bg-sage/30 transition cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Session</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-beige/70 bg-[#faf8f4] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-beige bg-white text-charcoal hover:bg-beige/30 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSessions;
