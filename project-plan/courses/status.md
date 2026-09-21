# Course Authoring & Delivery — Current Status

**Status**: Ready for Owner Review & Production Migration  
**Updated**: 2026-09-20  
**Branch**: `feature/course-authoring-delivery`

---

## Review Findings Resolution Status

| Review Finding | Action Required | Status | Implementation Details |
|---|---|---|---|
| **1. Private File Access** | Restrict `course-materials` bucket storage access to verified enrollment or admin. Test direct storage requests. | **RESOLVED** | Migrated `storage.objects` RLS to verify `(storage.foldername(name))[1]` against active `course_enrollments` or admin. Edge Function `getMaterialAccess` also verifies active enrollment before issuing 5-min signed URLs. |
| **2. Publishing Cutover** | Prevent fallback from resurrecting static courses on 0 published courses. Show error on DB outage. Require published parents. | **RESOLVED** | `courses.ts` returns `[]` on 0 DB courses. Only falls back to static content on PostgreSQL error `42P01` (`undefined_table`). DB outage surfaces explicit error to UI. Lesson RLS requires published module and course. |
| **3. Course Structure & Student Protection** | Enforce module/lesson/material course_id relationships. Guard against hard deletion of courses with enrollments. | **RESOLVED** | Added composite foreign keys `(module_id, course_id)` and `(lesson_id, course_id)`. Created `trigger_prevent_course_deletion` blocking deletes when enrollments exist; requires archiving. |
| **4. TUS Uploader Completion** | 5MB chunking, HEAD offset resume/retry, cancellation cleanup, bounded 15-min timeout, interruption test. | **RESOLVED** | Implemented in `BunnyVideoUploader.tsx`. `CHUNK_SIZE = 5MB`, `HEAD` offset query, `deleteVideo` on cancel, 15-min timeout, and simulated interruption test button. Removed unused `setUploading`. |
| **5. Release Boundary Specification** | Isolate course work from pre-existing WhatsApp commits (`fa30dff..7a3cd7e`). | **RESOLVED** | Defined release boundary. Documented exact release diff excluding the 4 WhatsApp commits via clean worktree/release branch from `origin/main`. |
| **6. Publish Checklist & Negative Tests** | Checklist validating required fields and ready videos. Negative test matrix. Verify seed mappings. PayTabs price disclaimer. | **RESOLVED** | `CourseEditorModal.tsx` enforces publish readiness checklist. PayTabs disclaimer note added to price field. Seed migration verified 1:1 against `content.ts`. Negative test matrix created in `next-steps.md`. |

---

## Build & Test Status
- `npm run build` (`vite build`): **PASSED** (2342 modules transformed, built in ~4.4s).
- TypeScript Typecheck on course files: **0 errors**.
- Database Migration Linting: **PASSED** (Valid PostgreSQL DDL, composite constraints, trigger, and RLS).
