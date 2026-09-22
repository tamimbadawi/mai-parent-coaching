# Session Intelligence & Conversational UI — Architectural Decisions

This document records the settled architectural decisions for the **Session Intelligence & Conversational UI** module (Part 2 of the Therapy Session Intelligence pipeline).

---

## 1. Context & Business Domain

Following individual parent coaching and child psychology sessions conducted via Google Meet, Mai requires a unified clinical hub to:
1. Review structured clinical summaries, key observations, and action items extracted from session transcripts.
2. Search and review the raw dialogue transcripts with timestamps and speaker tags.
3. Conduct multi-turn, context-aware conversational querying with Gemini scoped strictly to a specific client's history (e.g., querying emotional patterns, drafting tailored follow-up WhatsApp messages, comparing progress across sessions).
4. Seamlessly transition from mock simulation during frontend development to live Supabase and Gemini Edge Function calls without rewriting the UI.

---

## 2. Decided Architecture (Part 2 Scope)

### Stack & UI Standards
- **Framework**: React 18, Vite 5, TypeScript, React Router DOM v7.
- **Design System**: Strict adherence to Mai Website aesthetic — luxury wellness palette (`sage`, `ivory`, `cream`, `charcoal`, `terracotta`, `warm white`), generous whitespace, Apple/Notion-inspired ergonomics. No external generic component libraries (no Shadcn primitives); build native Tailwind CSS 3 components with Framer Motion and Lucide React.
- **Markdown & Clinical Notes**: Use `react-markdown` with customized Tailwind formatting for clinical headers, bulleted action items, bold psychological terms, and trigger tags.
- **Location & Route**:
  - Primary route: `/admin/sessions` (protected by `ProtectedRoute requiredRole="admin"`).
  - Placed inside `AdminLayout` under the **Practice** navigation group ("Session Notes").
  - Deep-linked from `AdminCRM` (within `ClientDossierModal`) and `AdminBookings` for instant access to a specific client or session.

### Frontend Module Breakdown
```text
src/
├── types/
│   └── session.ts                  # Domain models: SessionTranscript, ActionItem, ChatMessage, ClientSessionSummary
├── hooks/
│   └── useSessionChat.ts           # State machine for chat messages, Gemini streaming/simulation, and mock toggle
├── components/
│   └── sessions/
│       ├── SessionHeader.tsx       # Client info, session date, duration, focus badges, and status
│       ├── TranscriptViewer.tsx    # Tabbed/structured clinical notes, action items checklist, raw transcript
│       ├── SessionChatPanel.tsx    # Context-aware multi-turn AI chat with prompt suggestion chips
│       └── ClientSessionTabs.tsx   # Timeline/selector for switching across past sessions of the client
└── pages/
    └── admin/
        └── AdminSessions.tsx       # Top-level view integrating selector, transcript viewer, and chat panel
```

---

## 3. Mock Testing Harness & Decoupled Development

To allow Part 2 to be built, visually perfected, and validated immediately before Part 1 (Google Apps Script) is deployed:
1. **Mock Data Engine**: Seed 3 realistic, clinically authentic coaching sessions (e.g., *Toddler Meltdowns & Sensory Regulation*, *Bedtime Resistance & Parental Burnout*, *School Anxiety & Morning Routines*).
2. **Toggleable Mock Engine in `useSessionChat`**:
   - `isMockMode: true` (default during UI testing): Generates context-aware, clinically grounded simulated responses within 600–900ms, incorporating client-specific details.
   - Pre-configured prompt chips:
     - *"Summarize emotional triggers identified in this session"*
     - *"Draft a supportive follow-up WhatsApp message with parent action items"*
     - *"What recurring behavioral patterns appeared across recent sessions?"*
   - `isMockMode: false`: Seamlessly calls the Supabase Edge Function (`session-gemini-chat`) once backend deployment is ready.

---

## 4. Security, RLS & Privacy

- **Strict Access Control**: Session transcripts and clinical notes contain sensitive family, child, and psychological observations.
- Only users with `role === 'admin'` in `profiles` may query, read, or chat with transcripts.
- Gemini API keys must **never** be exposed in client code or frontend environment variables. All live AI operations run via Supabase Edge Functions with authenticated admin JWT verification.
- In Part 1 and Part 2, client identifiable details (PII) are guarded per HIPAA/GDPR clinical confidentiality principles.
