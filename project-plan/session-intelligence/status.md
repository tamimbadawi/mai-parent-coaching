# Session Intelligence & Conversational UI — Status

## Current Status: 🟡 PLANNED (Part 2 Frontend & Mock Engine Execution)

> [!IMPORTANT]
> - Scope is strictly **Part 2 (Interactive Therapy Session & Conversational UI)**.
> - Part 1 (Google Apps Script / Gemini automated transcription pipeline) will be connected subsequently.
> - A self-contained, realistic Mock Engine and fixture dataset allows full interactive testing of the UI, Markdown rendering, and multi-turn chat without live external dependencies.

---

## Overview & Purpose

Provides Admin Mai with an evidence-based clinical intelligence dashboard:
1. Review structured session notes, behavioral observations, and action items derived from therapy/coaching consultations.
2. Search and inspect the full raw dialogue transcript.
3. Conduct multi-turn, context-aware AI chat with Gemini scoped to the active client.
4. Seamlessly switch between mock testing and live Supabase persistence.

---

## Implementation Stage Tracker

| Stage | Focus | Status | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Stage 1** | **Domain Types & Realistic Mock Fixtures** | 🟡 Ready | `src/types/session.ts` and `src/data/mockSessions.ts` with authentic parent coaching scenarios. |
| **Stage 2** | **Transcript Viewer & Action Checklist UI** | 🟡 Ready | `TranscriptViewer.tsx` and `SessionHeader.tsx` with Markdown rendering, observation tags, and interactive action items. |
| **Stage 3** | **Multi-Turn Chat Panel & Mock AI Engine** | 🟡 Ready | `SessionChatPanel.tsx` and `useSessionChat.ts` with quick-prompt chips, simulated typing, and context-aware responses. |
| **Stage 4** | **Admin Integration & Deep Linking** | 🟡 Ready | Dedicated `/admin/sessions` page in `AdminLayout`, linked from `ClientDossierModal` and `AdminBookings`. |
