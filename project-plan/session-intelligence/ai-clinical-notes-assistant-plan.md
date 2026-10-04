# AI Clinical Notes Assistant & Family Case Co-Pilot — System Architecture & Implementation Plan

> **Status**: Planned / Future Roadmap  
> **Classification**: Highly Sensitive Clinical Data Architecture  
> **Author**: Senior AI Architect & Clinical Psychology Advisor  
> **Primary User**: Mai (Child Psychologist & Parent Coach)  
> **Core Directive**: Strict Human-in-the-Loop. The AI assists by drafting; Mai has 100% final clinical authority. Zero invented data.

---

## 1. Executive Summary & Clinical Sensitivity

In clinical child psychology and parent coaching, note-taking is time-intensive but vital. Practitioners must extract family rosters, children's developmental traits, triggers, sensory sensitivities, and parental dynamics from narrative session notes.

This specification outlines the architecture for an **AI Clinical Notes Assistant** embedded directly in Mai's website. When session or intake notes are recorded, an edge function processes the text through developmental psychology frameworks to draft family member personas, emotional triggers, strengths, and clinical summaries. 

Every extraction is held in a **Draft / Pending Review** state. Mai reviews, edits, and approves the extracted findings side-by-side with her original notes before anything is committed to the official client dossier.

---

## 2. Hard Non-Negotiable Clinical & Ethical Rules

1. **Zero Hallucination / Zero Invented Data**:
   - If Mai did not write down a detail (e.g. phone number, exact birth year, school name, marital status), the AI **must never infer or generate placeholder data**.
   - Missing fields must explicitly return `null` or `"Not mentioned in session notes"`.

2. **Direct Evidence Attribution (Grounding Quotes)**:
   - For every extracted trait, trigger, or dynamic, the AI must cite the exact sentence or phrase from Mai's note as evidence (e.g., *Trigger: "School bathrooms" — Cited from: "She doesn't go to the toilet at school because she's scared"*).

3. **Human-in-the-Loop (Mai Holds 100% Clinical Authority)**:
   - The AI never writes directly to official medical/psychological records without Mai's explicit review and confirmation.
   - All AI outputs are saved in a temporary staging state (`status = 'pending_review'`).

4. **Privacy & PII Protection**:
   - Precise dates of birth for minors are never generated or stored; only `birth_year` or developmental age (e.g., `6yo`).
   - All processing occurs within secure, private Supabase Edge Functions with server-side API keys (`GEMINI_API_KEY`). No client data is ever transmitted to public third-party services.

5. **Gated Clinical Access Security**:
   - Adheres to the established architecture in `project-plan/family-system/decisions.md`.
   - Access to run or review clinical extraction strictly requires `is_admin() AND has_family_unlock()` using the shared `FAMILY_SESSIONS_PASSWORD`.

---

## 3. System Architecture & Information Flow

```
                                 [Mai Records / Pastes Session Notes]
                                                  │
                                                  ▼
                       [Trigger: "✨ Analyze Notes & Draft Family Profile"]
                                                  │
                                                  ▼
                    [Edge Function: supabase/functions/clinical-notes-extractor]
                      • Verifies Admin Session & Active Family Unlock (8h)
                      • Loads Raw Session Content from session_content
                      • Applies Structured Clinical Extraction Prompt (Gemini Flash-Lite)
                      • Enforces Strict Schema & Evidence Citation
                                                  │
                                                  ▼
                       [Database Staging Table: ai_clinical_drafts]
                      • Stores draft payload with status = 'pending_review'
                      • Links to session_id, household_id, and created_at
                                                  │
                                                  ▼
                      [Frontend Review Modal: AdminClinicalDraftReviewModal]
                      • Split-Screen / Side-by-Side Interface:
                          - Left: Mai's Original Notes (with highlighted quote chips)
                          - Right: AI Draft Form (Editable input fields)
                      • Controls: [Approve & Save to Dossier] | [Edit Nuance] | [Discard]
                                                  │
                                                  ▼
                          [Commit to Official Clinical Database]
                      • household_members   (Roster, roles, birth years)
                      • member_personas     (Traits, triggers, strengths, dynamics)
                      • household_clinical  (Presenting issues, working plan, next steps)
```

---

## 4. Database Schema Additions

A timestamped migration (`supabase/migrations/20261101000000_create_ai_clinical_drafts.sql`) will create the isolated draft staging table:

```sql
-- Migration: AI Clinical Drafts Staging Table
create table if not exists public.ai_clinical_drafts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  session_id uuid references public.case_sessions(id) on delete cascade,
  source_note_id uuid references public.session_content(id) on delete set null,
  raw_note_text text not null,
  extracted_payload jsonb not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.ai_clinical_drafts enable row level security;

-- Admin + Family Unlock Policy
create policy "Admins with family unlock can access clinical drafts"
  on public.ai_clinical_drafts
  for all
  using (public.is_admin() and public.has_family_unlock())
  with check (public.is_admin() and public.has_family_unlock());
```

---

## 5. Edge Function Specification (`clinical-notes-extractor`)

### 5.1 Endpoint & Permissions
- **Route**: `POST https://<project>.supabase.co/functions/v1/clinical-notes-extractor`
- **Headers**:
  - `Authorization: Bearer <user_token>`
  - `Content-Type: application/json`
