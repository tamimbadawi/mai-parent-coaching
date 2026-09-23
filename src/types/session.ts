export type SessionStatus = 'completed' | 'processing' | 'failed';

export type ActionItemCategory = 'parent' | 'coach';
export type ActionItemPriority = 'high' | 'medium' | 'low';

export interface ActionItem {
  id: string;
  text: string;
  category: ActionItemCategory;
  completed: boolean;
  priority?: ActionItemPriority;
  contextNote?: string;
}

export interface EmotionalObservation {
  parentalStressLevel: 'low' | 'moderate' | 'elevated' | 'acute';
  nervousSystemState: 'regulated_ventral' | 'sympathetic_fight_or_flight' | 'dorsal_vagal_shutdown' | 'fluctuating';
  identifiedTriggers: string[];
  strengthsNoted: string[];
  childDynamicsSummary?: string;
}

export interface TranscriptUtterance {
  id: string;
  timestamp: string; // e.g. "04:15"
  speaker: 'Mai (Coach)' | 'Parent';
  text: string;
}

export interface SessionTranscript {
  id: string;
  bookingId?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAvatarUrl?: string;
  sessionNumber: number;
  sessionDate: string; // ISO date
  durationMinutes: number;
  googleMeetUrl?: string;
  driveWebViewUrl?: string | null;
  focusAreas: string[];
  
  // Structured clinical insights
  clinicalSummary: string; // Markdown formatted summary / Post-session write-up
  preSessionRecap?: string; // Pre-session preparation notes
  hasRealPostNotes?: boolean; // Whether real post-session notes exist in database
  handwrittenNotes?: string; // Handwritten / quick observational clinical notes
  inkPages?: import('./ink').InkPage[]; // Pen ink notebook pages stored in source_metadata.ink_pages
  keyInsights: string[];
  actionItems: ActionItem[];
  emotionalObservations: EmotionalObservation;
  
  // Dialogue transcript
  rawTranscript: TranscriptUtterance[];
  
  // Processing metadata
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export type ChatSender = 'admin' | 'gemini';

export interface ChatMessage {
  id: string;
  sessionId: string;
  clientId: string;
  sender: ChatSender;
  content: string; // Markdown formatted response
  createdAt: string;
  suggestedFollowUps?: string[];
}

export interface ClientSessionSummary {
  clientId: string;
  clientName: string;
  clientEmail: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  householdId?: string;
  totalSessions: number;
  isDemo?: boolean;
  sessions: SessionTranscript[];
}

