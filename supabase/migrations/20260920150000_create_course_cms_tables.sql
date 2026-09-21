-- Migration: Create Course Authoring and Delivery CMS Tables (Hardened)
-- Date: 2026-09-20 15:00:00

-- 1. Courses Table
create table if not exists public.courses (
  id text primary key, -- e.g. 'parenting-confidence' (stable slug identifier)
  title text not null,
  short_description text,
  description text not null default '',
  thumbnail_url text,
  category text not null default 'Parenting',
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  language text not null default 'English',
  audience text,
  prerequisites text[] not null default '{}',
  outcomes text[] not null default '{}',
  estimated_duration text,
  price numeric(10, 2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Course Modules Table
create table if not exists public.course_modules (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  duration text,
  display_order integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_modules_id_course_id_key unique (id, course_id)
);

-- 3. Course Lessons Table (Enforcing matching course_id with parent module)
create table if not exists public.course_lessons (
  id text primary key default gen_random_uuid()::text,
  module_id text not null,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  duration text,
  bunny_video_id text, -- Bunny Stream video GUID
  is_preview boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_lessons_id_course_id_key unique (id, course_id),
  constraint course_lessons_module_fkey foreign key (module_id, course_id)
    references public.course_modules(id, course_id) on delete cascade
);

-- 4. Course Materials Table (Enforcing matching course_id with parent lesson)
create table if not exists public.course_materials (
  id text primary key default gen_random_uuid()::text,
  lesson_id text not null,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  type text not null check (type in ('pdf', 'worksheet', 'link', 'audio', 'file')),
  file_path text, -- storage path inside 'course-materials' private bucket: e.g. <course_id>/<lesson_id>/<file>
  external_url text, -- HTTPS link for external web materials
  file_size_bytes bigint,
  display_order integer not null default 0,
  is_enrolled_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_materials_lesson_fkey foreign key (lesson_id, course_id)
    references public.course_lessons(id, course_id) on delete cascade
);

-- Indexes for performance
create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_course_modules_course_id on public.course_modules(course_id, display_order);
create index if not exists idx_course_lessons_module_id on public.course_lessons(module_id, display_order);
create index if not exists idx_course_lessons_course_id on public.course_lessons(course_id);
create index if not exists idx_course_materials_lesson_id on public.course_materials(lesson_id, display_order);
create index if not exists idx_course_materials_course_id on public.course_materials(course_id);

-- 5. Protection against accidental deletion of courses with active enrollments
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

drop trigger if exists trigger_prevent_course_deletion on public.courses;
create trigger trigger_prevent_course_deletion
  before delete on public.courses
  for each row
  execute function public.prevent_course_deletion_with_enrollments();

-- Enable RLS
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_materials enable row level security;

-- RLS Policies for courses
create policy "Public can view published courses"
  on public.courses
  for select
  using (status = 'published');

create policy "Admins have full access to courses"
  on public.courses
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- RLS Policies for course_modules (Requires published parent course)
create policy "Public can view published modules of published courses"
  on public.course_modules
  for select
  using (
    status = 'published' and
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.status = 'published'
    )
  );

create policy "Admins have full access to course_modules"
  on public.course_modules
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- RLS Policies for course_lessons (Requires published parent module AND published course)
create policy "Public can view published lessons of published courses"
  on public.course_lessons
  for select
  using (
    status = 'published' and
    exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_lessons.module_id
        and m.course_id = course_lessons.course_id
        and m.status = 'published'
        and c.status = 'published'
    )
  );

create policy "Admins have full access to course_lessons"
  on public.course_lessons
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- RLS Policies for course_materials (Requires published parents and enrollment verification for private files)
create policy "Enrolled students or preview access can view course materials"
  on public.course_materials
  for select
  using (
    exists (
      select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id and m.course_id = l.course_id
      join public.courses c on c.id = l.course_id
      where l.id = course_materials.lesson_id
        and l.course_id = course_materials.course_id
        and l.status = 'published'
        and m.status = 'published'
        and c.status = 'published'
    ) and (
      not is_enrolled_only or
      exists (
        select 1 from public.course_enrollments e
        where e.user_id = auth.uid()
          and e.course_id = course_materials.course_id
          and e.status = 'active'
      )
    )
  );

create policy "Admins have full access to course_materials"
  on public.course_materials
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 6. Create Private Storage Bucket for Course Materials
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

-- Storage RLS Policies (Restricting file access strictly to verified active enrollment or admin)
drop policy if exists "Admins can manage course materials files" on storage.objects;
drop policy if exists "Enrolled students can read course materials files" on storage.objects;

create policy "Admins can manage course materials files"
  on storage.objects
  for all
  using (bucket_id = 'course-materials' and public.is_admin())
  with check (bucket_id = 'course-materials' and public.is_admin());

create policy "Enrolled students can read course materials files"
  on storage.objects
  for select
  using (
    bucket_id = 'course-materials' and (
      public.is_admin() or (
        auth.role() = 'authenticated' and
        exists (
          select 1 from public.course_enrollments e
          where e.user_id = auth.uid()
            and e.course_id = (storage.foldername(name))[1]
            and e.status = 'active'
        )
      )
    )
  );
