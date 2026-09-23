import React from 'react';
import { SessionWorkflowTabs, type WorkflowStep } from './SessionWorkflowTabs';
import { SessionBeforeStep } from './SessionBeforeStep';
import { SessionDuringStep } from './SessionDuringStep';
import { SessionAfterStep } from './SessionAfterStep';
import type {
  SessionTranscript,
  TranscriptUtterance,
  EmotionalObservation,
} from '../../types/session';
import type {
  Household,
  HouseholdMember,
  MemberActionItem,
  MemberNote,
  MemberNoteType,
} from '../../types/family';

interface TranscriptViewerProps {
  session: SessionTranscript;
  activeStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  household: Household | null;
  householdMembers: HouseholdMember[];
  openActionItems: MemberActionItem[];
  householdMemberNotes: MemberNote[];
  previousSession: SessionTranscript | null;
  sessionActionItems: MemberActionItem[];
  sessionMemberNotes: MemberNote[];

  // Per-section save handlers
  onSavePrepNotes: (text: string) => Promise<boolean>;
  onSaveHandwrittenText: (text: string) => Promise<boolean>;
  onSaveInkPages: (pages: import('../../types/ink').InkPage[]) => Promise<boolean>;
  onSaveDriveLink: (url: string) => Promise<boolean>;
  onClearDriveLink: () => Promise<boolean>;
  onSavePostNotes: (
    writeUp: string,
    metadata: {
      keyInsights: string[];
      emotionalObservations: EmotionalObservation;
    }
  ) => Promise<boolean>;
  onSaveTranscript?: (utterances: TranscriptUtterance[]) => Promise<boolean>;

  // Action items handlers
  onToggleActionItem: (id: string, newStatus: 'open' | 'done') => Promise<void>;
  onCreateActionItem: (item: {
    memberId: string;
    task: string;
    priority: 'normal' | 'high';
    dueDate?: string | null;
  }) => Promise<boolean>;
  onDeleteActionItem: (id: string) => Promise<void>;

  // Member notes handlers
  onCreateMemberNote: (note: {
    memberId: string;
    noteType: MemberNoteType;
    body: string;
  }) => Promise<boolean>;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  session,
  activeStep,
  onSelectStep,
  household,
  householdMembers,
  openActionItems,
  householdMemberNotes,
  previousSession,
  sessionActionItems,
  sessionMemberNotes,
  onSavePrepNotes,
  onSaveHandwrittenText,
  onSaveInkPages,
  onSaveDriveLink,
  onClearDriveLink,
  onSavePostNotes,
  onSaveTranscript,
  onToggleActionItem,
  onCreateActionItem,
  onDeleteActionItem,
  onCreateMemberNote,
}) => {
  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-beige/80 bg-[#faf8f4] overflow-hidden shadow-2xs">
      {/* Pinned Tab Bar at top */}
      <SessionWorkflowTabs
        activeStep={activeStep}
        onSelectStep={onSelectStep}
        openActionItemsCount={openActionItems.length}
        hasRecording={Boolean(session.driveWebViewUrl)}
        hasPostNotes={Boolean(session.hasRealPostNotes || session.clinicalSummary)}
      />

      {/* Scrollable Workflow Step Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {activeStep === 'before' && (
          <SessionBeforeStep
            household={household}
            householdMembers={householdMembers}
            openActionItems={openActionItems}
            onToggleActionItem={onToggleActionItem}
            memberNotes={householdMemberNotes}
            previousSession={previousSession}
            initialPrepNotes={session.preSessionRecap || ''}
            onSavePrepNotes={onSavePrepNotes}
          />
        )}

        {activeStep === 'session' && (
          <SessionDuringStep
            initialHandwrittenNotes={session.handwrittenNotes || ''}
            initialInkPages={session.inkPages || []}
            sessionNumber={session.sessionNumber}
            onSaveHandwrittenText={onSaveHandwrittenText}
            onSaveInkPages={onSaveInkPages}
            driveWebViewUrl={session.driveWebViewUrl}
            onSaveDriveLink={onSaveDriveLink}
            onClearDriveLink={onClearDriveLink}
            rawTranscript={session.rawTranscript || []}
            onSaveTranscript={onSaveTranscript}
          />
        )}

        {activeStep === 'after' && (
          <SessionAfterStep
            session={session}
            householdMembers={householdMembers}
            sessionActionItems={sessionActionItems}
            onCreateActionItem={onCreateActionItem}
            onToggleActionItem={onToggleActionItem}
            onDeleteActionItem={onDeleteActionItem}
            sessionMemberNotes={sessionMemberNotes}
            onCreateMemberNote={onCreateMemberNote}
            onSavePostNotes={onSavePostNotes}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;
