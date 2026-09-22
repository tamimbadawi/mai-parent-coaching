import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  CheckSquare,
  Activity,
  MessageSquare,
  Search,
  CheckCircle2,
  Circle,
  AlertCircle,
  ShieldCheck,
  Zap,
  Heart,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Save,
} from 'lucide-react';
import type {
  SessionTranscript,
  ActionItem,
  TranscriptUtterance,
  ActionItemCategory,
  ActionItemPriority,
} from '../../types/session';

interface TranscriptViewerProps {
  session: SessionTranscript;
  onUpdateSession: (updatedSession: SessionTranscript) => void;
}

type TabKey = 'notes' | 'actions' | 'dynamics' | 'raw';

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  session,
  onUpdateSession,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('notes');
  const [rawSearchQuery, setRawSearchQuery] = useState('');

  // Tab 1: Clinical Summary editing states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [draftSummary, setDraftSummary] = useState(session.clinicalSummary);
  const [newInsightText, setNewInsightText] = useState('');
  const [showAddInsight, setShowAddInsight] = useState(false);

  // Tab 2: Action Plan states
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  const [newActionCategory, setNewActionCategory] = useState<ActionItemCategory>('parent');
  const [newActionPriority, setNewActionPriority] = useState<ActionItemPriority>('high');
  const [newActionNote, setNewActionNote] = useState('');
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingActionText, setEditingActionText] = useState('');

  // Tab 3: Dynamics states
  const [newTriggerText, setNewTriggerText] = useState('');
  const [newStrengthText, setNewStrengthText] = useState('');
  const [isEditingChildProfile, setIsEditingChildProfile] = useState(false);
  const [draftChildProfile, setDraftChildProfile] = useState(
    session.emotionalObservations.childDynamicsSummary || ''
  );

  // Tab 4: Raw Transcript states
  const [showAddUtterance, setShowAddUtterance] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState<'Mai (Coach)' | 'Parent'>('Mai (Coach)');
  const [newTimestamp, setNewTimestamp] = useState('');
  const [newUtteranceText, setNewUtteranceText] = useState('');
  const [editingUtteranceId, setEditingUtteranceId] = useState<string | null>(null);
  const [editingUtteranceText, setEditingUtteranceText] = useState('');

  // Sync draft when session changes
  React.useEffect(() => {
    setDraftSummary(session.clinicalSummary);
    setDraftChildProfile(session.emotionalObservations.childDynamicsSummary || '');
    setIsEditingSummary(false);
    setShowAddAction(false);
    setShowAddUtterance(false);
  }, [session.id]);

  /* ---------------------------------------------------- */
  /* TAB 1 HANDLERS: CLINICAL SUMMARY                     */
  /* ---------------------------------------------------- */
  const handleSaveSummary = () => {
    onUpdateSession({
      ...session,
      clinicalSummary: draftSummary,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingSummary(false);
  };

  const handleAddInsight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsightText.trim()) return;
    onUpdateSession({
      ...session,
      keyInsights: [...session.keyInsights, newInsightText.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewInsightText('');
    setShowAddInsight(false);
  };

  const handleDeleteInsight = (index: number) => {
    onUpdateSession({
      ...session,
      keyInsights: session.keyInsights.filter((_, idx) => idx !== index),
      updatedAt: new Date().toISOString(),
    });
  };

  /* ---------------------------------------------------- */
  /* TAB 2 HANDLERS: ACTION ITEMS                         */
  /* ---------------------------------------------------- */
  const handleToggleAction = (id: string) => {
    const updated = session.actionItems.map((a) =>
      a.id === id ? { ...a, completed: !a.completed } : a
    );
    onUpdateSession({ ...session, actionItems: updated, updatedAt: new Date().toISOString() });
  };

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim()) return;

    const newItem: ActionItem = {
      id: `act-${Date.now()}`,
      text: newActionText.trim(),
      category: newActionCategory,
      completed: false,
      priority: newActionPriority,
      contextNote: newActionNote.trim() || undefined,
    };

    onUpdateSession({
      ...session,
      actionItems: [...session.actionItems, newItem],
      updatedAt: new Date().toISOString(),
    });

    setNewActionText('');
    setNewActionNote('');
    setShowAddAction(false);
  };

  const handleDeleteAction = (id: string) => {
    onUpdateSession({
      ...session,
      actionItems: session.actionItems.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveActionText = (id: string) => {
    if (!editingActionText.trim()) return;
    onUpdateSession({
      ...session,
      actionItems: session.actionItems.map((a) =>
        a.id === id ? { ...a, text: editingActionText.trim() } : a
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingActionId(null);
  };

  /* ---------------------------------------------------- */
  /* TAB 3 HANDLERS: EMOTIONAL DYNAMICS                   */
  /* ---------------------------------------------------- */
  const handleUpdateStressLevel = (level: any) => {
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        parentalStressLevel: level,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateNervousSystem = (state: any) => {
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        nervousSystemState: state,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerText.trim()) return;
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        identifiedTriggers: [
          ...session.emotionalObservations.identifiedTriggers,
          newTriggerText.trim(),
        ],
      },
      updatedAt: new Date().toISOString(),
    });
    setNewTriggerText('');
  };

  const handleDeleteTrigger = (idx: number) => {
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        identifiedTriggers: session.emotionalObservations.identifiedTriggers.filter(
          (_, i) => i !== idx
        ),
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddStrength = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStrengthText.trim()) return;
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        strengthsNoted: [
          ...session.emotionalObservations.strengthsNoted,
          newStrengthText.trim(),
        ],
      },
      updatedAt: new Date().toISOString(),
    });
    setNewStrengthText('');
  };

  const handleDeleteStrength = (idx: number) => {
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        strengthsNoted: session.emotionalObservations.strengthsNoted.filter(
          (_, i) => i !== idx
        ),
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveChildProfile = () => {
    onUpdateSession({
      ...session,
      emotionalObservations: {
        ...session.emotionalObservations,
        childDynamicsSummary: draftChildProfile.trim(),
      },
      updatedAt: new Date().toISOString(),
    });
    setIsEditingChildProfile(false);
  };

  /* ---------------------------------------------------- */
  /* TAB 4 HANDLERS: RAW TRANSCRIPT                       */
  /* ---------------------------------------------------- */
  const handleAddUtterance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtteranceText.trim()) return;

    const newUtt: TranscriptUtterance = {
      id: `utt-${Date.now()}`,
      timestamp: newTimestamp.trim() || '00:00',
      speaker: newSpeaker,
      text: newUtteranceText.trim(),
    };

    onUpdateSession({
      ...session,
      rawTranscript: [...session.rawTranscript, newUtt],
      updatedAt: new Date().toISOString(),
    });

    setNewUtteranceText('');
    setNewTimestamp('');
    setShowAddUtterance(false);
  };

  const handleDeleteUtterance = (id: string) => {
    onUpdateSession({
      ...session,
      rawTranscript: session.rawTranscript.filter((u) => u.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveUtteranceText = (id: string) => {
    if (!editingUtteranceText.trim()) return;
    onUpdateSession({
      ...session,
      rawTranscript: session.rawTranscript.map((u) =>
        u.id === id ? { ...u, text: editingUtteranceText.trim() } : u
      ),
      updatedAt: new Date().toISOString(),
    });
    setEditingUtteranceId(null);
  };

  // Filter raw transcript by search
  const filteredTranscript = useMemo(() => {
    if (!rawSearchQuery.trim()) return session.rawTranscript;
    const q = rawSearchQuery.toLowerCase();
    return session.rawTranscript.filter(
      (u) =>
        u.text.toLowerCase().includes(q) ||
        u.speaker.toLowerCase().includes(q) ||
        u.timestamp.includes(q)
    );
  }, [session.rawTranscript, rawSearchQuery]);

  const parentActions = session.actionItems.filter((a) => a.category === 'parent');
  const coachActions = session.actionItems.filter((a) => a.category === 'coach');

  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-beige/80 shadow-xs flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      {/* Navigation Tabs Header - Zero horizontal scroll */}
      <div className="border-b border-beige/70 bg-[#faf8f4]/60 px-2.5 pt-2 flex items-center justify-between gap-1 overflow-hidden select-none shrink-0">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'notes'
                ? 'bg-white text-charcoal border-sage-dark shadow-2xs'
                : 'text-charcoal/60 hover:text-charcoal border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-sage-dark shrink-0" />
            <span>Clinical Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'actions'
                ? 'bg-white text-charcoal border-sage-dark shadow-2xs'
                : 'text-charcoal/60 hover:text-charcoal border-transparent'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-sage-dark shrink-0" />
            <span>Action Plan</span>
            <span className="px-1 py-0.2 rounded-full text-[10px] bg-beige/60 text-charcoal/80 font-mono">
              {session.actionItems.filter((a) => a.completed).length}/{session.actionItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dynamics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'dynamics'
                ? 'bg-white text-charcoal border-sage-dark shadow-2xs'
                : 'text-charcoal/60 hover:text-charcoal border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sage-dark shrink-0" />
            <span>Dynamics</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'raw'
                ? 'bg-white text-charcoal border-sage-dark shadow-2xs'
                : 'text-charcoal/60 hover:text-charcoal border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sage-dark shrink-0" />
            <span>Transcript</span>
            <span className="px-1 py-0.2 rounded-full text-[10px] bg-beige/60 text-charcoal/80 font-mono">
              {session.rawTranscript.length}
            </span>
          </button>
        </div>

        {/* Action button for active tab */}
        <div className="flex items-center gap-1.5 pb-1 shrink-0">
          {activeTab === 'notes' && (
            <button
              onClick={() => {
                if (isEditingSummary) handleSaveSummary();
                else setIsEditingSummary(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-ivory border border-beige/80 text-charcoal/80 hover:text-charcoal hover:bg-white transition-colors"
            >
              {isEditingSummary ? (
                <>
                  <Save className="w-3 h-3 text-emerald-600" />
                  <span>Save</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 text-sage-dark" />
                  <span>Edit</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'actions' && (
            <button
              onClick={() => setShowAddAction(!showAddAction)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-sage/20 border border-sage/40 text-sage-dark hover:bg-sage/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Item</span>
            </button>
          )}

          {activeTab === 'raw' && (
            <button
              onClick={() => setShowAddUtterance(!showAddUtterance)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-sage/20 border border-sage/40 text-sage-dark hover:bg-sage/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Line</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="p-3.5 sm:p-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 text-charcoal space-y-4">
        {/* ==================================================== */}
        {/* TAB 1: CLINICAL SUMMARY                              */}
        {/* ==================================================== */}
        {activeTab === 'notes' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Key Takeaway Highlights */}
            <div className="bg-sage/10 rounded-xl p-4 border border-sage/30">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 text-sage-dark font-medium text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Key Clinical Insights</span>
                </div>
                <button
                  onClick={() => setShowAddInsight(!showAddInsight)}
                  className="text-[11px] font-medium text-sage-dark hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Insight</span>
                </button>
              </div>

              {/* Add Insight Inline Form */}
              {showAddInsight && (
                <form onSubmit={handleAddInsight} className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newInsightText}
                    onChange={(e) => setNewInsightText(e.target.value)}
                    placeholder="Type new clinical takeaway..."
                    autoFocus
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-white border border-sage/40 focus:outline-hidden focus:border-sage-dark"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sage-dark text-white hover:bg-sage-dark/90 shrink-0"
                  >
                    Add
                  </button>
                </form>
              )}

              <ul className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm text-charcoal/85">
                {session.keyInsights.map((insight, idx) => (
                  <li
                    key={idx}
                    className="group flex items-start justify-between gap-2 bg-white/60 p-2 rounded-lg border border-sage/20"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage-dark mt-1.5 shrink-0" />
                      <span>{insight}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteInsight(idx)}
                      className="text-charcoal/30 hover:text-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete insight"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Markdown Body or Edit Textarea */}
            {isEditingSummary ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal/70 uppercase tracking-wider">
                    Edit Markdown Clinical Notes
                  </span>
                  <button
                    onClick={handleSaveSummary}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
                <textarea
                  value={draftSummary}
                  onChange={(e) => setDraftSummary(e.target.value)}
                  rows={14}
                  className="w-full p-4 rounded-xl text-xs sm:text-sm font-mono leading-relaxed bg-[#faf8f4] border border-beige/90 focus:outline-hidden focus:border-sage-dark"
                />
              </div>
            ) : (
              <div className="prose prose-stone max-w-none text-charcoal/90 text-xs sm:text-sm leading-relaxed space-y-3">
                <ReactMarkdown
                  components={{
                    h3: ({ node, ...props }) => (
                      <h3
                        className="font-serif text-base sm:text-lg font-semibold text-charcoal mt-4 mb-2 border-b border-beige/60 pb-1"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="leading-relaxed text-charcoal/85 mb-2.5" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-4 space-y-1 text-charcoal/85 my-2" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-4 space-y-1 text-charcoal/85 my-2" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-charcoal/85" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-charcoal" {...props} />
                    ),
                  }}
                >
                  {session.clinicalSummary}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: ACTION PLAN                                   */}
        {/* ==================================================== */}
        {activeTab === 'actions' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Inline Add Action Form */}
            {showAddAction && (
              <form
                onSubmit={handleCreateAction}
                className="bg-[#faf8f4] rounded-xl p-4 border border-sage/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                    Add New Action Item
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddAction(false)}
                    className="text-charcoal/50 hover:text-charcoal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  placeholder="Action description (e.g., Practice the 3-second somatic pause...)"
                  autoFocus
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                />

                <input
                  type="text"
                  value={newActionNote}
                  onChange={(e) => setNewActionNote(e.target.value)}
                  placeholder="Optional context note or instructions..."
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                />

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-charcoal/60 font-medium">Assignee:</span>
                    <button
                      type="button"
                      onClick={() => setNewActionCategory('parent')}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                        newActionCategory === 'parent'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-white text-charcoal/60 border-beige/80'
                      }`}
                    >
                      Parent
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewActionCategory('coach')}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium border ${
                        newActionCategory === 'coach'
                          ? 'bg-sage/20 text-sage-dark border-sage/40'
                          : 'bg-white text-charcoal/60 border-beige/80'
                      }`}
                    >
                      Coach (Mai)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-charcoal/60 font-medium">Priority:</span>
                    {(['high', 'medium', 'low'] as ActionItemPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewActionPriority(p)}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium capitalize border ${
                          newActionPriority === p
                            ? 'bg-charcoal text-white border-charcoal'
                            : 'bg-white text-charcoal/60 border-beige/80'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="submit"
                      className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-charcoal text-white hover:bg-charcoal/90"
                    >
                      Save Item
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Parent Action Items */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Parent Homework & Somatic Practices
                </h3>
                <span className="text-[11px] text-charcoal/50">
                  {parentActions.filter((a) => a.completed).length} of {parentActions.length} completed
                </span>
              </div>

              <div className="space-y-2">
                {parentActions.map((action) => (
                  <div
                    key={action.id}
                    className={`group p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      action.completed
                        ? 'bg-[#faf8f4]/60 border-beige/60 opacity-80'
                        : 'bg-white border-beige/80 hover:border-sage-dark/60 shadow-2xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleAction(action.id)}
                      className="mt-0.5 text-sage-dark shrink-0 focus:outline-hidden"
                    >
                      {action.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-4 h-4 text-charcoal/35" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingActionId === action.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingActionText}
                            onChange={(e) => setEditingActionText(e.target.value)}
                            autoFocus
                            className="flex-1 text-xs px-2 py-1 rounded-md border border-sage-dark bg-white"
                          />
                          <button
                            onClick={() => handleSaveActionText(action.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p
                          onClick={() => {
                            setEditingActionId(action.id);
                            setEditingActionText(action.text);
                          }}
                          className={`text-xs sm:text-sm font-medium cursor-text hover:text-sage-dark transition-colors ${
                            action.completed ? 'line-through text-charcoal/50' : 'text-charcoal'
                          }`}
                        >
                          {action.text}
                        </p>
                      )}

                      {action.contextNote && (
                        <p className="text-[11px] text-charcoal/60 mt-0.5">
                          {action.contextNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {action.priority === 'high' && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-semibold bg-rose-100/80 text-rose-800">
                          Priority
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="text-charcoal/30 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete action item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coach Actions */}
            {coachActions.length > 0 && (
              <div className="pt-3 border-t border-beige/70">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sage-dark" />
                    Mai's Follow-ups & Dispatches
                  </h3>
                  <span className="text-[11px] text-charcoal/50">
                    {coachActions.filter((a) => a.completed).length} of {coachActions.length} sent
                  </span>
                </div>

                <div className="space-y-2">
                  {coachActions.map((action) => (
                    <div
                      key={action.id}
                      className={`group p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        action.completed
                          ? 'bg-[#faf8f4]/60 border-beige/60 opacity-80'
                          : 'bg-white border-beige/80 hover:border-sage-dark/60 shadow-2xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleAction(action.id)}
                        className="mt-0.5 text-sage-dark shrink-0 focus:outline-hidden"
                      >
                        {action.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-4 h-4 text-charcoal/35" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        {editingActionId === action.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingActionText}
                              onChange={(e) => setEditingActionText(e.target.value)}
                              autoFocus
                              className="flex-1 text-xs px-2 py-1 rounded-md border border-sage-dark bg-white"
                            />
                            <button
                              onClick={() => handleSaveActionText(action.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            onClick={() => {
                              setEditingActionId(action.id);
                              setEditingActionText(action.text);
                            }}
                            className={`text-xs sm:text-sm font-medium cursor-text hover:text-sage-dark transition-colors ${
                              action.completed ? 'line-through text-charcoal/50' : 'text-charcoal'
                            }`}
                          >
                            {action.text}
                          </p>
                        )}
                        {action.contextNote && (
                          <p className="text-[11px] text-charcoal/60 mt-0.5">
                            {action.contextNote}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="text-charcoal/30 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete action item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: EMOTIONAL DYNAMICS                            */}
        {/* ==================================================== */}
        {activeTab === 'dynamics' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Stress & Nervous System Dropdowns */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-ivory rounded-xl p-3.5 border border-beige/80">
                <span className="text-[10px] uppercase tracking-wider text-charcoal/60 font-semibold block mb-1">
                  Parental Stress Presentation
                </span>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-600 shrink-0" />
                  <select
                    value={session.emotionalObservations.parentalStressLevel}
                    onChange={(e) => handleUpdateStressLevel(e.target.value)}
                    className="font-serif text-sm font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer capitalize"
                  >
                    <option value="low">Low Stress</option>
                    <option value="moderate">Moderate Stress</option>
                    <option value="elevated">Elevated Stress</option>
                    <option value="acute">Acute Overwhelm</option>
                  </select>
                </div>
              </div>

              <div className="bg-ivory rounded-xl p-3.5 border border-beige/80">
                <span className="text-[10px] uppercase tracking-wider text-charcoal/60 font-semibold block mb-1">
                  Autonomic Nervous System State
                </span>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                  <select
                    value={session.emotionalObservations.nervousSystemState}
                    onChange={(e) => handleUpdateNervousSystem(e.target.value)}
                    className="font-serif text-sm font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer capitalize"
                  >
                    <option value="regulated_ventral">Regulated Ventral</option>
                    <option value="sympathetic_fight_or_flight">Sympathetic (Fight/Flight)</option>
                    <option value="dorsal_vagal_shutdown">Dorsal Vagal Shutdown</option>
                    <option value="fluctuating">Fluctuating Cadence</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Identified Triggers with Add Pill */}
            <div className="bg-white rounded-xl p-3.5 border border-beige/80">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  Behavioral Triggers Identified
                </h4>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {session.emotionalObservations.identifiedTriggers.map((trig, idx) => (
                  <span
                    key={idx}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200"
                  >
                    <span>{trig}</span>
                    <button
                      onClick={() => handleDeleteTrigger(idx)}
                      className="text-rose-500/50 hover:text-rose-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add trigger form */}
              <form onSubmit={handleAddTrigger} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTriggerText}
                  onChange={(e) => setNewTriggerText(e.target.value)}
                  placeholder="+ Add new trigger and press Enter..."
                  className="flex-1 text-xs px-2.5 py-1 rounded-lg bg-ivory border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 shrink-0"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Observed Strengths with Add Pill */}
            <div className="bg-white rounded-xl p-3.5 border border-beige/80">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Parental Strengths & Protective Factors
                </h4>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {session.emotionalObservations.strengthsNoted.map((str, idx) => (
                  <span
                    key={idx}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <span>{str}</span>
                    <button
                      onClick={() => handleDeleteStrength(idx)}
                      className="text-emerald-600/50 hover:text-emerald-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add strength form */}
              <form onSubmit={handleAddStrength} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStrengthText}
                  onChange={(e) => setNewStrengthText(e.target.value)}
                  placeholder="+ Add new strength and press Enter..."
                  className="flex-1 text-xs px-2.5 py-1 rounded-lg bg-ivory border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shrink-0"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Child Dynamics Summary (Editable) */}
            <div className="bg-[#faf8f4] rounded-xl p-3.5 border border-beige/80">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold text-charcoal">
                  Child Neurological & Sensory Profile
                </h4>
                <button
                  onClick={() => {
                    if (isEditingChildProfile) handleSaveChildProfile();
                    else setIsEditingChildProfile(true);
                  }}
                  className="text-[11px] text-sage-dark font-medium hover:underline flex items-center gap-1"
                >
                  {isEditingChildProfile ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              </div>

              {isEditingChildProfile ? (
                <textarea
                  value={draftChildProfile}
                  onChange={(e) => setDraftChildProfile(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full text-xs p-2 rounded-lg bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark leading-relaxed"
                />
              ) : (
                <p className="text-xs text-charcoal/80 leading-relaxed">
                  {session.emotionalObservations.childDynamicsSummary || 'No profile notes recorded yet.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: RAW TRANSCRIPT                                */}
        {/* ==================================================== */}
        {activeTab === 'raw' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-charcoal/40 absolute left-3 top-2.5" />
              <input
                type="text"
                value={rawSearchQuery}
                onChange={(e) => setRawSearchQuery(e.target.value)}
                placeholder="Search raw dialogue by keyword, speaker, or timestamp..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-ivory border border-beige/80 focus:outline-hidden focus:border-sage-dark transition-colors"
              />
            </div>

            {/* Inline Add Utterance Form */}
            {showAddUtterance && (
              <form
                onSubmit={handleAddUtterance}
                className="p-3 bg-[#faf8f4] border border-sage/40 rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal">
                    Add New Dialogue Line
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddUtterance(false)}
                    className="text-charcoal/50 hover:text-charcoal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value as any)}
                    className="text-xs px-2 py-1 rounded-md border border-beige/80 bg-white"
                  >
                    <option value="Mai (Coach)">Mai (Coach)</option>
                    <option value="Parent">Parent</option>
                  </select>
                  <input
                    type="text"
                    value={newTimestamp}
                    onChange={(e) => setNewTimestamp(e.target.value)}
                    placeholder="Timestamp (e.g. 12:30)"
                    className="text-xs px-2 py-1 rounded-md border border-beige/80 bg-white w-36"
                  />
                </div>

                <textarea
                  value={newUtteranceText}
                  onChange={(e) => setNewUtteranceText(e.target.value)}
                  placeholder="Utterance text..."
                  rows={2}
                  className="w-full text-xs p-2 rounded-md border border-beige/80 bg-white focus:outline-hidden focus:border-sage-dark"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-charcoal text-white hover:bg-charcoal/90"
                  >
                    Add Entry
                  </button>
                </div>
              </form>
            )}

            {/* Utterances List */}
            <div className="space-y-2.5">
              {filteredTranscript.length === 0 ? (
                <p className="text-xs text-charcoal/50 text-center py-6">
                  No dialogue matched "{rawSearchQuery}".
                </p>
              ) : (
                filteredTranscript.map((utt) => {
                  const isCoach = utt.speaker.includes('Mai');
                  const isEditingThis = editingUtteranceId === utt.id;

                  return (
                    <div
                      key={utt.id}
                      className={`group p-3 rounded-xl border transition-all ${
                        isCoach ? 'bg-sage/10 border-sage/30' : 'bg-white border-beige/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCoach ? 'bg-sage-dark' : 'bg-terracotta'
                            }`}
                          />
                          <span className="text-xs font-semibold text-charcoal">
                            {utt.speaker}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-charcoal/50 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {utt.timestamp}
                          </span>

                          <button
                            onClick={() => {
                              if (isEditingThis) handleSaveUtteranceText(utt.id);
                              else {
                                setEditingUtteranceId(utt.id);
                                setEditingUtteranceText(utt.text);
                              }
                            }}
                            className="text-charcoal/40 hover:text-charcoal opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="Edit utterance"
                          >
                            {isEditingThis ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Edit3 className="w-3 h-3" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUtterance(utt.id)}
                            className="text-charcoal/30 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="Delete dialogue line"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {isEditingThis ? (
                        <textarea
                          value={editingUtteranceText}
                          onChange={(e) => setEditingUtteranceText(e.target.value)}
                          rows={2}
                          autoFocus
                          className="w-full text-xs p-2 rounded-md bg-white border border-sage-dark focus:outline-hidden"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm text-charcoal/85 leading-relaxed pl-4">
                          {utt.text}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
