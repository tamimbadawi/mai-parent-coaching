import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, BookOpen, BarChart3, ArrowRight, Play, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import CTASection from '../../components/ui/CTASection';
import { fetchPublishedCourses } from '../../lib/courses';
import type { Course } from '../../types';

const levelColors: Record<string, string> = {
  Beginner: 'bg-sage/10 text-sage-dark',
  Intermediate: 'bg-dusty-blue/10 text-dusty-blue-dark',
  Advanced: 'bg-terracotta/10 text-terracotta-dark',
};

export default function Courses() {
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { courses: data, error } = await fetchPublishedCourses();
        if (mounted) {
          if (error) {
            setLoadError(error);
          } else {
            setCoursesList(data);
          }
        }
      } catch (err) {
        if (mounted) setLoadError(err instanceof Error ? err.message : 'Failed to load courses.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = ['All', ...new Set(coursesList.map((c) => c.category))];

  const filtered = coursesList.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-dusty-blue-dark text-sm font-medium tracking-wider uppercase">Online Learning</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Learn at Your Own Pace
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Comprehensive courses designed to fit into your busy life. Watch anytime, revisit lessons, and access resources for life.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 bg-ivory border-b border-beige">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soft-gray" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-cream border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedCategory === cat
                      ? 'bg-sage text-white'
                      : 'bg-cream text-warm-gray hover:bg-beige'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section className="py-20 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-warm-gray">
              <Loader2 className="h-8 w-8 animate-spin text-sage mb-2" />
              <p className="text-sm">Loading course catalog...</p>
            </div>
          ) : loadError ? (
            <div className="text-center py-16 max-w-md mx-auto bg-white rounded-2xl border border-terracotta/20 p-8 shadow-xs">
              <AlertCircle className="h-10 w-10 text-terracotta mx-auto mb-3" />
              <h3 className="font-serif text-xl text-charcoal font-medium mb-2">Catalog Temporarily Unavailable</h3>
              <p className="text-warm-gray text-sm mb-6">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((course, i) => (
                  <AnimatedSection key={course.id} delay={i * 0.08}>
                    <CourseCard course={course} />
                  </AnimatedSection>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-warm-gray text-lg">No courses found matching your criteria.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="font-serif text-3xl text-charcoal mb-4">What You Get</h2>
            <p className="text-warm-gray max-w-xl mx-auto">
              Every course is designed with your success in mind.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Play, title: 'Video Lessons', desc: 'Engaging, bite-sized videos' },
              { icon: FileText, title: 'PDFs & Worksheets', desc: 'Downloadable resources' },
              { icon: CheckCircle, title: 'Quizzes', desc: 'Test your knowledge' },
              { icon: BarChart3, title: 'Progress Tracking', desc: 'See your growth' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <AnimatedSection key={f.title} delay={i * 0.1}>
                  <div className="bg-ivory rounded-2xl p-6 text-center border border-beige/50 hover:border-beige hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-sage-dark" />
                    </div>
                    <h3 className="font-medium text-charcoal mb-1">{f.title}</h3>
                    <p className="text-sm text-warm-gray">{f.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      <CTASection
        title="Start Learning Today"
        description="Invest in yourself and your family. Every course comes with lifetime access and a 14-day satisfaction guarantee."
        primaryAction={{ label: 'Browse All Courses', href: '/courses' }}
        secondaryAction={{ label: 'Book a Free Call', href: '/booking' }}
        variant="dusty-blue"
      />
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="bg-cream rounded-2xl overflow-hidden border border-beige/50 hover:border-beige hover:shadow-xl transition-all duration-500 group flex flex-col">
      <div className="relative h-48 overflow-hidden">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800';
          }}
        />
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColors[course.level]}`}>
            {course.level}
          </span>
        </div>
        <div className="absolute bottom-4 right-4 bg-charcoal/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" /> {course.duration}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-soft-gray bg-beige/50 px-2 py-1 rounded-full">{course.category}</span>
          <span className="text-xs text-soft-gray flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {course.lessons} lessons
          </span>
        </div>
        <h3 className="font-course text-xl text-charcoal mb-2 group-hover:text-sage-dark transition-colors">
          {course.title}
        </h3>
        <p className="text-warm-gray text-sm leading-relaxed mb-4 flex-grow">{course.short_description || course.description}</p>
        <div className="space-y-2 mb-4">
          {course.outcomes.map((o) => (
            <div key={o} className="flex items-center gap-2 text-xs text-warm-gray">
              <CheckCircle className="w-3.5 h-3.5 text-sage shrink-0" />
              {o}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-beige">
          <span className="font-serif text-2xl text-charcoal">${course.price}</span>
          <Link
            to={`/courses/${course.id}`}
            className="bg-sage text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-sage-dark transition-all duration-300 inline-flex items-center gap-2"
          >
            Enroll <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
