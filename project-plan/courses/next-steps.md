# Course Authoring & Delivery — Verification & Negative Test Matrix

This plan outlines the negative testing and validation steps required before production deployment.

---

## 1. Negative Test Matrix

| # | Test Scenario | Steps to Execute | Expected Result | Pass Criteria |
|---|---|---|---|---|
| **T1** | **Direct Storage Access by Unenrolled User** | Authenticate as student without enrollment in `parenting-confidence`. Directly call `supabase.storage.from('course-materials').download('parenting-confidence/v1/test.pdf')`. | PostgreSQL Storage RLS blocks query. Returns 403 / 400 error. | Storage object is never returned to unenrolled user. |
| **T2** | **Direct Storage Access by Enrolled Student** | Authenticate as student with active enrollment in `parenting-confidence`. Call `supabase.storage.from('course-materials').download('parenting-confidence/v1/test.pdf')`. | Policy verifies `(storage.foldername(name))[1]` matches active enrollment in `course_enrollments`. | Download completes successfully. |
| **T3** | **Unpublished Parent Course Protection** | Mark course `status = 'draft'` while module and lessons have `status = 'published'`. Query `/courses/:id` and Supabase client `from('course_lessons')`. | RLS and query return null/empty. UI shows "Course Not Found". | No child modules or lessons leak from draft courses. |
| **T4** | **Unpublished Parent Module Protection** | In a published course, set Module 1 to `status = 'draft'`, leaving Lesson 1 as `published`. Query lessons as unauthenticated user. | Lesson 1 is excluded from results. RLS blocks select because parent module is draft. | Child lessons never display if their containing module is draft. |
| **T5** | **Zero Published Courses Cutover** | Set all courses in DB to `status = 'draft'`. Navigate to `/courses`. | Catalog returns empty list (`[]`). UI displays "No courses found". Static `content.ts` is **not** resurrected. | Intentional unpublish of all courses is strictly respected. |
| **T6** | **Database Outage Graceful Handling** | Simulate database connection failure or network block. Fetch courses catalog or course detail. | Data layer catches error, returns `{ courses: [], error: 'Catalog Temporarily Unavailable' }`. | UI renders explicit outage alert with Retry button instead of silently showing stale static courses. |
| **T7** | **Mismatched Module/Course Insertion** | Attempt to insert a lesson with `module_id = 'm1'` (belonging to `parenting-confidence`) and `course_id = 'burnout-recovery-course'`. | Database raises foreign key violation (`course_lessons_module_fkey`). Insertion fails. | Database rejects mismatched structural relationships. |
| **T8** | **Mismatched Material/Lesson Insertion** | Attempt to insert a material with `lesson_id = 'v1'` (belonging to `parenting-confidence`) and `course_id = 'child-brain'`. | Database raises foreign key violation (`course_materials_lesson_fkey`). Insertion fails. | Database rejects orphaned or misaligned materials. |
| **T9** | **Hard Deletion Guard on Enrolled Courses** | Attempt SQL `DELETE FROM courses WHERE id = 'parenting-confidence'` when active student enrollments exist. | Trigger `trigger_prevent_course_deletion` raises exception: *"Cannot hard delete course because student enrollments exist. Set status to archived instead."* | Hard deletion is aborted; existing student progress and enrollments are preserved. |
| **T10** | **Upload Interruption & TUS Resume** | Start uploading a 20MB video file. Click "Simulate Interruption" midway. Inspect network tab. Click "Resume Upload". | Current XHR aborts. Uploader enters `interrupted` stage. On resume, uploader sends `HEAD` request to Bunny, receives `Upload-Offset`, and resumes uploading remaining chunks without restarting from 0%. | Upload reaches 100% and transitions to processing. |
| **T11** | **Upload Cancellation Cleanup** | Start video upload. Click "Cancel". Inspect Edge Function invocation. | Frontend aborts XHR, removes sessionStorage key, and calls `bunny-stream-manager` (`action: 'deleteVideo'`). Video object is removed from Bunny library. | No orphaned videos remain in Bunny account. |
| **T12** | **Signed URL Expiration** | Generate signed material URL via `getMaterialAccess`. Wait 305 seconds (exceeding 300s expiration). Request URL in browser. | Supabase storage returns HTTP 403 Forbidden / Expired Signature. | Private materials cannot be shared via leaked URLs after expiration. |

---

## 2. Seed Mapping Verification Check

Before applying `20260920150001_seed_initial_courses.sql`, verify 1:1 parity with `src/data/content.ts`:
- [x] Course `parenting-confidence` (Matches static ID)
- [x] Course `burnout-recovery-course` (Matches static ID)
- [x] Course `emotional-resilience` (Matches static ID)
- [x] Course `child-brain` (Matches static ID)
- [x] Course `nervous-system-reset` (Matches static ID)
- [x] Course `puberty-prep` (Matches static ID)
- [x] Module `m1` and Lesson `v1` mapped under `parenting-confidence`
- [x] Active `course_enrollments` records in Supabase retain their existing relationships without modification.

---

## 3. Production Deployment Checklist

1. Review and approve the revised migration `20260920150000_create_course_cms_tables.sql`.
2. Apply migration to Supabase production database.
3. Apply seed migration `20260920150001_seed_initial_courses.sql`.
4. Deploy updated Edge Function `bunny-stream-manager`.
5. Release frontend course authoring and delivery files via isolated release branch (excluding WhatsApp commits).
