import { supabase } from './supabase';
import { courses as staticCourses } from '../data/content';
import type { Course, CourseModule, Video, CourseMaterial } from '../types';

interface RawCourseRow {
  id: string;
  title: string;
  short_description: string | null;
  description: string;
  thumbnail_url: string | null;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  audience: string | null;
  prerequisites: string[] | null;
  outcomes: string[] | null;
  estimated_duration: string | null;
  price: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface RawModuleRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration: string | null;
  display_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

interface RawLessonRow {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration: string | null;
  bunny_video_id: string | null;
  is_preview: boolean;
  status: 'draft' | 'published';
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface RawMaterialRow {
  id: string;
  lesson_id: string;
  course_id: string;
  title: string;
  type: 'pdf' | 'worksheet' | 'link' | 'audio' | 'file';
  file_path: string | null;
  external_url: string | null;
  file_size_bytes: number | null;
  display_order: number;
  is_enrolled_only: boolean;
  created_at: string;
  updated_at: string;
}

const DRAFT_COURSES_KEY = 'mai_admin_courses_drafts';

export const getLocalDraftCourses = (): Record<string, Course> => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_COURSES_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLocalDraftCourse = (course: Course): void => {
  try {
    if (typeof window === 'undefined') return;
    const drafts = getLocalDraftCourses();
    drafts[course.id] = {
      ...course,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_COURSES_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.warn('Failed to cache draft locally:', err);
  }
};

export const removeLocalDraftCourse = (courseId: string): void => {
  try {
    if (typeof window === 'undefined') return;
    const drafts = getLocalDraftCourses();
    delete drafts[courseId];
    localStorage.setItem(DRAFT_COURSES_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.warn('Failed to remove local draft:', err);
  }
};

export const mapRawToCourse = (
  c: RawCourseRow,
  modules: RawModuleRow[] = [],
  lessons: RawLessonRow[] = [],
  materials: RawMaterialRow[] = []
): Course => {
  const materialsByLesson: Record<string, CourseMaterial[]> = {};
  for (const mat of materials) {
    if (!materialsByLesson[mat.lesson_id]) materialsByLesson[mat.lesson_id] = [];
    materialsByLesson[mat.lesson_id].push({
      id: mat.id,
      lesson_id: mat.lesson_id,
      course_id: mat.course_id,
      title: mat.title,
      type: mat.type,
      url: mat.external_url || (mat.file_path ? `storage:${mat.file_path}` : '#'),
      file_path: mat.file_path || undefined,
      external_url: mat.external_url || undefined,
      file_size_bytes: mat.file_size_bytes || undefined,
      display_order: mat.display_order,
      is_enrolled_only: mat.is_enrolled_only,
      created_at: mat.created_at,
      updated_at: mat.updated_at,
    });
  }

  // Published lessons require a matching module
  const publishedModuleIds = new Set(modules.map((m) => m.id));

  const lessonsByModule: Record<string, Video[]> = {};
  for (const les of lessons) {
    if (!publishedModuleIds.has(les.module_id)) {
      continue; // Parent module is not published or not found
    }
    if (!lessonsByModule[les.module_id]) lessonsByModule[les.module_id] = [];
    lessonsByModule[les.module_id].push({
      id: les.id,
      module_id: les.module_id,
      course_id: les.course_id,
      title: les.title,
      description: les.description || undefined,
      duration: les.duration || '10 min',
      url: '#',
      bunnyVideoId: les.bunny_video_id || undefined,
      bunny_video_id: les.bunny_video_id || undefined,
      is_preview: les.is_preview,
      status: les.status,
      display_order: les.display_order,
      created_at: les.created_at,
      updated_at: les.updated_at,
      materials: materialsByLesson[les.id] ?? [],
    });
  }

  const courseModules: CourseModule[] = modules.map((m) => {
    const modLessons = lessonsByModule[m.id] ?? [];
    return {
      id: m.id,
      course_id: m.course_id,
      title: m.title,
      description: m.description || undefined,
      duration: m.duration || '30 min',
      display_order: m.display_order,
      status: m.status,
      created_at: m.created_at,
      updated_at: m.updated_at,
      videos: modLessons,
      resources: modLessons.flatMap((l) => l.materials ?? []),
    };
  });

  const totalLessons = courseModules.reduce((acc, m) => acc + m.videos.length, 0);

  return {
    id: c.id,
    title: c.title,
    short_description: c.short_description || undefined,
    description: c.description,
    thumbnail:
      c.thumbnail_url ||
      'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800',
    thumbnail_url: c.thumbnail_url || undefined,
    level: c.level,
    duration: c.estimated_duration || '6 weeks',
    estimated_duration: c.estimated_duration || undefined,
    lessons: totalLessons > 0 ? totalLessons : 1,
    price: Number(c.price) || 0,
    currency: c.currency || 'USD',
    category: c.category,
    language: c.language || 'English',
    audience: c.audience || undefined,
    prerequisites: c.prerequisites || [],
    outcomes: c.outcomes || [],
    status: c.status,
    display_order: c.display_order,
    created_at: c.created_at,
    updated_at: c.updated_at,
    modules: courseModules,
  };
};

/**
 * Public: Fetch published courses with deliberate cutover rules.
 * Does NOT resurrect static courses if the database returns 0 published courses (honors unpublish).
 */
export const fetchPublishedCourses = async (): Promise<{ courses: Course[]; error: string | null }> => {
  try {
    const { data: dbCourses, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'published')
      .order('display_order', { ascending: true });

    if (courseError) {
      // 42P01 or schema cache: Postgres error code for table does not exist (pre-migration development fallback only)
      if (courseError.code === '42P01' || courseError.message?.includes('schema cache')) {
        const localPublished = Object.values(getLocalDraftCourses()).filter((c) => c.status === 'published');
        return { courses: [...staticCourses, ...localPublished], error: null };
      }
      // Actual database outage: report the error rather than silently showing potentially withdrawn content
      return { courses: [], error: 'The course catalog is currently unavailable. Please try again shortly.' };
    }

    // Database query succeeded! If 0 courses are published, return empty array (do NOT resurrect static courses!)
    if (!dbCourses || dbCourses.length === 0) {
      return { courses: [], error: null };
    }

    const courseIds = dbCourses.map((c) => c.id);

    const [modulesRes, lessonsRes, materialsRes] = await Promise.all([
      supabase
        .from('course_modules')
        .select('*')
        .in('course_id', courseIds)
        .eq('status', 'published')
        .order('display_order', { ascending: true }),
      supabase
        .from('course_lessons')
        .select('*')
        .in('course_id', courseIds)
        .eq('status', 'published')
        .order('display_order', { ascending: true }),
      supabase
        .from('course_materials')
        .select('*')
        .in('course_id', courseIds)
        .order('display_order', { ascending: true }),
    ]);

    const modules = (modulesRes.data ?? []) as RawModuleRow[];
    const lessons = (lessonsRes.data ?? []) as RawLessonRow[];
    const materials = (materialsRes.data ?? []) as RawMaterialRow[];

    const result = (dbCourses as RawCourseRow[]).map((course) => {
      const cModules = modules.filter((m) => m.course_id === course.id);
      const cLessons = lessons.filter((l) => l.course_id === course.id);
      const cMaterials = materials.filter((mat) => mat.course_id === course.id);
      return mapRawToCourse(course, cModules, cLessons, cMaterials);
    });

    return { courses: result, error: null };
  } catch (err) {
    return { courses: [], error: err instanceof Error ? err.message : 'Database communication failure.' };
  }
};

/**
 * Public / Student: Fetch single course by ID with complete curriculum and strict publication check.
 */
export const fetchCourseById = async (
  courseId: string,
  isAdmin = false
): Promise<{ course: Course | null; error: string | null }> => {
  // Check local draft first for admin or published state
  const localDraft = getLocalDraftCourses()[courseId];
  if (localDraft && (isAdmin || localDraft.status === 'published')) {
    return { course: localDraft, error: null };
  }

  try {
    let query = supabase.from('courses').select('*').eq('id', courseId);
    if (!isAdmin) {
      query = query.eq('status', 'published');
    }

    const { data: courseData, error: courseError } = await query.maybeSingle();

    if (courseError) {
      if (courseError.code === '42P01' || courseError.message?.includes('schema cache')) {
        const fallback = staticCourses.find((c) => c.id === courseId);
        return { course: fallback ?? localDraft ?? null, error: null };
      }
      return { course: localDraft ?? null, error: 'Could not reach course service.' };
    }

    // If query returned null, course does NOT exist or is an unpublished draft
    if (!courseData) {
      return { course: localDraft ?? null, error: null };
    }

    let modQuery = supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true });
    let lesQuery = supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true });

