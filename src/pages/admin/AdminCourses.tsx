import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Layers3, PlayCircle, RadioTower, ServerCog, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { courses as staticCourses } from '../../data/content';
import AdminLayout from './AdminLayout';
import type { Course } from '../../types';
import { bunnyStreamConfig } from '../../lib/bunny';
import { Panel, ProgressBar, StatCard } from './components/AdminUI';

interface CourseWithStats extends Course {
  enrollmentCount: number;
  activeCount: number;
}

const AdminCourses = (): JSX.Element => {
  const [coursesWithStats, setCoursesWithStats] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [bunnyStatus, setBunnyStatus] = useState<{ configured: boolean; libraryId: string | null; cdnHostname: string | null; hasApiKey: boolean } | null>(null);
  const [bunnyVideos, setBunnyVideos] = useState<Array<{ guid: string; title: string; status: number; length: number }>>([]);

  const totalActive = coursesWithStats.reduce((sum, course) => sum + course.activeCount, 0);
  const totalLessons = coursesWithStats.reduce((sum, course) => sum + course.lessons, 0);

  useEffect((): void => {
    const fetchStats = async (): Promise<void> => {
      const [enrollmentResponse, bunnyStatusResponse, bunnyVideosResponse] = await Promise.all([
        supabase.from('course_enrollments').select('course_id, status'),
        supabase.functions.invoke('bunny-stream-manager', { body: { action: 'getStatus' } }),
        supabase.functions.invoke('bunny-stream-manager', { body: { action: 'listVideos', page: 1, itemsPerPage: 6 } }),
      ]);

      const enrollments = enrollmentResponse.data;

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

      if (!bunnyStatusResponse.error) {
        setBunnyStatus(bunnyStatusResponse.data as { configured: boolean; libraryId: string | null; cdnHostname: string | null; hasApiKey: boolean });
      }

      if (!bunnyVideosResponse.error) {
        setBunnyVideos((bunnyVideosResponse.data?.videos as Array<{ guid: string; title: string; status: number; length: number }>) ?? []);
      }

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
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={BookOpen} label="Programs" value={coursesWithStats.length} detail="Courses currently available in the catalogue and dashboard." tone="sage" />
            <StatCard icon={GraduationCap} label="Active learners" value={totalActive} detail="Students with live access across every course experience." tone="sky" />
            <StatCard icon={Layers3} label="Lesson inventory" value={totalLessons} detail="Published lessons currently shaping the learning library." tone="amber" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel title="Bunny Stream configuration" eyebrow="Video delivery">
              <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                  icon={RadioTower}
                  label="Frontend embed"
                  value={bunnyStreamConfig.enabled ? 'Ready' : 'Missing'}
                  detail={bunnyStreamConfig.enabled ? `Library ${bunnyStreamConfig.libraryId}` : 'Set VITE_BUNNY_STREAM_LIBRARY_ID in .env'}
                  tone={bunnyStreamConfig.enabled ? 'sage' : 'rose'}
                />
                <StatCard
                  icon={ServerCog}
                  label="Server connection"
                  value={bunnyStatus?.configured ? 'Connected' : 'Pending'}
                  detail={bunnyStatus?.configured ? 'Bunny API credentials are available in Supabase secrets.' : 'Add BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID as project secrets.'}
                  tone={bunnyStatus?.configured ? 'sky' : 'amber'}
                />
              </div>

              <div className="mt-6 rounded-[24px] border border-beige bg-cream p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Current values</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Library ID</p>
                    <p className="mt-1 text-sm font-medium text-charcoal">{(bunnyStatus?.libraryId ?? bunnyStreamConfig.libraryId) || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">CDN hostname</p>
                    <p className="mt-1 text-sm font-medium text-charcoal">{(bunnyStatus?.cdnHostname ?? bunnyStreamConfig.cdnHostname) || 'Not set'}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-warm-gray">
                  Finish setup by adding Bunny environment values locally and Bunny API secrets to the hosted Supabase project. See <span className="font-medium text-charcoal">docs/BUNNY_STREAM_SETUP.md</span> for the exact commands.
                </p>
              </div>
            </Panel>

            <Panel title="Bunny video library" eyebrow="Stream inventory preview">
              {bunnyVideos.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-beige bg-cream px-6 py-10 text-center">
                  <p className="font-serif text-2xl text-charcoal">No Bunny videos loaded yet</p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-warm-gray">
                    Once Bunny Stream secrets are configured, this panel will list recent videos from your library so you can map them into course lessons.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bunnyVideos.map((video) => (
                    <div key={video.guid} className="flex items-center justify-between gap-4 rounded-[24px] border border-beige bg-cream px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sage-dark">
                          <Video className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-charcoal">{video.title}</p>
                          <p className="text-xs text-warm-gray">{video.guid}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-warm-gray">
                        <p>Status: {video.status}</p>
                        <p>{Math.round(video.length / 60)} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Course portfolio" eyebrow="Programs and performance">
            <div className="grid gap-4 xl:grid-cols-2">
              {coursesWithStats.map((course) => {
                const occupancy = course.enrollmentCount === 0 ? 0 : Math.round((course.activeCount / course.enrollmentCount) * 100);

                return (
                  <article
                    key={course.id}
                    className="overflow-hidden rounded-[28px] border border-beige bg-cream"
                  >
                    <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-full min-h-[200px] w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">{course.category}</span>
                          <span className="rounded-full bg-sage px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{course.level}</span>
                        </div>
                        <h3 className="mt-3 font-serif text-2xl text-charcoal">{course.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-warm-gray">{course.description}</p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Lessons</p>
                            <p className="mt-1 text-sm font-medium text-charcoal">{course.lessons}</p>
                          </div>
                          <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Price</p>
                            <p className="mt-1 text-sm font-medium text-charcoal">${course.price}</p>
                          </div>
                          <div className="rounded-2xl border border-beige bg-white px-4 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">Duration</p>
                            <p className="mt-1 text-sm font-medium text-charcoal">{course.duration}</p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-charcoal">Retention health</span>
                            <span className="text-warm-gray">{occupancy}% active</span>
                          </div>
                          <ProgressBar value={occupancy} tone="sage" />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-4 text-sm text-warm-gray">
                          <span className="inline-flex items-center gap-2"><PlayCircle className="h-4 w-4 text-sage-dark" /> {course.enrollmentCount} enrolled</span>
                          <span>{course.activeCount} active now</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourses;
