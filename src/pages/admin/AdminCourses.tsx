import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { courses as staticCourses } from '../../data/content';
import AdminLayout from './AdminLayout';
import type { Course } from '../../types';

interface CourseWithStats extends Course {
  enrollmentCount: number;
  activeCount: number;
}

const AdminCourses = (): JSX.Element => {
  const [coursesWithStats, setCoursesWithStats] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect((): void => {
    const fetchStats = async (): Promise<void> => {
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id, status');

      const statsMap: Record<string, { total: number; active: number }> = {};
      for (const e of enrollments ?? []) {
        if (!statsMap[e.course_id]) statsMap[e.course_id] = { total: 0, active: 0 };
        statsMap[e.course_id].total += 1;
        if (e.status === 'active') statsMap[e.course_id].active += 1;
      }

      setCoursesWithStats(
        staticCourses.map((c) => ({
          ...c,
          enrollmentCount: statsMap[c.id]?.total ?? 0,
          activeCount: statsMap[c.id]?.active ?? 0,
        }))
      );
      setLoading(false);
    };
    void fetchStats();
  }, []);

  return (
    <AdminLayout title="Courses">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
        </div>
      ) : (
        <div className="space-y-4">
          {coursesWithStats.map((course) => (
            <div
              key={course.id}
              className="flex flex-col gap-4 rounded-[24px] border border-beige bg-white p-6 shadow-sm sm:flex-row sm:items-center"
            >
              <img
                src={course.thumbnail}
                alt={course.title}
                className="h-20 w-32 shrink-0 rounded-2xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg text-charcoal">{course.title}</h3>
                  <span className="rounded-full bg-sage/10 px-2.5 py-0.5 text-xs text-sage-dark">
                    {course.level}
                  </span>
                </div>
                <p className="mt-1 text-sm text-warm-gray line-clamp-2">{course.description}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-warm-gray">
                  <span>{course.lessons} lessons</span>
                  <span>{course.duration}</span>
                  <span className="font-medium text-charcoal">${course.price}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-6 text-center">
                <div>
                  <p className="font-serif text-2xl text-charcoal">{course.enrollmentCount}</p>
                  <p className="text-xs text-warm-gray">Enrolled</p>
                </div>
                <div>
                  <p className="font-serif text-2xl text-sage-dark">{course.activeCount}</p>
                  <p className="text-xs text-warm-gray">Active</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourses;