    if (!isAdmin) {
      modQuery = modQuery.eq('status', 'published');
      lesQuery = lesQuery.eq('status', 'published');
    }

    const [modulesRes, lessonsRes, materialsRes] = await Promise.all([
      modQuery,
      lesQuery,
      supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseId)
        .order('display_order', { ascending: true }),
    ]);

    const mapped = mapRawToCourse(
      courseData as RawCourseRow,
      (modulesRes.data ?? []) as RawModuleRow[],
      (lessonsRes.data ?? []) as RawLessonRow[],
      (materialsRes.data ?? []) as RawMaterialRow[]
    );

    return { course: mapped, error: null };
  } catch (err) {
    return { course: localDraft ?? null, error: err instanceof Error ? err.message : 'Failed to fetch course.' };
  }
};

/**
 * Admin: Fetch all courses (Draft, Published, Archived) with stats.
 */
export const adminFetchAllCourses = async (): Promise<Course[]> => {
  const localDrafts = Object.values(getLocalDraftCourses());

  let coursesFromDb: Course[] = [];
  try {
    const { data: dbCourses, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .order('display_order', { ascending: true });

    if (courseError) {
      if (courseError.code === '42P01' || courseError.message?.includes('schema cache')) {
        coursesFromDb = staticCourses.map((c) => ({ ...c, status: 'published' as const }));
      } else {
        coursesFromDb = staticCourses.map((c) => ({ ...c, status: 'published' as const }));
      }
    } else if (dbCourses && dbCourses.length > 0) {
      const courseIds = dbCourses.map((c) => c.id);

      const [modulesRes, lessonsRes, materialsRes] = await Promise.all([
        supabase.from('course_modules').select('*').in('course_id', courseIds).order('display_order', { ascending: true }),
        supabase.from('course_lessons').select('*').in('course_id', courseIds).order('display_order', { ascending: true }),
        supabase.from('course_materials').select('*').in('course_id', courseIds).order('display_order', { ascending: true }),
      ]);

      const modules = (modulesRes.data ?? []) as RawModuleRow[];
      const lessons = (lessonsRes.data ?? []) as RawLessonRow[];
      const materials = (materialsRes.data ?? []) as RawMaterialRow[];

      coursesFromDb = (dbCourses as RawCourseRow[]).map((course) => {
        const cModules = modules.filter((m) => m.course_id === course.id);
        const cLessons = lessons.filter((l) => l.course_id === course.id);
        const cMaterials = materials.filter((mat) => mat.course_id === course.id);
        return mapRawToCourse(course, cModules, cLessons, cMaterials);
      });
    } else {
      coursesFromDb = [];
    }
  } catch {
    coursesFromDb = staticCourses.map((c) => ({ ...c, status: 'published' as const }));
  }

  // Merge: local drafts take precedence for matching IDs, or are appended if new
  const courseMap = new Map<string, Course>();
  for (const c of coursesFromDb) {
    courseMap.set(c.id, c);
  }
  for (const d of localDrafts) {
    courseMap.set(d.id, d);
  }

  return Array.from(courseMap.values());
};

/**
 * Admin: Save or update Course metadata with persistent local caching and database resilience.
 */
export const adminSaveCourse = async (
  course: Partial<Course> & { id: string; title: string }
): Promise<{ data: Course | null; error: string | null }> => {
  const existing = getLocalDraftCourses()[course.id] || staticCourses.find((c) => c.id === course.id);

  const updatedCourse: Course = {
    id: course.id.trim(),
    title: course.title.trim(),
    short_description: course.short_description !== undefined ? course.short_description : existing?.short_description,
    description: course.description !== undefined ? course.description : (existing?.description ?? ''),
    thumbnail:
      course.thumbnail ||
      course.thumbnail_url ||
      existing?.thumbnail ||
      'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800',
    thumbnail_url: course.thumbnail || course.thumbnail_url || existing?.thumbnail_url,
    category: course.category || existing?.category || 'Parenting',
    level: course.level || existing?.level || 'Beginner',
    language: course.language || existing?.language || 'English',
    audience: course.audience !== undefined ? course.audience : existing?.audience,
    prerequisites: course.prerequisites || existing?.prerequisites || [],
    outcomes: course.outcomes || existing?.outcomes || [],
    duration: course.duration || course.estimated_duration || existing?.duration || '6 weeks',
    estimated_duration: course.duration || course.estimated_duration || existing?.estimated_duration,
    price: course.price !== undefined ? course.price : (existing?.price ?? 0),
    currency: course.currency || existing?.currency || 'USD',
    status: course.status || existing?.status || 'draft',
    display_order: course.display_order !== undefined ? course.display_order : (existing?.display_order ?? 0),
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lessons: course.modules ? course.modules.reduce((sum, m) => sum + m.videos.length, 0) : (existing?.lessons ?? 1),
    modules: course.modules !== undefined ? course.modules : (existing?.modules ?? []),
  };

  // 1. Immediately cache in local draft store so work is NEVER lost
  saveLocalDraftCourse(updatedCourse);

  // 2. Attempt Supabase upsert
  try {
    const payload = {
      id: updatedCourse.id,
      title: updatedCourse.title,
      short_description: updatedCourse.short_description || null,
      description: updatedCourse.description || '',
      thumbnail_url: updatedCourse.thumbnail_url || updatedCourse.thumbnail || null,
      category: updatedCourse.category,
      level: updatedCourse.level,
      language: updatedCourse.language,
      audience: updatedCourse.audience || null,
      prerequisites: updatedCourse.prerequisites,
      outcomes: updatedCourse.outcomes,
      estimated_duration: updatedCourse.estimated_duration || updatedCourse.duration || null,
      price: updatedCourse.price,
      currency: updatedCourse.currency,
      status: updatedCourse.status,
      display_order: updatedCourse.display_order,
      updated_at: updatedCourse.updated_at,
    };

    const { error } = await supabase.from('courses').upsert(payload);
    if (error) {
      return {
        data: updatedCourse,
        error: `Database notice: ${error.message}. Changes are safely preserved in draft store.`,
      };
    }
    return { data: updatedCourse, error: null };
  } catch (err) {
    return {
      data: updatedCourse,
      error: `Database notice: ${err instanceof Error ? err.message : 'connection issue'}. Changes are safely preserved in draft store.`,
    };
  }
};

/**
 * Admin: Delete Course with enrollment safety check.
 */
export const adminDeleteCourse = async (
  courseId: string
): Promise<{ error: string | null; requiresArchive?: boolean }> => {
  // Always remove from local drafts
  removeLocalDraftCourse(courseId);

  // Check if any enrollments exist before attempting delete
  const { count, error: countErr } = await supabase
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (!countErr && typeof count === 'number' && count > 0) {
    return {
      error: `Cannot hard delete this course because ${count} student enrollment(s) exist. Please set its status to "Archived" instead to preserve student records while hiding it from the public.`,
      requiresArchive: true,
    };
  }

  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  return { error: error ? error.message : null };
};

/**
 * Admin: Archive Course (hides from catalog, preserves access for enrolled students).
 */
export const adminArchiveCourse = async (courseId: string): Promise<{ error: string | null }> => {
  const localDraft = getLocalDraftCourses()[courseId];
  if (localDraft) {
    saveLocalDraftCourse({ ...localDraft, status: 'archived' });
  }

  const { error } = await supabase
    .from('courses')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', courseId);
  return { error: error ? error.message : null };
};

/**
 * Admin: Save Module with draft cache synchronization.
 */
export const adminSaveModule = async (
  module: Partial<CourseModule> & { course_id: string; title: string }
): Promise<{ data: RawModuleRow | null; error: string | null }> => {
  const moduleId = module.id || crypto.randomUUID();
  const rawRow: RawModuleRow = {
    id: moduleId,
    course_id: module.course_id,
    title: module.title.trim(),
    description: module.description || null,
    duration: module.duration || '30 min',
    display_order: module.display_order ?? 0,
    status: module.status || 'published',
    created_at: module.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Sync to local draft course
  const localDraft = getLocalDraftCourses()[module.course_id];
  if (localDraft) {
    const existingIdx = localDraft.modules.findIndex((m) => m.id === moduleId);
    const existingMod = localDraft.modules[existingIdx];
    const newMod: CourseModule = {
      id: moduleId,
      course_id: module.course_id,
      title: rawRow.title,
      description: rawRow.description || undefined,
      duration: rawRow.duration || '30 min',
      display_order: rawRow.display_order,
      status: rawRow.status,
      created_at: rawRow.created_at,
      updated_at: rawRow.updated_at,
      videos: existingMod?.videos ?? [],
      resources: existingMod?.resources ?? [],
    };
    const updatedModules =
      existingIdx >= 0
        ? localDraft.modules.map((m, i) => (i === existingIdx ? newMod : m))
        : [...localDraft.modules, newMod];
    saveLocalDraftCourse({ ...localDraft, modules: updatedModules });
  }

  try {
    const payload = {
      id: rawRow.id,
      course_id: rawRow.course_id,
      title: rawRow.title,
      description: rawRow.description,
      duration: rawRow.duration,
      display_order: rawRow.display_order,
      status: rawRow.status,
      updated_at: rawRow.updated_at,
    };
    const { data, error } = await supabase.from('course_modules').upsert(payload).select('*').single();
    if (error) {
      return { data: rawRow, error: `Database notice: ${error.message} (Module preserved locally)` };
    }
    return { data: (data as RawModuleRow) ?? rawRow, error: null };
  } catch (err) {
    return {
      data: rawRow,
      error: `Database notice: ${err instanceof Error ? err.message : 'offline'} (Module preserved locally)`,
    };
  }
};

/**
 * Admin: Delete Module.
 */
export const adminDeleteModule = async (
  moduleId: string,
  courseId?: string
): Promise<{ error: string | null }> => {
  if (courseId) {
    const localDraft = getLocalDraftCourses()[courseId];
    if (localDraft) {
      saveLocalDraftCourse({
        ...localDraft,
        modules: localDraft.modules.filter((m) => m.id !== moduleId),
      });
    }
  }

  const { error } = await supabase.from('course_modules').delete().eq('id', moduleId);
  return { error: error ? error.message : null };
};

/**
 * Admin: Save Lesson with draft cache synchronization and guaranteed matching course_id.
 */
export const adminSaveLesson = async (
  lesson: Partial<Video> & { module_id: string; course_id: string; title: string }
): Promise<{ data: RawLessonRow | null; error: string | null }> => {
  const lessonId = lesson.id || crypto.randomUUID();
  const rawRow: RawLessonRow = {
    id: lessonId,
    module_id: lesson.module_id,
    course_id: lesson.course_id,
    title: lesson.title.trim(),
    description: lesson.description || null,
    duration: lesson.duration || '10 min',
    bunny_video_id: lesson.bunnyVideoId || lesson.bunny_video_id || null,
    is_preview: lesson.is_preview ?? false,
    status: lesson.status || 'draft',
    display_order: lesson.display_order ?? 0,
    created_at: lesson.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Sync to local draft course
  const localDraft = getLocalDraftCourses()[lesson.course_id];
  if (localDraft) {
    const updatedModules = localDraft.modules.map((m) => {
      if (m.id !== lesson.module_id) return m;
      const lesIdx = m.videos.findIndex((v) => v.id === lessonId);
      const existingLes = m.videos[lesIdx];
      const updatedVideo: Video = {
        id: lessonId,
        module_id: lesson.module_id,
        course_id: lesson.course_id,
        title: rawRow.title,
        description: rawRow.description || undefined,
        duration: rawRow.duration || '10 min',
        url: '#',
        bunnyVideoId: rawRow.bunny_video_id || undefined,
        bunny_video_id: rawRow.bunny_video_id || undefined,
        is_preview: rawRow.is_preview,
        status: rawRow.status,
        display_order: rawRow.display_order,
        created_at: rawRow.created_at,
        updated_at: rawRow.updated_at,
        materials: lesson.materials ?? existingLes?.materials ?? [],
      };
      const newVideos =
        lesIdx >= 0 ? m.videos.map((v, i) => (i === lesIdx ? updatedVideo : v)) : [...m.videos, updatedVideo];
      return { ...m, videos: newVideos };
    });
    saveLocalDraftCourse({ ...localDraft, modules: updatedModules });
  }

  try {
    const payload = {
      id: rawRow.id,
      module_id: rawRow.module_id,
      course_id: rawRow.course_id,
      title: rawRow.title,
      description: rawRow.description,
      duration: rawRow.duration,
      bunny_video_id: rawRow.bunny_video_id,
      is_preview: rawRow.is_preview,
      status: rawRow.status,
      display_order: rawRow.display_order,
      updated_at: rawRow.updated_at,
    };
    const { data, error } = await supabase.from('course_lessons').upsert(payload).select('*').single();
    if (error) {
      return { data: rawRow, error: `Database notice: ${error.message} (Lesson preserved locally)` };
    }
    return { data: (data as RawLessonRow) ?? rawRow, error: null };
  } catch (err) {
    return {
      data: rawRow,
      error: `Database notice: ${err instanceof Error ? err.message : 'offline'} (Lesson preserved locally)`,
    };
  }
};

/**
 * Admin: Delete Lesson.
 */
export const adminDeleteLesson = async (
  lessonId: string,
  courseId?: string,
  moduleId?: string
): Promise<{ error: string | null }> => {
  if (courseId && moduleId) {
    const localDraft = getLocalDraftCourses()[courseId];
    if (localDraft) {
      const updatedModules = localDraft.modules.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          videos: m.videos.filter((v) => v.id !== lessonId),
        };
      });
      saveLocalDraftCourse({ ...localDraft, modules: updatedModules });
    }
  }

  const { error } = await supabase.from('course_lessons').delete().eq('id', lessonId);
  return { error: error ? error.message : null };
};

