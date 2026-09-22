import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  Check,
  Pencil,
  ImagePlus,
  Calendar,
  Clock,
  UserRound,
  Users,
  FileText,
  MessageSquare,
  Camera,
  Search,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../AdminLayout';
import {
  CONTENT_TYPE_LABELS,
  type CaseSession,
  type Household,
  type HouseholdMember,
  type SessionContent,
  type SessionContentType,
} from '../../../types/family';
import { SessionChatPanel } from './SessionChatPanel';

type TabKey = SessionContentType;
const EDITABLE_SLOTS: SessionContentType[] = ['post_session_notes'];

const TAB_CONFIG: { key: TabKey; icon: typeof FileText }[] = [
  { key: 'pre_session_recap', icon: FileText },
  { key: 'live_transcript', icon: MessageSquare },
  { key: 'handwritten_notes', icon: Camera },
  { key: 'post_session_notes', icon: Pencil },
];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const SessionWorkspace = (): JSX.Element => {
  const { householdId, sessionId } = useParams<{ householdId: string; sessionId: string }>();
  const navigate = useNavigate();

  const [household, setHousehold] = useState<Household | null>(null);
  const [session, setSession] = useState<CaseSession | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<{ id: string; family_name: string }[]>([]);
  const [allSessions, setAllSessions] = useState<CaseSession[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [attendingIds, setAttendingIds] = useState<string[]>([]);
  const [contentBySlot, setContentBySlot] = useState<Record<string, SessionContent | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('post_session_notes');
  const [editingSlot, setEditingSlot] = useState<TabKey | null>(null);
  const [draftText, setDraftText] = useState('');
  const [transcriptSearch, setTranscriptSearch] = useState('');

  const [ocrBusy, setOcrBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async (): Promise<void> => {
    if (!householdId || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: h, error: hErr }, { data: s, error: sErr }, { data: c, error: cErr }, { data: m }, { data: attendees }, { data: households }, { data: sessions }] =
        await Promise.all([
          supabase.from('households').select('*').eq('id', householdId).single(),
          supabase.from('case_sessions').select('*').eq('id', sessionId).single(),
          supabase.from('session_content').select('*').eq('session_id', sessionId),
          supabase.from('household_members').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
          supabase.from('session_attendees').select('household_member_id').eq('session_id', sessionId),
          supabase.from('households').select('id, family_name').order('family_name', { ascending: true }),
          supabase.from('case_sessions').select('*').eq('household_id', householdId).order('session_date', { ascending: false }),
        ]);
      if (hErr) throw hErr;
      if (sErr) throw sErr;
      if (cErr) throw cErr;
      setHousehold(h);
      setSession(s);
      setMembers(m ?? []);
      setAttendingIds((attendees ?? []).map((a) => a.household_member_id));
      setAllHouseholds(households ?? []);
      setAllSessions(sessions ?? []);
      const map: Record<string, SessionContent> = {};
      for (const row of c ?? []) map[row.content_type] = row;
      setContentBySlot(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, sessionId]);

  const upsertContent = async (contentType: SessionContentType, text: string, sourceMetadata?: Record<string, unknown>): Promise<void> => {
    if (!sessionId) return;
    const { data, error: upsertErr } = await supabase
      .from('session_content')
      .upsert(
        { session_id: sessionId, content_type: contentType, content: text, ...(sourceMetadata ? { source_metadata: sourceMetadata } : {}) },
        { onConflict: 'session_id,content_type' }
      )
      .select()
      .single();
    if (upsertErr) {
      setError(upsertErr.message);
      return;
    }
    setContentBySlot((prev) => ({ ...prev, [contentType]: data }));
  };

  const handleUploadHandwriting = async (file: File): Promise<void> => {
    setOcrBusy(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const { data, error: invokeErr } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt:
            'Transcribe this handwritten note into clean plain text. Preserve the original meaning and structure (bullet points, line breaks) as closely as possible. Output only the transcribed text, nothing else.',
          imageBase64: base64,
          imageMimeType: file.type || 'image/jpeg',
        },
      });
      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);
      const existing = contentBySlot.handwritten_notes?.content;
      const merged = existing ? `${existing}\n\n---\n\n${data.text}` : data.text;
      await upsertContent('handwritten_notes', merged, { last_upload_filename: file.name, transcribed_at: new Date().toISOString() });
    } catch (err: any) {
      setError(err.message || 'Handwriting transcription failed.');
    } finally {
      setOcrBusy(false);
    }
  };

  const toggleAttendee = async (memberId: string): Promise<void> => {
    if (!sessionId) return;
    const attending = attendingIds.includes(memberId);
    if (attending) {
      await supabase.from('session_attendees').delete().eq('session_id', sessionId).eq('household_member_id', memberId);
      setAttendingIds((prev) => prev.filter((id) => id !== memberId));
    } else {
      await supabase.from('session_attendees').insert({ session_id: sessionId, household_member_id: memberId });
      setAttendingIds((prev) => [...prev, memberId]);
    }
  };

  const handleSelectHousehold = async (newHouseholdId: string): Promise<void> => {
    const { data: firstSession } = await supabase
      .from('case_sessions')
      .select('id')
      .eq('household_id', newHouseholdId)
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (firstSession) navigate(`/admin/families/${newHouseholdId}/sessions/${firstSession.id}`);
    else navigate(`/admin/families/${newHouseholdId}`);
  };

  const filteredTranscript = useMemo(() => {
    const text = contentBySlot.live_transcript?.content ?? '';
    if (!transcriptSearch.trim()) return text;
    return text
      .split('\n')
      .filter((line) => line.toLowerCase().includes(transcriptSearch.toLowerCase()))
      .join('\n');
  }, [contentBySlot, transcriptSearch]);

  if (loading) {
    return (
      <AdminLayout title="Session" subtitle="Loading...">
        <div className="flex flex-col items-center justify-center py-16 text-warm-gray">
          <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
        </div>
      </AdminLayout>
    );
  }

  if (!session || !household) {
    return (
      <AdminLayout title="Session" subtitle="Not found">
        <p className="text-sm text-warm-gray">This session could not be found.</p>
      </AdminLayout>
    );
  }

  const activeRecord = contentBySlot[activeTab];
  const isEditable = EDITABLE_SLOTS.includes(activeTab);
  const isEditing = editingSlot === activeTab;

  return (
    <AdminLayout
      title="Session Notes"
      subtitle="Structured session content and conversational consultation."
      action={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#faf8f4] px-2.5 py-1.5 rounded-xl border border-beige/80">
            <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">Client</span>
              <select
                value={household.id}
                onChange={(e) => void handleSelectHousehold(e.target.value)}
                className="font-serif text-xs sm:text-sm font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer py-0.5 pl-0 pr-4"
              >
                {allHouseholds.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.family_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#faf8f4] px-2.5 py-1.5 rounded-xl border border-beige/80">
            <div className="w-7 h-7 rounded-lg bg-charcoal/10 border border-charcoal/20 flex items-center justify-center text-charcoal shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">Session</span>
              <select
                value={session.id}
                onChange={(e) => navigate(`/admin/families/${household.id}/sessions/${e.target.value}`)}
                className="text-xs sm:text-sm font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer py-0.5 pl-0 pr-4"
              >
                {allSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (
                    {s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 rounded-2xl border border-beige/80 shadow-xs px-4 py-3">
          <div className="flex items-center gap-4 text-xs text-charcoal/70 flex-wrap">
            <span className="font-serif text-lg text-charcoal">{household.family_name}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-charcoal/50" />
              {session.duration_minutes ?? 50} minutes
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase ${
                session.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-sky-50 text-sky-700 border border-sky-200'
              }`}
            >
              {session.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-warm-gray" />
            {members.map((m) => {
              const attending = attendingIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition ${
                    attending ? 'bg-sage text-white border-sage' : 'bg-[#faf8f4] text-warm-gray border-beige hover:border-sage/50'
                  }`}
                >
                  {m.full_name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 h-[calc(100vh-260px)] min-h-[560px]">
          <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-beige/80 shadow-xs flex flex-col min-h-0 overflow-hidden">
            <div className="border-b border-beige/70 bg-[#faf8f4]/60 px-2.5 pt-2 flex items-center justify-between gap-1 overflow-hidden shrink-0">
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                {TAB_CONFIG.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
                      activeTab === key
                        ? 'bg-white text-charcoal border-sage-dark shadow-2xs'
                        : 'text-charcoal/60 hover:text-charcoal border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-sage-dark shrink-0" />
                    <span>{CONTENT_TYPE_LABELS[key]}</span>
                  </button>
                ))}
              </div>
              <div className="pr-1.5 shrink-0">
                {activeTab === 'handwritten_notes' ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadHandwriting(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={ocrBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-beige px-2.5 py-1 text-[11px] font-medium text-charcoal hover:border-sage disabled:opacity-50 bg-white"
                    >
                      {ocrBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                      {ocrBusy ? 'Transcribing...' : 'Upload Photo'}
                    </button>
                  </>
                ) : isEditable ? (
                  isEditing ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await upsertContent(activeTab, draftText);
                        setEditingSlot(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-2.5 py-1 text-[11px] font-medium text-white hover:bg-sage-dark"
                    >
                      <Check className="h-3 w-3" /> Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlot(activeTab);
                        setDraftText(contentBySlot[activeTab]?.content ?? '');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-beige px-2.5 py-1 text-[11px] font-medium text-charcoal hover:border-sage bg-white"
                    >
                      <Pencil className="h-3 w-3" /> {activeRecord ? 'Edit' : 'Add'}
                    </button>
                  )
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'live_transcript' && contentBySlot.live_transcript?.content ? (
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-gray" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript..."
                    className="w-full rounded-lg border border-beige bg-[#faf8f4] pl-9 pr-3 py-1.5 text-xs outline-none focus:border-sage"
                  />
                </div>
              ) : null}

              {isEditing ? (
                <textarea
                  autoFocus
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={16}
                  className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:bg-white resize-none"
                />
              ) : activeTab === 'live_transcript' && filteredTranscript ? (
                <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap font-mono text-[13px]">{filteredTranscript}</p>
              ) : activeRecord?.content ? (
                <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{activeRecord.content}</p>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-xs text-warm-gray italic">
                    {activeTab === 'live_transcript'
                      ? 'Not yet ingested from the Meet transcription pipeline.'
                      : activeTab === 'pre_session_recap'
                      ? 'Not yet generated.'
                      : 'Nothing recorded yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <SessionChatPanel householdId={household.id} sessionId={session.id} familyName={household.family_name} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default SessionWorkspace;
