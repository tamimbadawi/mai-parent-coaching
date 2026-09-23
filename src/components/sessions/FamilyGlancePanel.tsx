import React, { useState, useMemo } from 'react';
import {
  Users,
  Video,
  VideoOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Flame,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  Calendar,
  ListTodo,
  Pencil,
  Plus,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type {
  Household,
  HouseholdMember,
  HouseholdMemberRole,
  HouseholdStatus,
  MemberActionItem,
} from '../../types/family';
import { roleLabel, currentAge } from '../../types/family';
import type { SessionTranscript } from '../../types/session';

interface FamilyGlancePanelProps {
  household: Household | null;
  clientName: string;
  members: HouseholdMember[];
  openActionItems: MemberActionItem[];
  currentSession: SessionTranscript;
  sessions: SessionTranscript[];
  onSelectSession: (sessionId: string) => void;
  onOpenMemberStudy: (member: HouseholdMember) => void;
  onToggleActionItem: (id: string, newStatus: 'open' | 'done') => Promise<void>;
  onUpdateHousehold?: (updated: {
    presenting_issue?: string | null;
    working_plan?: string | null;
    next_step?: string | null;
    status?: HouseholdStatus;
  }) => Promise<boolean>;
  onAddMember?: (draft: {
    full_name: string;
    role: HouseholdMemberRole;
    birth_year?: number | null;
    notes?: string | null;
  }) => Promise<boolean>;
  onStartFamilyCase?: () => void;
}

export const FamilyGlancePanel: React.FC<FamilyGlancePanelProps> = ({
  household,
  clientName,
  members,
  openActionItems,
  currentSession,
  sessions,
  onSelectSession,
  onOpenMemberStudy,
  onToggleActionItem,
  onUpdateHousehold,
  onAddMember,
  onStartFamilyCase,
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit Family state
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [familyDraft, setFamilyDraft] = useState<{
    presenting_issue: string;
    working_plan: string;
    next_step: string;
    status: HouseholdStatus;
  }>({
    presenting_issue: household?.presenting_issue || '',
    working_plan: household?.working_plan || '',
    next_step: household?.next_step || '',
    status: household?.status || 'active',
  });
  const [savingFamily, setSavingFamily] = useState(false);

  // Add Member state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberDraft, setNewMemberDraft] = useState<{
    full_name: string;
    role: HouseholdMemberRole;
    birth_year: string;
    notes: string;
  }>({
    full_name: '',
    role: 'child',
    birth_year: '',
    notes: '',
  });
  const [savingMember, setSavingMember] = useState(false);

  // Synchronize familyDraft when household changes
  React.useEffect(() => {
    if (household) {
      setFamilyDraft({
        presenting_issue: household.presenting_issue || '',
        working_plan: household.working_plan || '',
        next_step: household.next_step || '',
        status: household.status || 'active',
      });
    }
  }, [household]);

  // Find index in sessions list
  const currentIndex = useMemo(() => {
    return sessions.findIndex((s) => s.id === currentSession.id);
  }, [sessions, currentSession.id]);

  const prevSession = currentIndex > 0 ? sessions[currentIndex - 1] : null;
  const nextSession =
    currentIndex >= 0 && currentIndex < sessions.length - 1
      ? sessions[currentIndex + 1]
      : null;

  // Format date helper
  const formatDateSafe = (dateStr: string, formatPattern = 'MMM d, yyyy'): string => {
    try {
      const parsed = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      return isNaN(parsed.getTime()) ? dateStr : format(parsed, formatPattern);
    } catch {
      return dateStr;
    }
  };

  // Safe family name display: don't append "Family" if it already ends with it
  const displayFamilyName = useMemo(() => {
    if (!household?.family_name) return clientName;
    const trimmed = household.family_name.trim();
    return /family$/i.test(trimmed) ? trimmed : `${trimmed} Family`;
  }, [household?.family_name, clientName]);

  // Group open action items by member
  const groupedActionItems = useMemo(() => {
    const groups: {
      memberId: string | null;
      memberName: string;
      memberRole?: string;
      items: MemberActionItem[];
    }[] = [];

    // Map members first
    members.forEach((m) => {
      const items = openActionItems.filter((a) => a.household_member_id === m.id);
      if (items.length > 0) {
        groups.push({
          memberId: m.id,
          memberName: m.full_name,
          memberRole: roleLabel(m.role),
          items,
        });
      }
    });

    // Unassigned or unknown member items
    const unassigned = openActionItems.filter(
      (a) => !a.household_member_id || !members.some((m) => m.id === a.household_member_id)
    );
    if (unassigned.length > 0) {
      groups.push({
        memberId: null,
        memberName: 'General / Household',
        items: unassigned,
      });
    }

    return groups;
  }, [members, openActionItems]);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await onToggleActionItem(id, 'done');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateHousehold) return;
    setSavingFamily(true);
    try {
      await onUpdateHousehold({
        presenting_issue: familyDraft.presenting_issue.trim() || null,
        working_plan: familyDraft.working_plan.trim() || null,
        next_step: familyDraft.next_step.trim() || null,
        status: familyDraft.status,
      });
      setIsEditingFamily(false);
    } finally {
      setSavingFamily(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddMember || !newMemberDraft.full_name.trim()) return;
    setSavingMember(true);
    try {
      const birthYearNum = newMemberDraft.birth_year ? parseInt(newMemberDraft.birth_year, 10) : null;
      await onAddMember({
        full_name: newMemberDraft.full_name.trim(),
        role: newMemberDraft.role,
        birth_year: Number.isNaN(birthYearNum) ? null : birthYearNum,
        notes: newMemberDraft.notes.trim() || null,
      });
      setNewMemberDraft({ full_name: '', role: 'child', birth_year: '', notes: '' });
      setIsAddingMember(false);
    } finally {
      setSavingMember(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-beige/80 bg-[#faf8f4] overflow-hidden shadow-2xs">
      {/* Pinned Header */}
      <div className="border-b border-beige/70 bg-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-serif font-bold text-charcoal truncate leading-tight">
              Family at a Glance
            </h3>
            <p className="text-[11px] text-warm-gray truncate leading-tight mt-0.5">
              {displayFamilyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {household && onUpdateHousehold ? (
            <button
              type="button"
              onClick={() => setIsEditingFamily(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-charcoal/80 hover:text-sage-dark px-2 py-1 rounded-lg border border-beige/80 bg-[#faf8f4] hover:bg-white hover:border-sage transition cursor-pointer shadow-2xs"
              title="Edit family presenting focus, working plan, and status"
            >
              <Pencil className="w-3 h-3 text-sage-dark" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          ) : !household && onStartFamilyCase ? (
            <button
              type="button"
              onClick={onStartFamilyCase}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-dark bg-sage/15 hover:bg-sage/25 px-2.5 py-1 rounded-lg border border-sage/40 transition cursor-pointer shadow-2xs"
              title="Start family case for this client"
            >
              <Sparkles className="w-3 h-3" />
              <span>Start Case</span>
            </button>
          ) : null}

          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cream border border-beige text-charcoal/75">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {/* 1. Session Switcher (Previous / Next) */}
        <div className="rounded-xl border border-beige/80 bg-white p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal/70">
            <span className="uppercase tracking-wider text-[10px]">Session Switcher</span>
            <span className="font-mono text-charcoal/90">
              Session #{currentSession.sessionNumber} · {formatDateSafe(currentSession.sessionDate, 'MMM d')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Previous Session Button */}
            <button
              type="button"
              disabled={!prevSession}
              onClick={() => prevSession && onSelectSession(prevSession.id)}
              className={`flex flex-col items-start p-2 rounded-lg border text-left transition ${
                prevSession
                  ? 'border-beige hover:border-sage bg-[#faf8f4] hover:bg-white cursor-pointer shadow-2xs'
                  : 'border-beige/50 bg-[#faf8f4]/40 opacity-45 cursor-not-allowed'
              }`}
              title={prevSession ? `Go to Session #${prevSession.sessionNumber}` : 'First session'}
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold text-warm-gray mb-0.5">
                <ChevronLeft className="w-3 h-3 text-sage-dark shrink-0" />
                <span>Previous Session</span>
              </div>
              {prevSession ? (
                <>
                  <p className="text-xs font-bold text-charcoal truncate w-full">
                    {formatDateSafe(prevSession.sessionDate, 'MMM d, yyyy')}
                  </p>
                  <span className="mt-1 text-[9px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded bg-cream border border-beige text-charcoal/70">
                    {prevSession.status}
                  </span>
                </>
              ) : (
                <p className="text-[11px] text-warm-gray/70 italic mt-0.5">First session</p>
              )}
            </button>

            {/* Next Session Button */}
            <button
              type="button"
              disabled={!nextSession}
              onClick={() => nextSession && onSelectSession(nextSession.id)}
              className={`flex flex-col items-start p-2 rounded-lg border text-left transition ${
                nextSession
                  ? 'border-beige hover:border-sage bg-[#faf8f4] hover:bg-white cursor-pointer shadow-2xs'
                  : 'border-beige/50 bg-[#faf8f4]/40 opacity-45 cursor-not-allowed'
              }`}
              title={nextSession ? `Go to Session #${nextSession.sessionNumber}` : 'Latest session'}
            >
              <div className="flex items-center justify-between w-full text-[10px] font-semibold text-warm-gray mb-0.5">
                <span>Next Session</span>
                <ChevronRight className="w-3 h-3 text-sage-dark shrink-0" />
              </div>
              {nextSession ? (
                <>
                  <p className="text-xs font-bold text-charcoal truncate w-full">
                    {formatDateSafe(nextSession.sessionDate, 'MMM d, yyyy')}
                  </p>
                  <span className="mt-1 text-[9px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded bg-cream border border-beige text-charcoal/70">
                    {nextSession.status}
                  </span>
                </>
              ) : (
                <p className="text-[11px] text-warm-gray/70 italic mt-0.5">Latest session</p>
              )}
            </button>
          </div>
        </div>

        {/* 2. Session Recording Link */}
        <div className="rounded-xl border border-beige/80 bg-white p-3 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal/60">
            <Video className="w-3 h-3 text-sage-dark" />
            <span>Session Recording</span>
          </div>

          {currentSession.driveWebViewUrl ? (
            <a
              href={currentSession.driveWebViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-2.5 rounded-lg border border-sage/40 bg-sage/10 hover:bg-sage/20 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-white border border-sage/30 flex items-center justify-center text-sage-dark shrink-0">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-charcoal group-hover:text-sage-dark transition truncate">
                    Open in Google Drive
                  </p>
                  <p className="text-[10px] text-warm-gray truncate">
                    Cloud recording for Session #{currentSession.sessionNumber}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-sage-dark shrink-0 ml-1.5 group-hover:translate-x-0.5 transition" />
            </a>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-beige bg-[#faf8f4] text-warm-gray">
              <VideoOff className="w-3.5 h-3.5 text-warm-gray/60 shrink-0" />
              <p className="text-xs text-warm-gray font-medium">No recording linked</p>
            </div>
          )}
        </div>

        {/* 3. Family Members */}
        <div className="rounded-xl border border-beige/80 bg-white p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal/60">
              <UserRound className="w-3 h-3 text-sage-dark" />
              <span>Family Members</span>
            </div>

            {household && onAddMember ? (
              <button
                type="button"
                onClick={() => setIsAddingMember(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-dark hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Member</span>
              </button>
            ) : (
              <span className="text-[10px] text-warm-gray font-medium">Click to view study</span>
            )}
          </div>

          {members.length > 0 ? (
            <div className="space-y-1.5">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onOpenMemberStudy(member)}
                  className="w-full group flex items-center justify-between p-2.5 rounded-lg border border-beige/70 bg-[#faf8f4] hover:bg-white hover:border-sage transition text-left cursor-pointer shadow-2xs"
                  title={`View dossier & notes for ${member.full_name}`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-charcoal group-hover:text-sage-dark transition">
                        {member.full_name}
                      </span>
                      <span className="text-[11px] text-warm-gray font-medium">
                        ({roleLabel(member.role)}
                        {member.birth_year ? ` · Age ${currentAge(member.birth_year)}` : ''})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {member.concern_level && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          <Flame className="w-2.5 h-2.5 text-amber-700" />
                          {member.concern_level}
                        </span>
                      )}
                      {member.family_dynamic_role && (
                        <span className="text-[10px] text-warm-gray truncate">
                          {member.family_dynamic_role}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-warm-gray group-hover:text-sage-dark group-hover:translate-x-0.5 transition shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-beige bg-[#faf8f4] p-3 text-center">
              <UserRound className="w-4 h-4 text-warm-gray/40 mx-auto mb-1" />
              <p className="text-xs text-warm-gray font-medium">No family members recorded</p>
              {household && onAddMember && (
                <button
                  type="button"
                  onClick={() => setIsAddingMember(true)}
                  className="mt-2 text-xs font-semibold text-sage-dark hover:underline"
                >
                  + Add first member
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Open Tasks (member_action_items) */}
        <div className="rounded-xl border border-beige/80 bg-white p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal/60">
              <ListTodo className="w-3 h-3 text-sage-dark" />
              <span>Open Commitments</span>
            </div>
            {openActionItems.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {openActionItems.length} open
              </span>
            )}
          </div>

          {groupedActionItems.length > 0 ? (
            <div className="space-y-3">
              {groupedActionItems.map((group) => (
                <div key={group.memberId || 'unassigned'} className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-charcoal/80 border-b border-beige/60 pb-1">
                    <UserRound className="w-3 h-3 text-sage-dark" />
                    <span>{group.memberName}</span>
                    {group.memberRole && (
                      <span className="text-[10px] text-warm-gray font-normal">
                        ({group.memberRole})
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pl-1">
                    {group.items.map((item) => {
                      const isToggling = togglingId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 p-2 rounded-lg border border-beige/70 bg-[#faf8f4] hover:bg-white transition"
                        >
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggle(item.id)}
                            className="mt-0.5 text-warm-gray hover:text-emerald-700 transition cursor-pointer shrink-0 disabled:opacity-50"
                            title="Click to mark done"
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-dark" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-warm-gray hover:text-emerald-600" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-charcoal leading-snug">
                              {item.task}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.priority === 'high' && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1 py-0.2 text-[9px] font-semibold text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-2.5 h-2.5" /> High
                                </span>
                              )}
                              {item.due_date && (
                                <span className="inline-flex items-center gap-1 text-[9px] text-warm-gray font-mono">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDateSafe(item.due_date, 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-beige bg-[#faf8f4] p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600/70 mx-auto mb-1" />
              <p className="text-xs text-charcoal/80 font-medium">All commitments complete</p>
              <p className="text-[10px] text-warm-gray mt-0.5">No open action items pending.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Family Modal */}
      {isEditingFamily && household && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveFamily}
            className="bg-white rounded-2xl border border-beige/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-beige/70 bg-[#faf8f4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sage-dark" />
                <h4 className="font-serif font-bold text-sm text-charcoal">
                  Edit Family Profile
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingFamily(false)}
                className="p-1 text-warm-gray hover:text-charcoal rounded-lg hover:bg-beige/40 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                  Case Status
                </label>
                <select
                  value={familyDraft.status}
                  onChange={(e) =>
                    setFamilyDraft((d) => ({
                      ...d,
                      status: e.target.value as HouseholdStatus,
                    }))
                  }
                  className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium"
                >
                  <option value="active">Active Case</option>
                  <option value="paused">Paused / On Hold</option>
                  <option value="completed">Completed Case</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                  Presenting Clinical Issue
                </label>
                <textarea
                  rows={3}
                  value={familyDraft.presenting_issue}
                  onChange={(e) =>
                    setFamilyDraft((d) => ({ ...d, presenting_issue: e.target.value }))
                  }
                  placeholder="Primary challenge, behavioral concerns, family distress..."
                  className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                  Active Working Plan
                </label>
                <textarea
                  rows={3}
                  value={familyDraft.working_plan}
                  onChange={(e) =>
                    setFamilyDraft((d) => ({ ...d, working_plan: e.target.value }))
                  }
                  placeholder="Clinical intervention trajectory, co-regulation focus..."
                  className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                  Immediate Next Step
                </label>
                <input
                  type="text"
                  value={familyDraft.next_step}
                  onChange={(e) =>
                    setFamilyDraft((d) => ({ ...d, next_step: e.target.value }))
                  }
                  placeholder="Next consultation focus or behavioral homework..."
                  className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-beige/70 bg-[#faf8f4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingFamily(false)}
                className="px-3 py-1.5 rounded-xl border border-beige bg-white text-xs font-medium text-charcoal hover:bg-beige/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingFamily}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-charcoal text-xs font-semibold text-white hover:bg-charcoal/90 transition shadow-2xs disabled:opacity-50"
              >
                {savingFamily ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateMember}
            className="bg-white rounded-2xl border border-beige/80 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-beige/70 bg-[#faf8f4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-sage-dark" />
                <h4 className="font-serif font-bold text-sm text-charcoal">
                  Add Family Member
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="p-1 text-warm-gray hover:text-charcoal rounded-lg hover:bg-beige/40 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberDraft.full_name}
                  onChange={(e) =>
                    setNewMemberDraft((d) => ({ ...d, full_name: e.target.value }))
                  }
                  placeholder="e.g. Layla Al-Mansoor"
                  className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                    Family Role
                  </label>
                  <select
                    value={newMemberDraft.role}
                    onChange={(e) =>
                      setNewMemberDraft((d) => ({
                        ...d,
                        role: e.target.value as HouseholdMemberRole,
                      }))
                    }
                    className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium"
                  >
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="child">Child</option>
                    <option value="guardian">Guardian</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                    Birth Year (Optional)
                  </label>
                  <input
                    type="number"
                    min="1940"
                    max={new Date().getFullYear()}
                    value={newMemberDraft.birth_year}
                    onChange={(e) =>
                      setNewMemberDraft((d) => ({ ...d, birth_year: e.target.value }))
                    }
                    placeholder="e.g. 2018"
                    className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal uppercase tracking-wider text-[10px]">
                  Initial Notes / Observations
                </label>
                <textarea
                  rows={2}
                  value={newMemberDraft.notes}
                  onChange={(e) =>
                    setNewMemberDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="Behavioral traits, temperament, relationship focus..."
                  className="w-full p-2.5 rounded-xl bg-[#faf8f4] border border-beige/80 text-charcoal focus:outline-hidden focus:border-sage-dark font-medium"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-beige/70 bg-[#faf8f4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-3 py-1.5 rounded-xl border border-beige bg-white text-xs font-medium text-charcoal hover:bg-beige/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMember || !newMemberDraft.full_name.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-charcoal text-xs font-semibold text-white hover:bg-charcoal/90 transition shadow-2xs disabled:opacity-50"
              >
                {savingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