/**
 * Admin: Save Course Material with draft cache synchronization.
 */
export const adminSaveMaterial = async (
  material: Partial<CourseMaterial> & { lesson_id: string; course_id: string; title: string; type: string },
  moduleId?: string
): Promise<{ data: RawMaterialRow | null; error: string | null }> => {
  const matId = material.id || crypto.randomUUID();
  const rawRow: RawMaterialRow = {
    id: matId,
    lesson_id: material.lesson_id,
    course_id: material.course_id,
    title: material.title.trim(),
    type: material.type as 'pdf' | 'worksheet' | 'link' | 'audio' | 'file',
    file_path: material.file_path || null,
    external_url: material.external_url || (material.url && material.url.startsWith('http') ? material.url : null),
    file_size_bytes: material.file_size_bytes || null,
    display_order: material.display_order ?? 0,
    is_enrolled_only: material.is_enrolled_only ?? true,
    created_at: material.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Sync to local draft course
  const localDraft = getLocalDraftCourses()[material.course_id];
  if (localDraft) {
    const newMat: CourseMaterial = {
      id: matId,
      lesson_id: material.lesson_id,
      course_id: material.course_id,
      title: rawRow.title,
      type: rawRow.type,
      url: rawRow.external_url || (rawRow.file_path ? `storage:${rawRow.file_path}` : '#'),
      file_path: rawRow.file_path || undefined,
      external_url: rawRow.external_url || undefined,
      file_size_bytes: rawRow.file_size_bytes || undefined,
      display_order: rawRow.display_order,
      is_enrolled_only: rawRow.is_enrolled_only,
      created_at: rawRow.created_at,
      updated_at: rawRow.updated_at,
    };

    const updatedModules = localDraft.modules.map((m) => {
      // Find lesson matching lesson_id
      const hasLesson = m.videos.some((v) => v.id === material.lesson_id);
      if (!hasLesson && moduleId && m.id !== moduleId) return m;

      const newVideos = m.videos.map((v) => {
        if (v.id !== material.lesson_id) return v;
        const curMats = v.materials ?? [];
        const matIdx = curMats.findIndex((item) => item.id === matId);
        const updatedMats =
          matIdx >= 0 ? curMats.map((item, idx) => (idx === matIdx ? newMat : item)) : [...curMats, newMat];
        return { ...v, materials: updatedMats };
      });
      return { ...m, videos: newVideos };
    });
    saveLocalDraftCourse({ ...localDraft, modules: updatedModules });
  }

  try {
    const payload = {
      id: rawRow.id,
      lesson_id: rawRow.lesson_id,
      course_id: rawRow.course_id,
      title: rawRow.title,
      type: rawRow.type,
      file_path: rawRow.file_path,
      external_url: rawRow.external_url,
      file_size_bytes: rawRow.file_size_bytes,
      display_order: rawRow.display_order,
      is_enrolled_only: rawRow.is_enrolled_only,
      updated_at: rawRow.updated_at,
    };
    const { data, error } = await supabase.from('course_materials').upsert(payload).select('*').single();
    if (error) {
      return { data: rawRow, error: `Database notice: ${error.message} (Material preserved locally)` };
    }
    return { data: (data as RawMaterialRow) ?? rawRow, error: null };
  } catch (err) {
    return {
      data: rawRow,
      error: `Database notice: ${err instanceof Error ? err.message : 'offline'} (Material preserved locally)`,
    };
  }
};

/**
 * Admin: Delete Course Material.
 */
export const adminDeleteMaterial = async (
  materialId: string,
  filePath?: string,
  courseId?: string
): Promise<{ error: string | null }> => {
  if (courseId) {
    const localDraft = getLocalDraftCourses()[courseId];
    if (localDraft) {
      const updatedModules = localDraft.modules.map((m) => ({
        ...m,
        videos: m.videos.map((v) => ({
          ...v,
          materials: (v.materials ?? []).filter((item) => item.id !== materialId),
        })),
      }));
      saveLocalDraftCourse({ ...localDraft, modules: updatedModules });
    }
  }

  if (filePath) {
    try {
      await supabase.storage.from('course-materials').remove([filePath]);
    } catch {
      // ignore storage error if already deleted
    }
  }

  const { error } = await supabase.from('course_materials').delete().eq('id', materialId);
  return { error: error ? error.message : null };
};
