# Session Intelligence & Conversational UI — Next Steps (Part 2)

This document specifies the refined implementation plan for **Part 2 (Interactive Therapy Session & Clinical Editing)**.

---

## 1. Unified Header Architecture (Per User Mockup)

- **Consolidated Top Header**:
  - The separate `SessionControlBar` card underneath the title is eliminated.
  - The Client and Session dropdowns move directly into the right-hand `action` slot of `AdminLayout`.
  - The "Lock", "Super Admin Verified", and extraneous metadata pills (focus areas, duration, Meet link, simulated badge) are removed from the header.
  - The clinical workspace immediately begins directly under the title row, maximizing screen real estate.
- **Access Control**:
  - Promotion to Super Admin is validated once via `SuperAdminGate` (passcode `654321`). No on-page clutter or manual lock buttons.

---

## 2. Zero-Scroll Assistant Panel

- **Session Intelligence (Right Panel)**:
  - Scaled and structured to eliminate inner and window scrollbars.
  - Compact message history, welcoming context, and suggested prompt chips fit comfortably within viewport bounds.

---

## 3. Full Editability Across All 4 Sections

Each clinical section supports interactive editing, additions, and updates:

1. **Clinical Summary Tab**:
   - Inline Markdown editor with Edit / Save toggle.
   - "+ Add Key Insight" input to insert takeaways.
2. **Action Plan Tab**:
   - "+ Add Action Item" form (category: Parent vs. Coach, priority tag, context note).
   - Inline editing for existing item text.
   - Delete action item button.
   - Checkbox completion toggling.
3. **Emotional Dynamics Tab**:
   - Dropdown selection for stress level and polyvagal nervous system state.
   - "+ Add Behavioral Trigger" tag chip creator with remove (`X`) buttons.
   - "+ Add Parental Strength" tag chip creator with remove (`X`) buttons.
   - Editable child neurological and sensory profile textarea.
4. **Raw Transcript Tab**:
   - "+ Add Dialogue Line" (speaker: Mai vs. Parent, timestamp, utterance text).
   - Inline utterance editing.
   - Utterance deletion option.

---

## 4. Verification Gates

- Clean TypeScript compilation with 0 type errors (`npm run typecheck`).
- Production bundle verification (`npm run build`).
- Interactive browser validation of editing and adding across all 4 tabs.
