# Course Authoring & Delivery — Database Schema & Security Model (Revised)

## 1. Relational Database Schema

### `public.courses`
Represents the top-level course entity.
- `id` (text, primary key): Stable slug identifier (e.g. `'parenting-confidence'`).
- `title` (text, not null): Course title.
- `short_description` (text): Concise summary for cards and meta descriptions.
- `description` (text, not null default `''`): Full overview.
- `thumbnail_url` (text): Cover image URL.
- `category` (text, not null default `'Parenting'`): Topic category.
- `level` (text, not null default `'Beginner'` check `in ('Beginner', 'Intermediate', 'Advanced')`).
- `language` (text, not null default `'English'`).
- `audience` (text): Target student persona.
- `prerequisites` (text[] not null default `'{}'`).
- `outcomes` (text[] not null default `'{}'`).
- `estimated_duration` (text): e.g. `'6 weeks'`.
- `price` (numeric(10,2) not null default 0): Display price.
- `currency` (text not null default `'USD'`).
- `status` (text not null default `'draft'` check `in ('draft', 'published', 'archived')`).
- `display_order` (integer not null default 0): Catalog sort order.
- `created_at` (timestamptz not null default `now()`).
- `updated_at` (timestamptz not null default `now()`).

### `public.course_modules`
Represents sections or chapters within a course.
- `id` (text, primary key default `gen_random_uuid()::text`).
- `course_id` (text, not null references `public.courses(id)` on delete cascade).
- `title` (text, not null).
- `description` (text).
- `duration` (text): e.g. `'45 min'`.
- `display_order` (integer not null default 0).
- `status` (text not null default `'published'` check `in ('draft', 'published')`).
- `created_at` (timestamptz not null default `now()`).
- `updated_at` (timestamptz not null default `now()`).
- **Composite Unique Constraint**: `CONSTRAINT course_modules_id_course_id_key UNIQUE (id, course_id)`.

### `public.course_lessons`
Represents individual learning units (videos, textual lessons).
- `id` (text, primary key default `gen_random_uuid()::text`).
- `module_id` (text, not null).
- `course_id` (text, not null references `public.courses(id)` on delete cascade).
- `title` (text, not null).
- `description` (text).
- `duration` (text): e.g. `'12 min'`.
- `bunny_video_id` (text): Bunny Stream video GUID.
- `is_preview` (boolean not null default `false`).
- `status` (text not null default `'draft'` check `in ('draft', 'published')`).
- `display_order` (integer not null default 0).
- `created_at` (timestamptz not null default `now()`).
- `updated_at` (timestamptz not null default `now()`).
- **Composite Unique Constraint**: `CONSTRAINT course_lessons_id_course_id_key UNIQUE (id, course_id)`.
- **Composite Foreign Key**: `CONSTRAINT course_lessons_module_fkey FOREIGN KEY (module_id, course_id) REFERENCES public.course_modules(id, course_id) ON DELETE CASCADE`.

### `public.course_materials`
Represents supplemental documents and links attached to a lesson.
- `id` (text, primary key default `gen_random_uuid()::text`).
- `lesson_id` (text, not null).
- `course_id` (text, not null references `public.courses(id)` on delete cascade).
- `title` (text, not null).
- `type` (text, not null check `in ('pdf', 'worksheet', 'link', 'audio', 'file')`).
- `file_path` (text): Storage path inside private bucket `course-materials`: `{course_id}/{lesson_id}/{filename}`.
- `external_url` (text): HTTPS external URL for web link materials.
- `file_size_bytes` (bigint).
- `display_order` (integer not null default 0).
- `is_enrolled_only` (boolean not null default `true`).
- `created_at` (timestamptz not null default `now()`).
- `updated_at` (timestamptz not null default `now()`).
- **Composite Foreign Key**: `CONSTRAINT course_materials_lesson_fkey FOREIGN KEY (lesson_id, course_id) REFERENCES public.course_lessons(id, course_id) ON DELETE CASCADE`.

---

## 2. Hard Deletion Guard Trigger

```sql
create or replace function public.prevent_course_deletion_with_enrollments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.course_enrollments
    where course_id = old.id
  ) then
    raise exception 'Cannot hard delete course "%" because student enrollments exist. Set status to "archived" instead.', old.id;
  end if;
  return old;
end;
$$;

create trigger trigger_prevent_course_deletion
  before delete on public.courses
  for each row
  execute function public.prevent_course_deletion_with_enrollments();
```

---

## 3. Row Level Security (RLS) Matrix

| Table | Operation | Role | Policy Rule |
|---|---|---|---|
| `courses` | SELECT | Public | `status = 'published'` |
| `courses` | ALL | Admin | `public.is_admin() = true` |
| `course_modules` | SELECT | Public | `status = 'published' AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.status = 'published')` |
| `course_modules` | ALL | Admin | `public.is_admin() = true` |
| `course_lessons` | SELECT | Public | `status = 'published' AND EXISTS (SELECT 1 FROM course_modules m JOIN courses c ON c.id = m.course_id WHERE m.id = course_lessons.module_id AND m.course_id = course_lessons.course_id AND m.status = 'published' AND c.status = 'published')` |
| `course_lessons` | ALL | Admin | `public.is_admin() = true` |
| `course_materials` | SELECT | Public/Enrolled | Parent lesson, module, and course are published AND (`NOT is_enrolled_only` OR user has active enrollment in `course_id`) |
| `course_materials` | ALL | Admin | `public.is_admin() = true` |

---

## 4. Private Storage Bucket & Storage Objects RLS

- **Bucket**: `course-materials` (`public: false`).
- **Path Structure**: `{course_id}/{lesson_id}/{filename}`
- **Storage Policies on `storage.objects`**:
  1. **Admin Full Management**:
     ```sql
     CREATE POLICY "Admins can manage course materials files"
       ON storage.objects FOR ALL
       USING (bucket_id = 'course-materials' AND public.is_admin())
       WITH CHECK (bucket_id = 'course-materials' AND public.is_admin());
     ```
  2. **Enrolled Student Direct Read**:
     ```sql
     CREATE POLICY "Enrolled students can read course materials files"
       ON storage.objects FOR SELECT
       USING (
         bucket_id = 'course-materials' AND (
           public.is_admin() OR (
             auth.role() = 'authenticated' AND
             EXISTS (
               SELECT 1 FROM public.course_enrollments e
               WHERE e.user_id = auth.uid()
                 AND e.course_id = (storage.foldername(name))[1]
                 AND e.status = 'active'
             )
           )
         )
       );
     ```
