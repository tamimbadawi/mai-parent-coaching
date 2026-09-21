# Course Authoring & Delivery — Architectural Decisions (Revised)

These architectural decisions govern Antigravity's implementation of the production course authoring and delivery system, revised to satisfy the six review findings.

---

## 1. CMS Authorization & Deliberate Cutover Rules
- **CMS Scope**: The owner authorized a production course CMS in `/admin/courses` with persistent database storage in Supabase.
- **Stable Identifiers**: Existing static course IDs (`parenting-confidence`, `burnout-recovery-course`, etc.) and URLs (`/courses/:id`) are strictly preserved.
- **Deliberate Cutover & Outage Rules**:
  - `fetchPublishedCourses()` queries `courses` where `status = 'published'`.
  - **Zero Published Courses**: If the database returns 0 published courses (an empty array), the data layer returns `[]`. It **never** falls back to static content, ensuring that an intentional unpublish is strictly honored.
  - **Database Outage**: If the database returns an error, the data layer returns an explicit error message (`Catalog Temporarily Unavailable`) rather than silently showing potentially withdrawn static courses.
  - **Unmigrated Development Fallback Only**: Fallback to static courses is strictly restricted to PostgreSQL error code `42P01` (`undefined_table`), allowing local development before migration execution.
  - **Parent Publication Cascading**: A published lesson is only visible if its parent module **and** parent course are both `published`.

---

## 2. Relational Integrity & Student Protection
- **Composite Foreign Keys**:
  - `course_lessons` enforces `FOREIGN KEY (module_id, course_id) REFERENCES course_modules(id, course_id) ON DELETE CASCADE`.
  - `course_materials` enforces `FOREIGN KEY (lesson_id, course_id) REFERENCES course_lessons(id, course_id) ON DELETE CASCADE`.
  - This structurally prevents child lessons or materials from disagreeing with their parent module's or course's identity.
- **Archive vs. Delete Protection**:
  - The database contains a `BEFORE DELETE` trigger (`prevent_course_deletion_with_enrollments`) that aborts any hard deletion of a course if records exist in `course_enrollments`.
  - Admins must archive courses (`status = 'archived'`) instead. Archiving retains enrolled student access and video progress in their student dashboard while hiding the course from the public catalog.

---

## 3. Private File Access & Storage Security
- **Storage Bucket**: Dedicated private bucket `course-materials` (`public: false`).
- **Storage Path Convention**: Files are stored at `{course_id}/{lesson_id}/{timestamp}_{filename}`.
- **Direct Storage Request RLS**:
  - RLS on `storage.objects` restricts `SELECT` to:
    1. Admin users (`public.is_admin() = true`).
    2. Authenticated students where `(storage.foldername(name))[1]` matches an active enrollment in `public.course_enrollments` (`status = 'active'`).
  - Direct requests to Supabase Storage (e.g. `supabase.storage.from('course-materials').download(...)`) are blocked by database RLS if the user is unenrolled.
- **Signed URL Delivery**:
  - Client downloads call the `bunny-stream-manager` Edge Function (`action: 'getMaterialAccess'`).
  - The function validates active enrollment or admin role before minting a short-lived 5-minute signed URL.
  - External links are validated to require `https://` and open with `noopener,noreferrer`.

---

## 4. TUS Resumable Video Upload & Bunny Stream Integration
- **Direct Streaming to Bunny Stream**:
  - Files never pass through Supabase serverless functions or frontend application servers.
- **5MB Chunking Protocol**:
  - Uses `CHUNK_SIZE = 5 * 1024 * 1024`. Each chunk is sliced and sent via HTTP `PATCH` with the `Upload-Offset` header.
- **Resume & Retry via Remote Offset**:
  - Active upload sessions are cached in `sessionStorage` (`bunny_upload_{filename}_{filesize}`).
  - Before uploading or on retry, the uploader sends an HTTP `HEAD` request to the Bunny upload URL to read the current server-side `Upload-Offset`, avoiding duplicate data transfer.
- **Cancellation & Orphan Cleanup**:
  - If an upload is cancelled before reaching completion, the frontend triggers `bunny-stream-manager` (`action: 'deleteVideo'`) to delete the partial video record in the Bunny library, preventing orphaned video accumulation.
- **Bounded Processing Timeout**:
  - Video transcoding status is polled every 4 seconds with a strict 15-minute timeout (`MAX_PROCESSING_SECONDS = 900`). If transcoding exceeds 15 minutes, the UI enters a timeout state.
- **Interruption Testing**:
  - The uploader UI provides an explicit "Simulate Interruption" test button to verify XHR abort, offset detection via `HEAD`, and seamless resume.
- **Test Clip Exclusion**:
  - Library video picker flags and prohibits selection of the admin-only example clip `Karim Waving.mp4` (`fd9e91b3-4a79-4f2f-8b16-ac07b8818642`).

---

## 5. Release Boundary & WhatsApp Isolation
- **Commit History Context**:
  - The feature branch `feature/course-authoring-delivery` contains 4 commits relative to `main` belonging to pre-existing WhatsApp work (`fa30dff`, `bbc4371`, `e71fad5`, `7a3cd7e`).
- **Release Strategy**:
  - Production deployment of Course Authoring & Delivery must **not** include the WhatsApp commits.
  - Deployment must be performed by branching a clean release branch from `origin/main` (e.g. `release/course-authoring-delivery`) and applying only course-related files, or cherry-picking/squashing exclusively course CMS commits.

---

## 6. Publish Checklist & PayTabs Separation
- **Publish Readiness Checklist**:
  - Before setting status to `published`, the admin UI validates:
    1. Valid kebab-case slug identifier.
    2. Valid cover image thumbnail.
    3. At least one learning outcome.
    4. At least one module with at least one lesson.
    5. All lessons have assigned videos (or preview status) and valid titles.
- **Pricing & Payment Scope**:
  - Display price field in `/admin/courses` is for catalog presentation only.
  - A persistent notice confirms that PayTabs checkout integration is wired separately.
