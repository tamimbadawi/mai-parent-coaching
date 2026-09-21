import { useEffect, useState, useMemo } from 'react';
import {
  BookOpen,
  GraduationCap,
  Layers3,
  PlayCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { adminFetchAllCourses, adminSaveCourse, adminDeleteCourse, adminArchiveCourse } from '../../lib/courses';
import AdminLayout from './AdminLayout';
import type { Course } from '../../types';
import { Panel, ProgressBar, StatCard } from './components/AdminUI';
import CourseAuthoringWorkspace from './components/CourseAuthoringWorkspace';

interface CourseWithStats extends Course {
  enrollmentCount: number;
  activeCount: number;
}

const AdminCourses = (): JSX.Element => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentMap, setEnrollmentMap] = useState<Record<string, { total: number; active: number }>>({});
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Editor Workspace
  const [editorCourse, setEditorCourse] = useState<Course | null | undefined>(undefined); // undefined = closed, null = new, Course = editing

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCourses, enrollmentResponse] = await Promise.all([
        adminFetchAllCourses(),
        supabase.from('course_enrollments').select('course_id, status'),
      ]);

      setCourses(allCourses);

      const enrollments = enrollmentResponse.data;
      const statsMap: Record<string, { total: number; active: number }> = {};
      for (const e of enrollments ?? []) {
        if (!statsMap[e.course_id]) statsMap[e.course_id] = { total: 0, active: 0 };
        statsMap[e.course_id].total += 1;
        if (e.status === 'active') statsMap[e.course_id].active += 1;
      }
      setEnrollmentMap(statsMap);
    } catch (err) {
      console.error('Failed to load courses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const coursesWithStats: CourseWithStats[] = useMemo(() => {
    return courses.map((c) => ({
      ...c,
      enrollmentCount: enrollmentMap[c.id]?.total ?? 0,
      activeCount: enrollmentMap[c.id]?.active ?? 0,
    }));
  }, [courses, enrollmentMap]);

  const filteredCourses = useMemo(() => {
    return coursesWithStats.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase());

      const cStatus = c.status || 'published';
      const matchesStatus = statusFilter === 'all' || cStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [coursesWithStats, search, statusFilter]);

  const totalActive = coursesWithStats.reduce((sum, course) => sum + course.activeCount, 0);
  const totalLessons = coursesWithStats.reduce((sum, course) => sum + course.lessons, 0);

  const handleTogglePublish = async (course: Course) => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    const actionLabel = newStatus === 'published' ? 'Publish' : 'Unpublish';

    if (!window.confirm(`${actionLabel} "${course.title}"?`)) return;

    const { data: updated, error } = await adminSaveCourse({
      id: course.id,
      title: course.title,
      description: course.description,
      status: newStatus,
    });

    if (error || !updated) {
      alert(`Could not update status: ${error}`);
      return;
    }

    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)));
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${courseTitle}"?`)) {
      return;
    }

    const res = await adminDeleteCourse(courseId);
    if (res.error) {
      if (res.requiresArchive) {
        if (
          window.confirm(
            `${res.error}\n\nWould you like to Archive "${courseTitle}" instead? This hides the course from the public catalogue while preserving dashboard access for enrolled students.`
          )
        ) {
          const { error: arcErr } = await adminArchiveCourse(courseId);
          if (arcErr) {
            alert(`Could not archive: ${arcErr}`);
          } else {
            setCourses((prev) =>
              prev.map((c) => (c.id === courseId ? { ...c, status: 'archived' } : c))
            );
          }
        }
      } else {
        alert(`Could not delete course: ${res.error}`);
      }
      return;
    }

    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const handleCourseSaved = (savedCourse: Course) => {
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === savedCourse.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedCourse;
        return copy;
      }
      return [savedCourse, ...prev];
    });
  };

  return (
    <AdminLayout title="Courses">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Stat Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon={BookOpen}
              label="Programs"
              value={coursesWithStats.length}
              detail="Live and draft courses shaping the learning catalog."
              tone="sage"
            />
            <StatCard
              icon={GraduationCap}
              label="Active learners"
              value={totalActive}
              detail="Students with live access across every course experience."
              tone="sky"
            />
            <StatCard
              icon={Layers3}
              label="Lesson inventory"
              value={totalLessons}
              detail="Structured video and document lessons."
              tone="amber"
            />
          </div>


          {/* COURSE CMS WORKSPACE */}
          <Panel title="Course authoring & portfolio" eyebrow="Management & Delivery">
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-beige">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                    <input
                      type="text"
                      placeholder="Search courses..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-white pl-9 pr-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex rounded-xl border border-beige bg-white p-0.5">
                    {(['all', 'published', 'draft'] as const).map((filterOpt) => (
                      <button
                        key={filterOpt}
                        type="button"
                        onClick={() => setStatusFilter(filterOpt)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                          statusFilter === filterOpt
                            ? 'bg-sage text-white shadow-xs'
                            : 'text-warm-gray hover:text-charcoal'
                        }`}
                      >
                        {filterOpt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorCourse(null)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                >
                  <Plus className="h-4 w-4" /> Create Course
                </button>
              </div>

              {/* Course Grid */}
              {filteredCourses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-beige bg-cream py-16 px-6 text-center">
                  <BookOpen className="h-10 w-10 text-sage mx-auto mb-2" />
                  <h3 className="font-serif text-lg font-medium text-charcoal">No courses found</h3>
                  <p className="mt-1 text-xs text-warm-gray max-w-sm mx-auto">
                    {search || statusFilter !== 'all'
                      ? 'No courses match the active filter or search criteria.'
                      : 'Get started by creating your first course with modules, lessons, and video delivery.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditorCourse(null)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-xs"
                  >
                    <Plus className="h-4 w-4" /> Create Course
                  </button>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {filteredCourses.map((course) => {
                    const isPublished = course.status === 'published';
                    const occupancy =
                      course.enrollmentCount === 0
                        ? 0
                        : Math.round((course.activeCount / course.enrollmentCount) * 100);

                    return (
                      <article
                        key={course.id}
                        className="overflow-hidden rounded-[28px] border border-beige bg-cream flex flex-col justify-between shadow-xs transition hover:border-sage/40"
                      >
                        <div className="grid md:grid-cols-[200px_1fr]">
                          <div className="relative h-48 md:h-full bg-charcoal/10">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute top-3 left-3 flex flex-col gap-1">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-xs ${
                                  isPublished
                                    ? 'bg-sage text-white'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {isPublished ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warm-gray border border-beige">
                                  {course.category}
                                </span>
                                <span className="rounded-full bg-sage/15 px-2.5 py-0.5 text-[10px] font-medium text-sage-dark">
                                  {course.level}
                                </span>
                              </div>

                              <h3 className="mt-2.5 font-serif text-lg font-medium text-charcoal leading-snug">
                                {course.title}
                              </h3>
                              <p className="mt-1 text-xs text-warm-gray line-clamp-2">
                                {course.short_description || course.description}
                              </p>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-beige bg-white p-2 text-center">
                                  <span className="block text-[10px] uppercase text-warm-gray">Modules</span>
                                  <span className="text-xs font-semibold text-charcoal">
                                    {course.modules?.length ?? 0}
                                  </span>
                                </div>
                                <div className="rounded-xl border border-beige bg-white p-2 text-center">
                                  <span className="block text-[10px] uppercase text-warm-gray">Lessons</span>
                                  <span className="text-xs font-semibold text-charcoal">
                                    {course.lessons}
                                  </span>
                                </div>
                                <div className="rounded-xl border border-beige bg-white p-2 text-center">
                                  <span className="block text-[10px] uppercase text-warm-gray">Price</span>
                                  <span className="text-xs font-semibold text-charcoal">
                                    ${course.price}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="mb-1 flex items-center justify-between text-[11px]">
                                  <span className="text-charcoal font-medium">Retention health</span>
                                  <span className="text-warm-gray">{occupancy}% active</span>
                                </div>
                                <ProgressBar value={occupancy} tone="sage" />
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="mt-5 pt-3 border-t border-beige/60 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-warm-gray">
                                <PlayCircle className="h-3.5 w-3.5 text-sage" />
                                <span>{course.enrollmentCount} enrolled</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePublish(course)}
                                  className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                                    isPublished
                                      ? 'border-beige bg-white text-warm-gray hover:text-charcoal'
                                      : 'border-sage bg-sage/15 text-sage-dark hover:bg-sage/25'
                                  }`}
                                >
                                  {isPublished ? 'Unpublish' : 'Publish'}
                                </button>

                                <Link
                                  to={`/courses/${course.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-beige bg-white px-3 py-1 text-xs font-medium text-warm-gray hover:text-charcoal"
                                  title="Preview student course page"
                                >
                                  <Eye className="h-3 w-3" /> Preview
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => setEditorCourse(course)}
                                  className="inline-flex items-center gap-1 rounded-full bg-sage px-3.5 py-1 text-xs font-medium text-white hover:bg-sage-dark shadow-xs"
                                >
                                  <Edit2 className="h-3 w-3" /> Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourse(course.id, course.title)}
                                  className="p-1 text-warm-gray hover:text-terracotta"
                                  title="Delete course"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Course Authoring Workspace */}
      {editorCourse !== undefined && (
        <CourseAuthoringWorkspace
          initialCourse={editorCourse}
          onSaveCourse={handleCourseSaved}
          onClose={() => {
            setEditorCourse(undefined);
            void loadData();
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCourses;
