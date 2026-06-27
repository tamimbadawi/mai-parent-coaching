import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, BarChart3, CheckCircle, Play, FileText, Lock, ArrowRight, Star } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import { useAuth } from '../context/AuthContext';
import { courses } from '../data/content';

const levelColors: Record<string, string> = {
  Beginner: 'bg-sage/10 text-sage-dark',
  Intermediate: 'bg-dusty-blue/10 text-dusty-blue-dark',
  Advanced: 'bg-terracotta/10 text-terracotta-dark',
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isEnrolled } = useAuth();
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-charcoal mb-2">Course Not Found</h1>
          <Link to="/courses" className="text-sage-dark hover:text-sage transition-colors">
            Browse All Courses
          </Link>
        </div>
      </div>
    );
  }

  const isPaidCourse = course.price > 0;
  const enrolled = isEnrolled(course.id);

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Courses
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColors[course.level]}`}>
                {course.level}
              </span>
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> {course.duration}
              </span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-white">{course.title}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-16 bg-ivory">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <AnimatedSection>
                <p className="text-warm-gray text-lg leading-relaxed mb-8">{course.description}</p>

                <h2 className="font-serif text-2xl text-charcoal mb-4">What You'll Learn</h2>
                <div className="space-y-3 mb-10">
                  {course.outcomes.map((o) => (
                    <div key={o} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-sage shrink-0 mt-0.5" />
                      <span className="text-warm-gray">{o}</span>
                    </div>
                  ))}
                </div>

                <h2 className="font-serif text-2xl text-charcoal mb-4">Course Curriculum</h2>
                <div className="space-y-4">
                  {course.modules.length > 0 ? (
                    course.modules.map((mod) => (
                      <div key={mod.id} className="bg-cream rounded-2xl p-6 border border-beige/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-charcoal">{mod.title}</h3>
                          <span className="text-soft-gray text-sm">{mod.duration}</span>
                        </div>
                        <div className="space-y-3">
                          {mod.videos.map((v) => (
                            <div key={v.id} className="flex items-center gap-3 text-sm">
                              <Play className="w-4 h-4 text-sage" />
                              <span className="text-warm-gray flex-grow">{v.title}</span>
                              <span className="text-soft-gray">{v.duration}</span>
                            </div>
                          ))}
                          {mod.resources.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 text-sm">
                              <FileText className="w-4 h-4 text-dusty-blue" />
                              <span className="text-warm-gray">{r.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-cream rounded-2xl p-8 border border-beige/50 text-center">
                      <Lock className="w-8 h-8 text-soft-gray mx-auto mb-3" />
                      <p className="text-warm-gray">Full curriculum available upon enrollment.</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <AnimatedSection delay={0.2}>
                <div className="bg-cream rounded-2xl p-6 border border-beige/50 sticky top-28">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-terracotta fill-terracotta" />
                    <span className="text-charcoal font-medium">4.9 (128 reviews)</span>
                  </div>
                  <div className="font-serif text-4xl text-charcoal mb-2">${course.price}</div>
                  <p className="text-soft-gray text-sm mb-6">One-time payment. Lifetime access.</p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <BookOpen className="w-4 h-4" /> {course.lessons} lessons
                    </div>
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <Clock className="w-4 h-4" /> {course.duration}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <BarChart3 className="w-4 h-4" /> {course.level}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <CheckCircle className="w-4 h-4" /> Certificate of completion
                    </div>
                  </div>

                  {isPaidCourse && !user ? (
                    <div className="mb-4 rounded-2xl border border-beige bg-white p-4 text-sm text-warm-gray">
                      <p className="font-medium text-charcoal">Login to access this course</p>
                      <p className="mt-2">Sign in to view paid course content and continue learning.</p>
                      <button type="button" onClick={() => navigate('/auth/login', { state: { from: `/courses/${course.id}` } })} className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-dark">
                        Sign in <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}

                  {isPaidCourse && user && !enrolled ? (
                    <div className="mb-4 rounded-2xl border border-beige bg-white p-4 text-sm text-warm-gray">
                      <p className="font-medium text-charcoal">Purchase this course</p>
                      <p className="mt-2">Enrollment and checkout are coming soon. For now, this is a preview of the course experience.</p>
                    </div>
                  ) : null}

                  <button className="w-full bg-sage text-white px-6 py-4 rounded-full font-medium hover:bg-sage-dark transition-all inline-flex items-center justify-center gap-2 mb-3">
                    {isPaidCourse && user && enrolled ? 'Continue Learning' : 'Enroll Now'} <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-soft-gray text-center">14-day satisfaction guarantee</p>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
