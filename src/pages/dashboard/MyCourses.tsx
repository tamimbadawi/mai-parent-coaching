import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { courses } from '../../data/content';

const MyCourses = (): JSX.Element => {
  const { enrollments } = useAuth();
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  const enrolledCourses = courses.filter((course) => enrollments.some((enrollment) => enrollment.course_id === course.id));

  return (
    <div className="min-h-screen bg-ivory pt-24">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-beige bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sage-dark">Your learning</p>
              <h1 className="mt-2 font-serif text-3xl text-charcoal">My Courses</h1>
            </div>
            <div className="flex gap-2 rounded-full border border-beige bg-cream p-1">
              {['all', 'in-progress', 'completed'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option as 'all' | 'in-progress' | 'completed')}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${filter === option ? 'bg-sage text-white' : 'text-warm-gray'}`}
                >
                  {option === 'all' ? 'All' : option === 'in-progress' ? 'In Progress' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="overflow-hidden rounded-[24px] border border-beige bg-cream">
                  <img src={course.thumbnail} alt={course.title} className="h-40 w-full object-cover" />
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-charcoal">{course.title}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sage-dark">{course.category}</span>
                    </div>
                    <p className="mt-3 text-sm text-warm-gray">{course.description}</p>
                    <div className="mt-4 h-2 rounded-full bg-white">
                      <div className="h-2 w-2/3 rounded-full bg-sage" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-warm-gray">
                      <span>4/8 lessons completed</span>
                      <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 font-medium text-sage-dark">
                        Continue Learning <Play className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-dashed border-beige bg-cream p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-sage-dark">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-serif text-2xl text-charcoal">No courses yet</h3>
              <p className="mt-2 text-sm text-warm-gray">Enroll in a course to see your progress and resume learning here.</p>
              <Link to="/courses" className="mt-6 inline-flex rounded-full bg-sage px-5 py-3 text-sm font-medium text-white hover:bg-sage-dark">
                Browse Courses
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCourses;
