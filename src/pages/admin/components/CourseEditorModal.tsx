import { useState } from 'react';
import {
  X,
  Check,
  AlertCircle,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { adminSaveCourse } from '../../../lib/courses';
import type { Course, CourseModule } from '../../../types';
import CurriculumBuilder from './CurriculumBuilder';

interface CourseEditorModalProps {
  course: Course | null; // null if creating a new course
  onSave: (savedCourse: Course) => void;
  onClose: () => void;
}

export default function CourseEditorModal({
  course,
  onSave,
  onClose,
}: CourseEditorModalProps): JSX.Element {
  const [savedCourseId, setSavedCourseId] = useState(course?.id ?? null);
  const isNew = !savedCourseId;

  const [activeTab, setActiveTab] = useState<'details' | 'curriculum' | 'outcomes'>('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [slug, setSlug] = useState(course?.id ?? '');
  const [title, setTitle] = useState(course?.title ?? '');
  const [shortDescription, setShortDescription] = useState(course?.short_description ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [thumbnail, setThumbnail] = useState(
    course?.thumbnail ||
      course?.thumbnail_url ||
      'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800'
  );
  const [category, setCategory] = useState(course?.category ?? 'Parenting');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(course?.level ?? 'Beginner');
  const [language, setLanguage] = useState(course?.language ?? 'English');
  const [audience, setAudience] = useState(course?.audience ?? '');
  const [duration, setDuration] = useState(course?.duration || course?.estimated_duration || '6 weeks');
  const [price, setPrice] = useState<number>(course?.price ?? 197);
  const [currency, setCurrency] = useState(course?.currency ?? 'USD');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(course?.status ?? 'draft');
  const [displayOrder, setDisplayOrder] = useState(course?.display_order ?? 0);

  // Lists
  const [outcomes, setOutcomes] = useState<string[]>(
    course?.outcomes ?? ['Make confident decisions', 'Calm difficult moments']
  );
  const [newOutcome, setNewOutcome] = useState('');

  const [prerequisites, setPrerequisites] = useState<string[]>(course?.prerequisites ?? []);
  const [newPrerequisite, setNewPrerequisite] = useState('');

  // Curriculum Modules
  const [modules, setModules] = useState<CourseModule[]>(course?.modules ?? []);

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

  const generateSlugFromTitle = (val: string) => {
    if (isNew && !slug) {
      return val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }
    return slug;
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isNew) {
      setSlug(generateSlugFromTitle(val));
    }
  };

  const handleSave = async (publishImmediate = false, keepEditing = false) => {
    const finalSlug = slug.trim();
    if (!finalSlug) {
      setError('Course ID / slug is required.');
      setActiveTab('details');
      return;
    }
    if (!title.trim()) {
      setError('Course title is required.');
      setActiveTab('details');
      return;
    }

    const targetStatus = keepEditing ? 'draft' : publishImmediate ? 'published' : status;

    if (targetStatus === 'published') {
      const checklistErrors: string[] = [];
      if (!/^[a-z0-9-]+$/.test(finalSlug)) {
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
          checklistErrors.push('At least one lesson is required in the curriculum before publishing.');
        } else {
          const unreadyVideos = modules
            .flatMap((m) => m.videos)
            .filter((v) => !v.bunny_video_id && !v.bunnyVideoId && !v.url);
          if (unreadyVideos.length > 0) {
            checklistErrors.push(
              `${unreadyVideos.length} lesson(s) have no video assigned. Assign videos or set valid preview URLs before publishing.`
            );
          }
        }
      }

      if (checklistErrors.length > 0) {
        setError(`Publish Readiness Checklist:\n• ${checklistErrors.join('\n• ')}`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const { data: saved, error: saveError } = await adminSaveCourse({
        id: finalSlug,
        title: title.trim(),
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
        price,
        currency,
        status: targetStatus,
        display_order: displayOrder,
        outcomes,
        prerequisites,
      });

      if (saveError || !saved) {
        throw new Error(saveError || 'Failed to save course in database.');
      }

      // Preserve existing module objects if in local state
      const updatedCourse: Course = {
        ...saved,
        modules,
      };

      onSave(updatedCourse);
      setSavedCourseId(saved.id);
      if (keepEditing) {
        setStatus('draft');
        setActiveTab('curriculum');
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-[28px] border border-beige bg-ivory shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-beige px-6 py-4 bg-white/90 shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">
              {isNew ? 'Create New Course' : 'Edit Course'}
            </span>
            <h3 className="font-serif text-xl font-medium text-charcoal leading-tight">
              {title.trim() || 'Untitled Course'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-warm-gray hover:bg-beige/60 hover:text-charcoal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-beige px-6 bg-cream/70 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === 'details'
                ? 'border-sage text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Course Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            disabled={!savedCourseId}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === 'curriculum'
                ? 'border-sage text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <Layers className="h-4 w-4" /> Curriculum ({modules.length} modules)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outcomes')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition ${
              activeTab === 'outcomes'
                ? 'border-sage text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <Sparkles className="h-4 w-4" /> Outcomes & Audience
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {isNew && <p className="rounded-xl border border-sage/30 bg-sage/5 p-3 text-xs text-charcoal">Save the course as a draft first. Then add and arrange its videos and materials in Curriculum.</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Course Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Parenting with Confidence"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">
                    Course Slug / ID * {isNew && <span className="text-warm-gray">(Stable URL)</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. parenting-confidence"
                    value={slug}
                    disabled={!isNew}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 font-mono text-xs text-charcoal disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  <p className="mt-1 text-[11px] text-warm-gray">
                    Used for URLs (`/courses/{slug || 'id'}`) and database enrollments.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Short Description</label>
                <input
                  type="text"
                  placeholder="Concise 1-line overview for cards and previews..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Full Course Description</label>
                <textarea
                  rows={4}
                  placeholder="Detailed course description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Cover Image URL</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    className="flex-1 rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt="Preview"
                      className="h-10 w-16 rounded-lg object-cover border border-beige shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
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
                    className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Estimated Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 weeks"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Display Price</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  <p className="mt-1 text-[10px] text-warm-gray">Catalog display price only. PayTabs checkout integration is wired separately.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CURRICULUM */}
          {activeTab === 'curriculum' && (
            <div>
              <CurriculumBuilder
                courseId={savedCourseId!}
                modules={modules}
                onModulesChange={setModules}
              />
            </div>
          )}

          {/* TAB 3: OUTCOMES & AUDIENCE */}
          {activeTab === 'outcomes' && (
            <div className="space-y-6">
              {/* Learning Outcomes */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-charcoal">
                  What Students Will Learn (Outcomes)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Master practical regulation techniques in stressful moments"
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOutcome();
                      }
                    }}
                    className="flex-1 rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="rounded-full bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {outcomes.map((o, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full border border-beige bg-white px-3 py-1 text-xs text-charcoal"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                      <span>{o}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOutcome(idx)}
                        className="text-warm-gray hover:text-terracotta"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-charcoal">Prerequisites</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Willingness to practice daily somatic resets"
                    value={newPrerequisite}
                    onChange={(e) => setNewPrerequisite(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPrerequisite();
                      }
                    }}
                    className="flex-1 rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddPrerequisite}
                    className="rounded-full bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {prerequisites.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full border border-beige bg-white px-3 py-1 text-xs text-charcoal"
                    >
                      <span>{p}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrerequisite(idx)}
                        className="text-warm-gray hover:text-terracotta"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Target Audience</label>
                  <input
                    type="text"
                    placeholder="e.g. Mothers experiencing burnout, parents of toddlers"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal mb-1">Language</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-beige px-6 py-4 bg-white/90 shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-charcoal">Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded-xl border border-beige bg-cream px-3 py-1.5 text-xs text-charcoal focus:outline-none"
            >
              <option value="draft">Draft (Private)</option>
              <option value="published">Published (Live)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-beige px-4 py-2 text-xs font-medium text-warm-gray hover:bg-cream"
            >
              Cancel
            </button>
            {isNew && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false, true)}
                className="rounded-full border border-sage px-4 py-2 text-xs font-medium text-sage-dark hover:bg-sage/10 disabled:opacity-50"
              >
                Save & Add Content
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="rounded-full border border-sage px-4 py-2 text-xs font-medium text-sage-dark hover:bg-sage/10 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-medium text-white hover:bg-sage-dark shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Publish Course
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
