import { Link } from 'react-router-dom';
import { ArrowRight, Clock, GraduationCap } from 'lucide-react';
import AnimatedSection from '../ui/AnimatedSection';
import { courses } from '../../data/content';

export default function FeaturedCoursesSection() {
  const featured = courses.slice(0, 2);

  return (
    <section className="bg-cream py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-sage-dark">Learn at your pace</p>
            <h2 className="mt-3 font-serif text-3xl text-charcoal md:text-4xl">Courses for busy parents</h2>
            <p className="mt-4 text-lg leading-relaxed text-warm-gray">
              Structured support you can fit around naps, school runs, and everything in between.
            </p>
          </div>
          <Link
            to="/courses"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-sage-dark transition hover:gap-3"
          >
            Browse all courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </AnimatedSection>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {featured.map((course, index) => (
            <AnimatedSection key={course.id} delay={index * 0.1}>
              <Link to={`/courses/${course.id}`} className="group block overflow-hidden rounded-[1.75rem] bg-ivory ring-1 ring-beige/60 transition hover:shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-ivory/95 px-3 py-1 text-xs font-medium text-charcoal backdrop-blur-sm">
                    {course.category}
                  </span>
                </div>
                <div className="p-6 lg:p-7">
                  <h3 className="font-serif text-xl text-charcoal transition group-hover:text-sage-dark">
                    {course.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-warm-gray">{course.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-soft-gray">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {course.level}
                    </span>
                  </div>
                  {course.outcomes[0] && (
                    <p className="mt-4 text-sm text-charcoal">
                      <span className="font-medium text-sage-dark">Outcome:</span> {course.outcomes[0]}
                    </p>
                  )}
                </div>
              </Link>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
