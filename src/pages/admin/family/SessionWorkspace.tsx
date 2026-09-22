import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Check, Pencil, Upload, ImagePlus, Calendar, UserRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../AdminLayout';
import { Panel } from '../components/AdminUI';
import {
  CONTENT_TYPE_LABELS,
  type CaseSession,
  type Household,
  type HouseholdMember,
  type SessionContent,
  type SessionContentType,
} from '../../../types/family';

const SLOT_ORDER: SessionContentType[] = ['pre_session_recap', 'live_transcript', 'handwritten_notes', 'post_session_notes'];
const EDITABLE_SLOTS: SessionContentType[] = ['post_session_notes'];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const SessionWorkspace = (): JSX.Element => {
  const { householdId, sessionId } = useParams<{ householdId: string; sessionId: string }>();
  const navigate = useNavigate();

  const [household, setHousehold] = useState<Household | null>(null);
  const [session, setSession] = useState<CaseSession | null>(null);
  const [contentBySlot, setContentBySlot] = useState<Record<string, SessionContent | undefined>>({});
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [attendingIds, setAttendingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingSlot, setEditingSlot] = useState<SessionContentType | null>(null);
  const [draftText, setDraftText] = useState('');

  const [ocrBusy, setOcrBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async (): Promise<void> => {
    if (!householdId || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: h, error: hErr }, { data: s, error: sErr }, { data: c, error: cErr }, { data: m }, { data: attendees }] =
        await Promise.all([
          supabase.from('households').select('*').eq('id', householdId).single(),
          supabase.from('case_sessions').select('*').eq('id', sessionId).single(),
          supabase.from('session_content').select('*').eq('session_id', sessionId),
          supabase.from('household_members').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
          supabase.from('session_attendees').select('household_member_id').eq('session_id', sessionId),
        ]);
      if (hErr) throw hErr;
      if (sErr) throw sErr;
      if (cErr) throw cErr;
      setHousehold(h);
      setSession(s);
      setMembers(m ?? []);
      setAttendingIds((attendees ?? []).map((a) => a.household_member_id));
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
        {
          session_id: sessionId,
          content_type: contentType,
          content: text,
          ...(sourceMetadata ? { source_metadata: sourceMetadata } : {}),
        },
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

  const handleStartEdit = (slot: SessionContentType): void => {
    setEditingSlot(slot);
    setDraftText(contentBySlot[slot]?.content ?? '');
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingSlot) return;
    await upsertContent(editingSlot, draftText);
    setEditingSlot(null);
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

  return (
    <AdminLayout
      title={`${household.family_name} — Session`}
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {new Date(session.session_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => navigate(`/admin/families/${household.id}`)}
          className="inline-flex items-center gap-2 rounded-2xl border border-beige bg-white px-4 py-2.5 text-sm font-medium text-charcoal hover:border-sage transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {household.family_name}
        </button>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : null}

        {members.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-beige/80 bg-white px-4 py-3 shadow-2xs">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warm-gray">
              <UserRound className="h-3.5 w-3.5" /> Attendees:
            </span>
            {members.map((m) => {
              const attending = attendingIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    attending ? 'bg-sage text-white border-sage' : 'bg-[#faf8f4] text-warm-gray border-beige hover:border-sage/50'
                  }`}
                >
                  {m.full_name}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid lg:grid-cols-2 gap-6">
          {SLOT_ORDER.map((slot) => {
            const record = contentBySlot[slot];
            const isEditable = EDITABLE_SLOTS.includes(slot);
            const isEditing = editingSlot === slot;

            return (
              <Panel
                key={slot}
                title={CONTENT_TYPE_LABELS[slot]}
                action={
                  slot === 'handwritten_notes' ? (
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-beige px-3 py-1.5 text-xs font-medium text-charcoal hover:border-sage disabled:opacity-50"
                      >
                        {ocrBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                        {ocrBusy ? 'Transcribing...' : 'Upload Photo'}
                      </button>
                    </>
                  ) : isEditable ? (
                    isEditing ? (
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
                      >
                        <Check className="h-3.5 w-3.5" /> Save
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(slot)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-beige px-3 py-1.5 text-xs font-medium text-charcoal hover:border-sage"
                      >
                        <Pencil className="h-3.5 w-3.5" /> {record ? 'Edit' : 'Add'}
                      </button>
                    )
                  ) : undefined
                }
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:bg-white resize-none"
                  />
                ) : record?.content ? (
                  <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">{record.content}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Upload className="h-6 w-6 text-warm-gray/50 mb-2" />
                    <p className="text-xs text-warm-gray italic">
                      {slot === 'live_transcript'
                        ? 'Not yet ingested from the Meet transcription pipeline.'
                        : slot === 'pre_session_recap'
                        ? 'Not yet generated.'
                        : 'Nothing recorded yet.'}
                    </p>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SessionWorkspace;