- **Security Check**:
  1. Validates Supabase JWT.
  2. Confirms user has `role = 'admin'`.
  3. Confirms user has an active unlock row in `family_unlocks` (`expires_at > now()`).

### 5.2 Structured Clinical Extraction Schema (TypeScript)
The LLM response is strictly constrained to this JSON format:

```typescript
export interface ClinicalExtractionResult {
  household_id: string;
  detected_members: Array<{
    name: string;
    role: 'mother' | 'father' | 'child' | 'guardian' | 'sibling' | 'other';
    birth_year?: number | null;
    estimated_age?: number | null;
    evidence_quote: string;
  }>;
  member_personas: Array<{
    member_name: string;
    persona_summary: string;
    temperament_traits: string[];
    known_triggers: string[];
    strengths: string[];
    concern_level: 'mild' | 'moderate' | 'high';
    family_dynamic_role: string;
    evidence_quotes: Array<{
      field: string;
      quote: string;
    }>;
  }>;
  household_clinical: {
    presenting_issue: string;
    working_plan: string;
    next_step: string;
    parent_relational_dynamics: string;
    evidence_quotes: Array<{
      field: string;
      quote: string;
    }>;
  };
  unmentioned_fields: string[]; // Explicit list of fields not found in the note
}
```

### 5.3 System Prompt Instructions (Clinical Grounding)
The model is instructed as an empathetic, evidence-based developmental psychology assistant:

```markdown
You are a clinical psychology documentation assistant assisting Mai, an evidence-based child psychologist and family coach.
Your job is to read raw clinical session notes and extract structured family data.

STRICT CLINICAL RULES:
1. NEVER invent or assume any facts. If a child's age, father's behavior, or school details are not explicitly mentioned in the note, leave them as null and record them in `unmentioned_fields`.
2. NEVER invent phone numbers, email addresses, or physical addresses.
3. Every clinical inference (e.g. anxiety trigger, temperament trait) MUST be accompanied by an exact quotation from the notes.
4. Use respectful, clinical, non-judgmental language grounded in attachment theory and nervous system regulation.
5. Identify all mentioned family members, including siblings and both parents.
```

---

## 6. Frontend UI: Mai's Review & Approval Workspace

### 6.1 Review Modal Layout (`AdminClinicalDraftReviewModal.tsx`)
A distraction-free, side-by-side review workspace:

1. **Top Bar**:
   - Status badge: `✨ AI Draft Generated — Awaiting Mai's Review`
   - Actions: `[Discard Draft]` | `[Save Changes]` | `[Approve & Apply to Family Cards]`

2. **Left Column (Source Evidence)**:
   - Full text of Mai's original session notes.
   - Interactive quote chips: Clicking an extracted trait on the right highlights the corresponding source sentence on the left in soft sage/amber.

3. **Right Column (Editable Draft Form)**:
   - **Family Roster Tab**:
     - Cards for each detected family member (e.g. Mother: Rana, Child: Jury 6yo).
     - Editable role selector, birth year / age input, and delete button if an unrelated person was misidentified.
   - **Psychological Personas Tab**:
     - Temperament traits (tag input).
     - Triggers & sensitivities (tag input).
     - Strengths & emotional anchors (tag input).
     - Family dynamic & role summary (editable textarea).
   - **Household Clinical Plan Tab**:
     - Core presenting concern (textarea).
     - Recommended next steps & guidelines (textarea).

4. **One-Click Approval**:
   - Clicking `[Approve & Apply]` updates:
     - `household_members`
     - `member_personas`
     - `household_clinical`
     - Updates draft status to `'approved'` with timestamp and audit log.

---

## 7. Phased Implementation Roadmap

### Phase 1: Database Staging & Edge Function
- [ ] Create timestamped migration for `ai_clinical_drafts` table with RLS.
- [ ] Create `supabase/functions/clinical-notes-extractor` with strict schema validation.
- [ ] Test extraction accuracy against sample discovery calls (e.g. Rana Salama, Mariam Ayad) using unit test scripts.

### Phase 2: Frontend Review Modal Component
- [ ] Build `AdminClinicalDraftReviewModal.tsx` under `src/pages/admin/components/`.
- [ ] Integrate interactive quote highlighting (source text ↔ extracted trait).
- [ ] Wire save, edit, and one-click database commit logic.

### Phase 3: Integration into Workspace & Dossier
- [ ] Add the `[✨ Analyze Notes & Draft Profile]` button to `AdminSessions.tsx` and `ClientDossierModal.tsx`.
- [ ] Add a visual notification badge in the Client Dossier whenever a draft is awaiting review.

### Phase 4: Clinical User Testing with Mai
- [ ] Conduct interactive trial with Mai on 3 historical sessions.
- [ ] Fine-tune tone, vocabulary, and tag taxonomy based on Mai's feedback.

---

## 8. Anti-Damage & Risk Checklist

- [x] **No auto-commits**: Clinical records can never be altered without user action.
- [x] **No PII leakage**: Keys remain in edge function secrets; no third-party APIs used outside secure Gemini edge function.
- [x] **Zero invented data**: Empty fields remain null; no fake emails or dummy phone numbers.
- [x] **Security lock adherence**: Unlocked access required before viewing or processing.
