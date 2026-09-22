# Family / Household Client Management System — Next Steps

## Sequential Implementation Stages

### Stage 1: Household & Family Data Model Migration
- Write `supabase/migrations/20260922150000_create_family_client_system.sql`.
- Create tables: `households`, `household_members`, `case_sessions`, `session_attendees`, `session_content`.
- Add triggers for `updated_at`.
- Enable RLS on all tables with admin-only policies using `public.is_admin()` split across 4 operations (select, insert, update, delete).
- Test migration application.

### Stage 2: Household List & Dossier UI
- Create `/admin/families` (or integrate into `/admin/crm`).
- Implement searchable, filterable household list.
- Implement household dossier with members list (computed age), inline-editable case fields (`presenting_issue`, `working_plan`, `next_step`), and chronological sessions.
- Verify full persistence surviving hard refresh.

### Stage 3: Session Workspace (Four Content Slots)
- Build session detail workspace with 4 independent content slots.
- Markdown editor for Post-Session Write-up.
- Stop and confirm Gemini Pre-Session Recap prompt and generation rules.
- Stop and confirm Google Meet transcript ingestion format.
- Build image upload UI + Gemini Vision OCR for handwritten notes.

### Stage 4: Multi-Session Analysis
- Implement multi-session selector.
- Edge Function with Gemini aggregation.
- Enforce strict fallback disclaimer when `clinical_analysis_rules` is empty to prevent AI hallucinated diagnostic frameworks.

### Stage 5: Cleanup
- Audit and cleanly remove superseded prototype artifacts after user confirmation.

---

## Actual remaining work (see status.md for full detail)

Stages 0–5 above are done and live-verified. What's genuinely still open, not guessed at:

1. **Pre-session recap generation** — needs a decision on trigger + source content before building.
2. **Live transcript ingestion** — needs the real Google Meet → Drive → Gemini pipeline's output format/location before wiring it up. Until answered, `live_transcript` stays a manual slot.
3. **Mai's actual clinical framework** — `clinical_analysis_rules` is intentionally empty. Populating it is a conversation with Mai about her real methodology, not an engineering task.
4. Not yet pushed to remote or merged to `main` — branch is `feature/family-client-system`, correctly based on `main`.
