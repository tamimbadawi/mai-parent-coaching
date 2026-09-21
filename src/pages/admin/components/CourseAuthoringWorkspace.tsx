import { useState } from 'react';
import {
  X,
  Check,
  AlertCircle,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  FolderPlus,
  Eye,
  CheckCircle2,
  ArrowLeft,
  Play,
} from 'lucide-react';
import {
  adminSaveCourse,
  adminSaveModule,
  adminDeleteModule,
} from '../../../lib/courses';
import type { Course, CourseModule, Video as LessonType } from '../../../types';
import CurriculumModuleCard from './CurriculumModuleCard';
import SecureBunnyPlayer from '../../../components/media/SecureBunnyPlayer';

interface CourseAuthoringWorkspaceProps {
  initialCourse: Course | null; // null = creating new course
  onSaveCourse: (savedCourse: Course) => void;
  onClose: () => void;
}

export default function CourseAuthoringWorkspace({
  initialCourse,
  onSaveCourse,
  onClose,
}: CourseAuthoringWorkspaceProps): JSX.Element {
  const isNew = !initialCourse;

  // Active view: 'details' | 'curriculum' | 'outcomes' | 'preview'
  const [activeTab, setActiveTab] = useState<'details' | 'curriculum' | 'outcomes' | 'preview'>('details');

  // Course State
  const [slug, setSlug] = useState(initialCourse?.id ?? '');
  const [title, setTitle] = useState(initialCourse?.title ?? '');
  const [shortDescription, setShortDescription] = useState(initialCourse?.short_description ?? '');
  const [description, setDescription] = useState(initialCourse?.description ?? '');
  const [thumbnail, setThumbnail] = useState(
    initialCourse?.thumbnail ||
      initialCourse?.thumbnail_url ||
      'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800'
  );
  const [category, setCategory] = useState(initialCourse?.category ?? 'Parenting');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(initialCourse?.level ?? 'Beginner');
  const [language] = useState(initialCourse?.language ?? 'English');
  const [audience, setAudience] = useState(initialCourse?.audience ?? '');
  const [duration, setDuration] = useState(initialCourse?.duration || initialCourse?.estimated_duration || '6 weeks');
  const [price, setPrice] = useState<number>(initialCourse?.price ?? 197);
  const [currency] = useState(initialCourse?.currency ?? 'USD');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(initialCourse?.status ?? 'draft');
  const [displayOrder, setDisplayOrder] = useState(initialCourse?.display_order ?? 0);

  // Outcomes & Prerequisites
  const [outcomes, setOutcomes] = useState<string[]>(
    initialCourse?.outcomes ?? ['Make confident decisions', 'Calm difficult moments']
  );
  const [newOutcome, setNewOutcome] = useState('');
  const [prerequisites, setPrerequisites] = useState<string[]>(initialCourse?.prerequisites ?? []);
  const [newPrerequisite, setNewPrerequisite] = useState('');

  // Curriculum Modules
  const [modules, setModules] = useState<CourseModule[]>(initialCourse?.modules ?? []);

  // UI / Status states
  const [saving, setSaving] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNewModuleForm, setShowNewModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDuration, setNewModuleDuration] = useState('45 min');

  // Preview helper states
  const [selectedPreviewLesson, setSelectedPreviewLesson] = useState<LessonType | null>(null);

  // Auto-slug generation from title for new courses
  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isNew && !initialCourse) {
      setSlug(generateSlug(val));
    }
  };

  const handleAddOutcome = () => {
    if (!newOutcome.trim()) return;
    setOutcomes([...outcomes, newOutcome.trim()]);
    setNewOutcome('');
  };

  const handleRemoveOutcome = (idx: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== idx));
  };

  const handleAddPrerequisite = () => {
    if (!newPrerequisite.trim()) return;
    setPrerequisites([...prerequisites, newPrerequisite.trim()]);
    setNewPrerequisite('');
  };

  const handleRemovePrerequisite = (idx: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== idx));
  };

  // Add Module
  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    const effectiveSlug = slug.trim() || generateSlug(title) || 'draft-course';
    const moduleId = crypto.randomUUID();

    const newMod: CourseModule = {
      id: moduleId,
      course_id: effectiveSlug,
      title: newModuleTitle.trim(),
      duration: newModuleDuration.trim() || '45 min',
      display_order: modules.length,
      status: 'published',
      videos: [],
      resources: [],
    };

    const updated = [...modules, newMod];
    setModules(updated);
    setNewModuleTitle('');
    setShowNewModuleForm(false);

    // Persist module
    void adminSaveModule({
      id: moduleId,
      course_id: effectiveSlug,
      title: newMod.title,
      duration: newMod.duration,
      display_order: newMod.display_order,
      status: newMod.status,
    });
  };

  // Update Module
  const handleUpdateModule = (updatedModule: CourseModule) => {
    setModules(modules.map((m) => (m.id === updatedModule.id ? updatedModule : m)));
    const effectiveSlug = slug.trim() || generateSlug(title) || 'draft-course';
    void adminSaveModule({
      id: updatedModule.id,
      course_id: effectiveSlug,
      title: updatedModule.title,
      duration: updatedModule.duration,
      display_order: updatedModule.display_order,
      status: updatedModule.status,
    });
  };

  // Delete Module
  const handleDeleteModule = (moduleId: string) => {
    if (!window.confirm('Delete this module and all of its lessons?')) return;
    setModules(modules.filter((m) => m.id !== moduleId));
    const effectiveSlug = slug.trim() || generateSlug(title) || 'draft-course';
    void adminDeleteModule(moduleId, effectiveSlug);
  };

  // Move Module Up / Down
  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= modules.length) return;

    const copy = [...modules];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;

    const reordered = copy.map((m, idx) => ({ ...m, display_order: idx }));
    setModules(reordered);

    const effectiveSlug = slug.trim() || generateSlug(title) || 'draft-course';
    for (const m of reordered) {
      void adminSaveModule({
        id: m.id,
        course_id: effectiveSlug,
        title: m.title,
        duration: m.duration,
        display_order: m.display_order,
      });
    }
  };

  // Build Course Object
  const buildCourseObject = (targetStatus = status): Course => {
    const effectiveSlug = slug.trim() || generateSlug(title) || 'draft-course';
    const totalLessons = modules.reduce((sum, m) => sum + m.videos.length, 0);

    return {
      id: effectiveSlug,
      title: title.trim() || 'Untitled Course',
      short_description: shortDescription.trim() || undefined,
      description: description.trim(),
      thumbnail: thumbnail.trim(),
      thumbnail_url: thumbnail.trim(),
      category,
      level,
      language,
      audience: audience.trim() || undefined,
      duration,
      estimated_duration: duration,
      lessons: totalLessons > 0 ? totalLessons : 1,
      price,
      currency,
      status: targetStatus,
      display_order: displayOrder,
      outcomes,
      prerequisites,
      modules,
      created_at: initialCourse?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  // Save Progress (Draft or Published)
  const handleSave = async (targetStatus = status) => {
    const effectiveSlug = slug.trim() || generateSlug(title);
    if (!effectiveSlug) {
      setErrorMessage('Course ID / Slug is required.');
      setActiveTab('details');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Course Title is required.');
      setActiveTab('details');
      return;
    }

    // Publish Checklist Validation
    if (targetStatus === 'published') {
      const checklistErrors: string[] = [];
      if (!/^[a-z0-9-]+$/.test(effectiveSlug)) {
        checklistErrors.push('Course slug may only contain lowercase letters, numbers, and hyphens (e.g. parenting-confidence).');
      }
      if (!thumbnail.trim()) {
        checklistErrors.push('A valid cover image is required before publishing.');
      }
      if (outcomes.length === 0) {
        checklistErrors.push('At least one learning outcome is required before publishing.');
      }
      if (modules.length === 0) {
        checklistErrors.push('At least one curriculum module is required before publishing.');
      } else {
        const totalLessons = modules.reduce((sum, m) => sum + m.videos.length, 0);
        if (totalLessons === 0) {
          checklistErrors.push('At least one video lesson is required in the curriculum before publishing.');
        } else {
          const unreadyVideos = modules
            .flatMap((m) => m.videos)
            .filter((v) => !v.bunny_video_id && !v.bunnyVideoId && !v.is_preview);
          if (unreadyVideos.length > 0) {
            checklistErrors.push(
              `${unreadyVideos.length} lesson(s) have no video assigned. Assign videos or set free preview before publishing.`
            );
          }
        }
      }

      if (checklistErrors.length > 0) {
        setErrorMessage(`Publish Readiness Checklist:\n• ${checklistErrors.join('\n• ')}`);
        return;
      }
    }

    setSaving(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    const courseToSave = buildCourseObject(targetStatus);

    try {
      const { data, error } = await adminSaveCourse(courseToSave);

      if (error) {
        setNoticeMessage(error);
      } else {
        setNoticeMessage(
          targetStatus === 'published'
            ? 'Course published successfully!'
            : 'Course draft saved successfully.'
        );
      }

      setStatus(targetStatus);
      if (data) {
        onSaveCourse(data);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error saving course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ivory text-charcoal">
      {/* TOP GLOBAL BAR */}
      <header className="flex items-center justify-between border-b border-beige bg-white px-6 py-3.5 shadow-2xs shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-beige bg-cream/60 text-warm-gray hover:text-charcoal hover:bg-white transition"
            title="Back to courses inventory"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-medium text-charcoal truncate">
                {title.trim() || 'Untitled Course'}
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  status === 'published'
                    ? 'bg-sage/20 text-sage-dark'
                    : status === 'archived'
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="font-mono text-xs text-warm-gray truncate">
              ID: {slug.trim() || '(will be generated from title)'}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'preview' ? 'curriculum' : 'preview')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              activeTab === 'preview'
                ? 'border-sage bg-sage text-white'
                : 'border-beige bg-cream text-charcoal hover:bg-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{activeTab === 'preview' ? 'Exit Preview' : 'Preview'}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave('draft')}
            className="inline-flex items-center gap-1.5 rounded-full border border-beige bg-white px-4 py-1.5 text-xs font-medium text-charcoal hover:bg-cream disabled:opacity-50"
          >
            {saving && status === 'draft' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sage" />
            ) : (
              <Check className="h-3.5 w-3.5 text-sage" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave('published')}
            className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark shadow-2xs disabled:opacity-50"
          >
            {saving && status === 'published' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>Publish Course</span>
          </button>
        </div>
      </header>

      {/* NOTICE & ERROR BANNERS */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 whitespace-pre-line">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {noticeMessage && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-amber-600 hover:text-amber-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* WORKSPACE MAIN BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SECTION NAV */}
        <nav className="w-64 border-r border-beige bg-cream/60 p-4 space-y-1 shrink-0 overflow-y-auto hidden md:block">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition ${
              activeTab === 'details'
                ? 'bg-sage text-white shadow-2xs font-semibold'
                : 'text-warm-gray hover:text-charcoal hover:bg-white/80'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4" /> Course Details
            </span>
            <span className="text-[10px] opacity-70">1</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition ${
              activeTab === 'curriculum'
                ? 'bg-sage text-white shadow-2xs font-semibold'
                : 'text-warm-gray hover:text-charcoal hover:bg-white/80'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers className="h-4 w-4" /> Curriculum & Modules
            </span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
              {modules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outcomes')}
            className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition ${
              activeTab === 'outcomes'
                ? 'bg-sage text-white shadow-2xs font-semibold'
                : 'text-warm-gray hover:text-charcoal hover:bg-white/80'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4" /> Outcomes & Audience
            </span>
            <span className="text-[10px] opacity-70">3</span>
          </button>

          <div className="pt-4 border-t border-beige/60 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition ${
                activeTab === 'preview'
                  ? 'bg-sage text-white shadow-2xs font-semibold'
                  : 'text-warm-gray hover:text-charcoal hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Eye className="h-4 w-4" /> Student Preview
              </span>
            </button>
          </div>
        </nav>

        {/* CENTER CONTENT CANVAS */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-ivory">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* TAB 1: COURSE DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-xl font-medium text-charcoal">Course Overview & Details</h3>
                  <p className="text-xs text-warm-gray mt-1">
                    Set up title, stable URL slug, pricing, duration, and overview descriptions.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 rounded-2xl border border-beige bg-white p-6 shadow-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Parenting with Confidence"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Course Slug / ID * <span className="text-warm-gray">(Stable URL)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. parenting-confidence"
                      value={slug}
                      disabled={!isNew}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3.5 py-2 font-mono text-xs text-charcoal disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    >
                      <option value="Parenting">Parenting</option>
                      <option value="Wellness">Wellness</option>
                      <option value="Child Development">Child Development</option>
                      <option value="Neuroscience">Neuroscience</option>
                      <option value="Masterclass">Masterclass</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Level</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as typeof level)}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 6 weeks"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Display Price ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                    <p className="mt-1 text-[10px] text-warm-gray">
                      Catalog display price only. PayTabs checkout integration is wired separately.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal mb-1">Display Order</label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(Number(e.target.value))}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-charcoal mb-1">Cover Image URL</label>
                    <input
                      type="url"
                      placeholder="https://images.pexels.com/..."
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                    {thumbnail && (
                      <div className="mt-2 h-32 w-48 rounded-xl overflow-hidden border border-beige bg-cream">
                        <img
                          src={thumbnail}
                          alt="Thumbnail preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Short Description (Cards & Meta)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Concise 1-2 sentence hook..."
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 p-3 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-charcoal mb-1">
                      Full Description & Overview
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Detailed course description..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-beige bg-cream/30 p-3 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('curriculum')}
                    className="rounded-full bg-sage px-5 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-2xs"
                  >
                    Continue to Curriculum →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CURRICULUM & MODULES */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-medium text-charcoal">Course Curriculum</h3>
                    <p className="text-xs text-warm-gray mt-1">
                      Organize modules, arrange video lessons in sequence, and add downloadable materials.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewModuleForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-2xs"
                  >
                    <FolderPlus className="h-4 w-4" /> Add Module
                  </button>
                </div>

                {/* Add Module Inline Form */}
                {showNewModuleForm && (
                  <div className="rounded-2xl border border-sage/40 bg-white p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-sm font-medium text-charcoal">Create New Module</h4>
                      <button
                        type="button"
                        onClick={() => setShowNewModuleForm(false)}
                        className="text-xs text-warm-gray hover:text-charcoal"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <div>
                        <label className="block text-xs font-medium text-charcoal mb-1">Module Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Module 1: Foundations of Regulation"
                          value={newModuleTitle}
                          onChange={(e) => setNewModuleTitle(e.target.value)}
                          className="w-full rounded-xl border border-beige bg-cream/40 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-charcoal mb-1">Duration</label>
                        <input
                          type="text"
                          placeholder="45 min"
                          value={newModuleDuration}
                          onChange={(e) => setNewModuleDuration(e.target.value)}
                          className="w-full rounded-xl border border-beige bg-cream/40 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewModuleForm(false)}
                        className="rounded-full border border-beige px-4 py-1.5 text-xs text-warm-gray hover:bg-cream"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!newModuleTitle.trim()}
                        onClick={handleAddModule}
                        className="rounded-full bg-sage px-5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50 shadow-2xs"
                      >
                        Save Module
                      </button>
                    </div>
                  </div>
                )}

                {/* Modules List */}
                {modules.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-beige bg-white/80 p-12 text-center">
                    <FolderPlus className="h-10 w-10 text-sage mx-auto mb-3" />
                    <h4 className="font-serif text-lg font-medium text-charcoal">No Curriculum Modules Yet</h4>
                    <p className="text-xs text-warm-gray mt-1 max-w-md mx-auto mb-4">
                      Every course is structured into chapters and modules. Click "Add Module" above to start adding video lessons and materials.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewModuleForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-2xs"
                    >
                      <FolderPlus className="h-4 w-4" /> Add First Module
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {modules.map((mod, index) => (
                      <CurriculumModuleCard
                        key={mod.id}
                        courseId={slug.trim() || 'draft-course'}
                        module={mod}
                        moduleIndex={index}
                        totalModules={modules.length}
                        onUpdateModule={handleUpdateModule}
                        onDeleteModule={handleDeleteModule}
                        onMoveModule={handleMoveModule}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OUTCOMES & AUDIENCE */}
            {activeTab === 'outcomes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-xl font-medium text-charcoal">Outcomes & Target Audience</h3>
                  <p className="text-xs text-warm-gray mt-1">
                    Clearly articulate what parents will achieve and who this course is designed for.
                  </p>
                </div>

                {/* Learning Outcomes */}
                <div className="rounded-2xl border border-beige bg-white p-6 space-y-4 shadow-xs">
                  <h4 className="font-serif text-sm font-medium text-charcoal">
                    Learning Outcomes & Skills Gained
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Master nervous-system co-regulation techniques"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddOutcome();
                      }}
                      className="flex-1 rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                    <button
                      type="button"
                      onClick={handleAddOutcome}
                      className="rounded-full bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-2xs"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {outcomes.map((outcome, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-beige/60 bg-cream/30 px-3.5 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
                          <span>{outcome}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOutcome(idx)}
                          className="text-warm-gray hover:text-terracotta"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                <div className="rounded-2xl border border-beige bg-white p-6 space-y-4 shadow-xs">
                  <h4 className="font-serif text-sm font-medium text-charcoal">Prerequisites</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Willingness to practice 5 min daily calming exercises"
                      value={newPrerequisite}
                      onChange={(e) => setNewPrerequisite(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddPrerequisite();
                      }}
                      className="flex-1 rounded-xl border border-beige bg-cream/30 px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                    />
                    <button
                      type="button"
                      onClick={handleAddPrerequisite}
                      className="rounded-full bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-2xs"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {prerequisites.map((prereq, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-beige/60 bg-cream/30 px-3.5 py-2 text-xs"
                      >
                        <span>{prereq}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePrerequisite(idx)}
                          className="text-warm-gray hover:text-terracotta"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="rounded-2xl border border-beige bg-white p-6 space-y-2 shadow-xs">
                  <h4 className="font-serif text-sm font-medium text-charcoal">Target Audience</h4>
                  <textarea
                    rows={3}
                    placeholder="e.g. Mothers of toddlers and young children experiencing chronic stress or overwhelm..."
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-cream/30 p-3 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: LIVE PREVIEW */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-dark">
                      Admin Live Preview
                    </span>
                    <h3 className="font-serif text-2xl font-medium text-charcoal">{title || 'Untitled Course'}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sage-dark">
                      ${price} USD
                    </span>
                    <span className="rounded-full bg-cream border border-beige px-3 py-1 text-xs text-warm-gray">
                      {duration}
                    </span>
                  </div>
                </div>

                {/* Video Player Area */}
                <div className="rounded-2xl overflow-hidden border border-beige bg-black">
                  {selectedPreviewLesson?.bunny_video_id ||
                  selectedPreviewLesson?.bunnyVideoId ||
                  modules[0]?.videos[0]?.bunny_video_id ||
                  modules[0]?.videos[0]?.bunnyVideoId ? (
                    <SecureBunnyPlayer
                      key={
                        selectedPreviewLesson?.bunny_video_id ||
                        modules[0]?.videos[0]?.bunny_video_id ||
                        'player'
                      }
                      request={{
                        action: 'getAdminPlayback',
                        videoId:
                          selectedPreviewLesson?.bunny_video_id ||
                          selectedPreviewLesson?.bunnyVideoId ||
                          modules[0]?.videos[0]?.bunny_video_id ||
                          modules[0]?.videos[0]?.bunnyVideoId ||
                          '',
                      }}
                      title={selectedPreviewLesson?.title || modules[0]?.videos[0]?.title || 'Lesson Video'}
                    />
                  ) : (
                    <div className="p-16 text-center text-warm-gray">
                      <Play className="h-10 w-10 text-white/40 mx-auto mb-2" />
                      <p className="text-sm font-medium text-white/80">No video attached to this lesson.</p>
                      <p className="text-xs text-white/50 mt-1">
                        Attach a video via Bunny Stream in Curriculum to preview playback.
                      </p>
                    </div>
                  )}
                </div>

                {/* Curriculum Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-serif text-lg font-medium text-charcoal">Course Curriculum</h4>
                  {modules.map((m, mIdx) => (
                    <div key={m.id} className="rounded-2xl border border-beige bg-white overflow-hidden shadow-xs">
                      <div className="border-b border-beige/60 bg-cream/60 px-4 py-3 flex items-center justify-between">
                        <span className="font-serif text-sm font-medium text-charcoal">
                          Module {mIdx + 1}: {m.title}
                        </span>
                        <span className="text-xs text-warm-gray">{m.videos.length} lessons</span>
                      </div>
                      <div className="divide-y divide-beige/40">
                        {m.videos.map((v, vIdx) => (
                          <div
                            key={v.id}
                            onClick={() => setSelectedPreviewLesson(v)}
                            className={`p-3 text-xs flex items-center justify-between cursor-pointer transition ${
                              selectedPreviewLesson?.id === v.id ? 'bg-sage/10 text-sage-dark' : 'hover:bg-cream/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Play className="h-3.5 w-3.5 text-sage" />
                              <span className="font-medium">
                                {mIdx + 1}.{vIdx + 1} {v.title}
                              </span>
                              {v.is_preview && (
                                <span className="rounded-full bg-sky-100 text-sky-800 px-1.5 py-0.2 text-[9px]">
                                  Preview
                                </span>
                              )}
                            </div>
                            <span className="text-warm-gray">{v.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
