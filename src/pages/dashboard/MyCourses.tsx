import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { courses } from '../../data/content';
import { cn } from '../../lib/utils';
import DashboardLayout from './DashboardLayout';

const MyCourses = (): JSX.Element => {
  const { enrollments } = useAuth();
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  const enrolledCourses = courses.filter((course) =>
    enrollments.some((enrollment) => enrollment.course_id === course.id)
  );

  return (
    <DashboardLayout
      activeTab="courses"
      courseCount={enrollments.length}
    >
      <div className="h-full flex flex-col justify-between min-h-0 gap-3 overflow-hidden">
        {/* Header Bar with Standard Fonts & Actions */}
        <div className="flex items-center justify-between rounded-2xl border border-beige/80 bg-white/90 px-4 py-2 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-sage-dark" />
            <h1 className="font-serif text-lg sm:text-xl text-charcoal font-medium">My Courses</h1>
            <span className="hidden sm:inline-block rounded-full bg-sage/15 px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
              {enrolledCourses.length} enrolled
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 rounded-xl border border-beige/80 bg-cream/70 p-1">
            {(['all', 'in-progress', 'completed'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition',
                  filter === option ? 'bg-sage text-white shadow-xs' : 'text-warm-gray hover:text-charcoal'
                )}
              >
                {option === 'all' ? 'All Courses' : option === 'in-progress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Content Area */}
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {enrolledCourses.length > 0 ? (
            <div className="grid gap-3.5 md:grid-cols-2 flex-1 min-h-0">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="overflow-hidden rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md shadow-xs transition hover:border-sage/40 flex flex-col justify-between p-3.5"
                >
                  <div className="flex gap-3 items-start">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-24 w-32 rounded-xl object-cover border border-beige/60 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                        {course.category}
                      </span>
                      <h3 className="mt-1 font-serif text-sm sm:text-base font-medium text-charcoal leading-snug truncate">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-xs text-warm-gray line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-beige/60 pt-2.5 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-warm-gray">
                      <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
                      <span>Lifetime Access</span>
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark"
                    >
                      <span>Resume</span>
                      <Play className="h-3 w-3 fill-current" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-beige bg-white/80 p-8 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/15 text-sage-dark">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-serif text-lg text-charcoal font-medium">No courses enrolled yet</h3>
              <p className="mt-1 max-w-sm mx-auto text-xs text-warm-gray leading-relaxed">
                Explore evidence-based parent coaching courses designed to help you recover from burnout and build secure connection.
              </p>
              <Link
                to="/courses"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
              >
                Browse Course Catalog
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyCourses;
