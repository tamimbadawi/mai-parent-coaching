import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  BarChart3,
  CheckCircle,
  Play,
  FileText,
  Lock,
  ArrowRight,
  Star,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import SecureBunnyPlayer from '../../components/media/SecureBunnyPlayer';
import { useAuth } from '../../context/AuthContext';
import { fetchCourseById } from '../../lib/courses';
import { supabase } from '../../lib/supabase';
import type { Course, Resource } from '../../types';

const levelColors: Record<string, string> = {
  Beginner: 'bg-sage/10 text-sage-dark',
  Intermediate: 'bg-dusty-blue/10 text-dusty-blue-dark',
  Advanced: 'bg-terracotta/10 text-terracotta-dark',
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isEnrolled } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [downloadingMatId, setDownloadingMatId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    let mounted = true;
    const loadCourse = async () => {
      if (!id) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const { course: data, error } = await fetchCourseById(id, isAdmin);
        if (mounted) {
          if (error) {
            setErrorMsg(error);
            setCourse(null);
          } else {
            setErrorMsg(null);
            setCourse(data);
            // Pre-select first lesson if available and user is enrolled
            if (data && (isEnrolled(data.id) || isAdmin)) {
              const firstLesson = data.modules[0]?.videos[0];
              if (firstLesson) {
                setSelectedLessonId(firstLesson.id);
              }
            }
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadCourse();
    return () => {
      mounted = false;
    };
  }, [id, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-warm-gray">
        <Loader2 className="h-8 w-8 animate-spin text-sage mb-2" />
        <p className="text-sm">Loading course details...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-terracotta/20 shadow-sm">
          <AlertCircle className="h-10 w-10 text-terracotta mx-auto mb-3" />
          <h1 className="font-serif text-2xl text-charcoal mb-2">Service Unavailable</h1>
          <p className="text-warm-gray text-sm mb-6">{errorMsg}</p>
          <Link to="/courses" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sage text-white text-sm font-medium hover:bg-sage-dark transition-colors">
            Return to Courses
          </Link>
        </div>
      </div>
    );
  }

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
  const enrolled = isEnrolled(course.id) || isAdmin;

  const allLessons = course.modules.flatMap((module) => module.videos);
  const selectedLesson = allLessons.find((video) => video.id === selectedLessonId);
  const canWatchSelected = selectedLesson && (enrolled || selectedLesson.is_preview);

  const handleOpenMaterial = async (mat: Resource) => {
    if (mat.type === 'link' || mat.external_url) {
      const targetUrl = mat.external_url || mat.url;
      if (targetUrl && targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    setDownloadingMatId(mat.id);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-stream-manager', {
        body: { action: 'getMaterialAccess', materialId: mat.id },
      });

      if (error || !data?.url) {
        alert(data?.error || 'Could not access this material.');
      } else {
        window.open(data.url, '_blank');
      }
    } catch {
      alert('Error requesting file download.');
    } finally {
      setDownloadingMatId(null);
    }
  };

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-transparent" />
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
              {course.status === 'draft' && (
                <span className="bg-amber-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Admin Draft View
                </span>
              )}
            </div>
            <h1 className="font-course text-3xl md:text-4xl text-white">{course.title}</h1>
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
                <p className="text-warm-gray text-lg leading-relaxed mb-8">
                  {course.short_description || course.description}
                </p>

                {/* Video Player for Selected Lesson */}
                {canWatchSelected && (selectedLesson.bunnyVideoId || selectedLesson.bunny_video_id) ? (
                  <div className="mb-10 rounded-[28px] border border-beige bg-cream p-5 shadow-xs">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-sage" />
                        <h3 className="font-serif text-lg font-medium text-charcoal">{selectedLesson.title}</h3>
                      </div>
                      <span className="text-xs text-warm-gray">{selectedLesson.duration}</span>
                    </div>

                    <SecureBunnyPlayer
                      key={selectedLesson.id}
                      request={{ action: 'getPlayback', courseId: course.id, lessonId: selectedLesson.id }}
                      title={selectedLesson.title}
                    />

                    {selectedLesson.description && (
                      <div className="mt-4 pt-4 border-t border-beige/60 text-xs leading-relaxed text-warm-gray">
                        <p className="font-medium text-charcoal mb-1">Lesson Notes</p>
                        <p>{selectedLesson.description}</p>
                      </div>
                    )}

                    {/* Lesson Materials */}
                    {selectedLesson.materials && selectedLesson.materials.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-beige/60">
                        <p className="font-medium text-xs text-charcoal mb-2.5">Lesson Downloads & Materials</p>
                        <div className="space-y-2">
                          {selectedLesson.materials.map((mat) => (
                            <div
                              key={mat.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-beige/60 bg-white px-3.5 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {mat.type === 'link' ? (
                                  <Globe className="h-4 w-4 text-dusty-blue shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-sage-dark shrink-0" />
                                )}
                                <span className="font-medium text-charcoal truncate">{mat.title}</span>
                              </div>

                              <button
                                type="button"
                                disabled={downloadingMatId === mat.id}
                                onClick={() => handleOpenMaterial(mat)}
                                className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold text-sage-dark hover:bg-sage/25 disabled:opacity-50 transition"
                              >
                                {downloadingMatId === mat.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : mat.type === 'link' ? (
                                  <>
                                    <ExternalLink className="h-3 w-3" /> Open Link
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-3 w-3" /> Download
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Outcomes */}
                {course.outcomes.length > 0 && (
                  <div className="mb-10">
                    <h2 className="font-serif text-2xl text-charcoal mb-4">What You'll Learn</h2>
                    <div className="space-y-3">
                      {course.outcomes.map((o, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-sage shrink-0 mt-0.5" />
                          <span className="text-warm-gray">{o}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Curriculum */}
                <h2 className="font-serif text-2xl text-charcoal mb-4">Course Curriculum</h2>
                <div className="space-y-4">
                  {course.modules.length > 0 ? (
                    course.modules.map((mod, modIdx) => (
                      <div key={mod.id} className="bg-cream rounded-2xl p-6 border border-beige/50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-charcoal border border-beige">
                              {modIdx + 1}
                            </span>
                            <h3 className="font-course text-lg text-charcoal">{mod.title}</h3>
                          </div>
                          <span className="text-soft-gray text-sm">{mod.duration}</span>
                        </div>

                        <div className="space-y-3">
                          {mod.videos.map((v) => {
                            const isSelected = v.id === selectedLessonId;
                            const canAccess = enrolled || v.is_preview;
                            const hasVideo = Boolean(v.bunnyVideoId || v.bunny_video_id);

                            return (
                              <div
                                key={v.id}
                                className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-sm transition ${
                                  isSelected
                                    ? 'border-sage bg-sage/10'
                                    : 'border-beige/40 bg-white/60 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Play className="w-4 h-4 text-sage shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-charcoal truncate">{v.title}</span>
                                      {v.is_preview && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.2 text-[10px] font-medium text-sky-800">
                                          <Eye className="h-2.5 w-2.5" /> Free Preview
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-soft-gray">{v.duration}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {canAccess && hasVideo ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLessonId(v.id)}
                                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-xs transition ${
                                        isSelected
                                          ? 'bg-sage-dark text-white'
                                          : 'bg-sage text-white hover:bg-sage-dark'
                                      }`}
                                    >
                                      {isSelected ? 'Watching' : 'Watch'}
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-warm-gray">
                                      <Lock className="h-3.5 w-3.5 text-soft-gray" />
                                      <span className="hidden sm:inline">Locked</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Module Resources */}
                          {mod.resources.map((r) => {
                            const canAccess = enrolled || !r.is_enrolled_only;
                            return (
                              <div
                                key={r.id}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-beige/40 bg-white/40 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {r.type === 'link' ? (
                                    <Globe className="w-4 h-4 text-dusty-blue shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-sage-dark shrink-0" />
                                  )}
                                  <span className="text-charcoal font-medium truncate">{r.title}</span>
                                </div>

                                {canAccess ? (
                                  <button
                                    type="button"
                                    disabled={downloadingMatId === r.id}
                                    onClick={() => handleOpenMaterial(r)}
                                    className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2.5 py-1 text-xs font-semibold text-sage-dark hover:bg-sage/25"
                                  >
                                    {downloadingMatId === r.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : r.type === 'link' ? (
                                      <>
                                        <ExternalLink className="h-3 w-3" /> Link
                                      </>
                                    ) : (
                                      <>
                                        <Download className="h-3 w-3" /> Get File
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-soft-gray" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-cream rounded-2xl p-8 border border-beige/50 text-center">
                      <Lock className="w-8 h-8 text-soft-gray mx-auto mb-3" />
                      <p className="text-warm-gray">Full curriculum will be available upon enrollment.</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <AnimatedSection delay={0.2}>
                <div className="bg-cream rounded-2xl p-6 border border-beige/50 sticky top-28 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-terracotta fill-terracotta" />
                    <span className="text-charcoal font-medium">4.9 (Evidence-based program)</span>
                  </div>
                  <div className="font-serif text-4xl text-charcoal mb-2">${course.price}</div>
                  <p className="text-soft-gray text-sm mb-6">One-time payment. Lifetime access.</p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <BookOpen className="w-4 h-4 text-sage" /> {course.lessons} lessons
                    </div>
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <Clock className="w-4 h-4 text-sage" /> {course.duration}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <BarChart3 className="w-4 h-4 text-sage" /> {course.level}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-warm-gray">
                      <CheckCircle className="w-4 h-4 text-sage" /> Certificate of completion
                    </div>
                  </div>

                  {isPaidCourse && !user ? (
                    <div className="mb-4 rounded-2xl border border-beige bg-white p-4 text-sm text-warm-gray">
                      <p className="font-medium text-charcoal">Login to access this course</p>
                      <p className="mt-2 text-xs">Sign in to view paid course content and track your progress.</p>
                      <button
                        type="button"
                        onClick={() => navigate('/auth/login', { state: { from: `/courses/${course.id}` } })}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-white hover:bg-sage-dark"
                      >
                        Sign in <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}

                  {isPaidCourse && user && !enrolled ? (
                    <div className="mb-4 rounded-2xl border border-beige bg-white p-4 text-sm text-warm-gray">
                      <p className="font-medium text-charcoal">Purchase this course</p>
                      <p className="mt-1 text-xs">
                        Enrollment and checkout are being linked to PayTabs. Check with admin for immediate access.
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      if (enrolled) {
                        const first = course.modules[0]?.videos[0];
                        if (first) setSelectedLessonId(first.id);
                      } else if (!user) {
                        navigate('/auth/login', { state: { from: `/courses/${course.id}` } });
                      }
                    }}
                    className="w-full bg-sage text-white px-6 py-3.5 rounded-full font-semibold hover:bg-sage-dark transition-all inline-flex items-center justify-center gap-2 mb-3 shadow-xs"
                  >
                    {enrolled ? 'Continue Learning' : 'Enroll Now'} <ArrowRight className="w-4 h-4" />
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
