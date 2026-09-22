export type HouseholdStatus = 'active' | 'paused' | 'completed';
export type HouseholdMemberRole = 'mother' | 'father' | 'child' | 'guardian' | 'other';
export type CaseSessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type SessionContentType = 'pre_session_recap' | 'live_transcript' | 'handwritten_notes' | 'post_session_notes';

export interface Household {
  id: string;
  primary_contact_profile_id: string;
  family_name: string;
  presenting_issue: string | null;
  working_plan: string | null;
  next_step: string | null;
  status: HouseholdStatus;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  full_name: string;
  role: HouseholdMemberRole;
  birth_year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseSession {
  id: string;
  household_id: string;
  booking_id: string | null;
  session_date: string;
  duration_minutes: number | null;
  google_meet_url: string | null;
  status: CaseSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionAttendee {
  id: string;
  session_id: string;
  household_member_id: string;
  created_at: string;
}

export interface SessionContent {
  id: string;
  session_id: string;
  content_type: SessionContentType;
  content: string | null;
  source_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HouseholdWithMembers extends Household {
  household_members: HouseholdMember[];
}

export const currentAge = (birthYear: number | null): number | null =>
  birthYear ? new Date().getFullYear() - birthYear : null;

export const roleLabel = (role: HouseholdMemberRole): string => {
  const labels: Record<HouseholdMemberRole, string> = {
    mother: 'Mother',
    father: 'Father',
    child: 'Child',
    guardian: 'Guardian',
    other: 'Other',
  };
  return labels[role];
};

export interface SessionChatMessage {
  id: string;
  household_id: string;
  session_id: string | null;
  sender: 'admin' | 'assistant';
  content: string;
  created_at: string;
}

export const CONTENT_TYPE_LABELS: Record<SessionContentType, string> = {
  pre_session_recap: 'Pre-Session Recap',
  live_transcript: 'Live Transcript',
  handwritten_notes: 'Handwritten Notes',
  post_session_notes: 'Post-Session Write-up',
};
