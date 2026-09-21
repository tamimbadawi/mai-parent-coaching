import { useState } from 'react';
import {
  Video,
  X,
  Play,
  Upload,
  Layers,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { adminSaveLesson } from '../../../lib/courses';
import type { Video as LessonType, CourseMaterial } from '../../../types';
import BunnyVideoUploader from './BunnyVideoUploader';
import BunnyLibraryPicker from './BunnyLibraryPicker';
import LessonMaterialsManager from './LessonMaterialsManager';
import SecureBunnyPlayer from '../../../components/media/SecureBunnyPlayer';

interface LessonEditorModalProps {
  courseId: string;
  moduleId: string;
  lesson?: LessonType | null;
  nextOrder?: number;
  onSave: (saved: LessonType) => void;
  onClose: () => void;
}

export default function LessonEditorModal({
  courseId,
  moduleId,
  lesson,
  nextOrder = 0,
  onSave,
  onClose,
}: LessonEditorModalProps): JSX.Element {
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [duration, setDuration] = useState(lesson?.duration ?? '10 min');
  const [description, setDescription] = useState(lesson?.description ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(lesson?.status ?? 'published');
  const [isPreview, setIsPreview] = useState(lesson?.is_preview ?? false);
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(
    lesson?.bunnyVideoId || lesson?.bunny_video_id || null
  );
  const [materials, setMaterials] = useState<CourseMaterial[]>(lesson?.materials ?? []);

  const [showUploader, setShowUploader] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Lesson title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: saveErr } = await adminSaveLesson({
        ...(lesson?.id ? { id: lesson.id } : {}),
        module_id: moduleId,
        course_id: courseId,
        title: title.trim(),
        description: description.trim() || undefined,
        duration: duration.trim() || '10 min',
        bunny_video_id: bunnyVideoId || undefined,
        is_preview: isPreview,
        status,
        display_order: lesson?.display_order ?? nextOrder,
      });

      if (saveErr || !data) {
        throw new Error(saveErr || 'Failed to save lesson.');
      }

      const updatedLesson: LessonType = {
        id: data.id,
        module_id: data.module_id,
        course_id: data.course_id,
        title: data.title,
        description: data.description || undefined,
        duration: data.duration || '10 min',
        url: '#',
        bunnyVideoId: data.bunny_video_id || undefined,
        bunny_video_id: data.bunny_video_id || undefined,
        is_preview: data.is_preview,
        status: data.status,
        display_order: data.display_order,
        materials,
      };

      onSave(updatedLesson);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving lesson.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[28px] border border-beige bg-ivory shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige px-6 py-4 bg-white/80 shrink-0">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">
              {lesson ? 'Edit Lesson' : 'Create New Lesson'}
            </span>
            <h3 className="font-serif text-lg font-medium text-charcoal leading-tight">
              {title.trim() || 'Untitled Lesson'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-warm-gray hover:bg-beige/60 hover:text-charcoal"
          >
            <X className="h-5 w-5" />
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

          {/* Core Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-charcoal mb-1">Lesson Title *</label>
              <input
                type="text"
                placeholder="e.g. Recognizing Nervous System Triggers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Duration</label>
              <input
                type="text"
                placeholder="e.g. 15 min"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                <option value="published">Published</option>
                <option value="draft">Draft (Hidden from Students)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">Lesson Notes & Summary</label>
            <textarea
              rows={3}
              placeholder="Outline what this lesson covers or include reflection notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-beige bg-white px-3.5 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="previewLessonCheck"
              checked={isPreview}
              onChange={(e) => setIsPreview(e.target.checked)}
              className="rounded border-beige text-sage focus:ring-sage"
            />
            <label htmlFor="previewLessonCheck" className="text-xs text-charcoal cursor-pointer flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-sage-dark" />
              <span>Allow Free Preview (accessible without purchasing the course)</span>
            </label>
          </div>

          {/* Video Attachment Section */}
          <div className="rounded-2xl border border-beige bg-cream p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-sage-dark" />
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">Lesson Video</span>
              </div>
              {bunnyVideoId && !showUploader && (
                <button
                  type="button"
                  onClick={() => setBunnyVideoId(null)}
                  className="text-xs text-terracotta hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Detach Video
                </button>
              )}
            </div>

            {bunnyVideoId ? (
              <div className="rounded-xl border border-beige bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                      <CheckCircle2 className="h-3 w-3" /> Video Attached
                    </span>
                    <p className="mt-1 font-mono text-[11px] text-warm-gray">{bunnyVideoId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(!previewOpen)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-beige bg-cream px-3 py-1.5 text-xs text-charcoal hover:bg-white"
                  >
                    <Play className="h-3 w-3 text-sage" />
                    {previewOpen ? 'Hide Preview' : 'Preview'}
                  </button>
                </div>

                {previewOpen && (
                  <div className="mt-3 pt-3 border-t border-beige/60">
                    <SecureBunnyPlayer
                      request={{ action: 'getAdminPlayback', videoId: bunnyVideoId }}
                      title={title || 'Lesson Preview'}
                    />
                  </div>
                )}
              </div>
            ) : !showUploader ? (
              <div className="rounded-xl border border-dashed border-beige bg-white p-5 text-center">
                <p className="text-xs text-warm-gray mb-3">No video attached to this lesson.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploader(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Video to Bunny
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-beige bg-cream px-3.5 py-1.5 text-xs font-medium text-charcoal hover:bg-white"
                  >
                    <Layers className="h-3.5 w-3.5 text-warm-gray" /> Choose from Library
                  </button>
                </div>
              </div>
            ) : null}

            {showUploader && (
              <BunnyVideoUploader
                lessonTitle={title || 'Lesson Video'}
                onVideoReady={(guid) => {
                  setBunnyVideoId(guid);
                  setShowUploader(false);
                }}
                onCancel={() => setShowUploader(false)}
              />
            )}
          </div>

          {/* Materials Section */}
          <div className="rounded-2xl border border-beige bg-white p-4">
            {lesson?.id ? <LessonMaterialsManager
              courseId={courseId}
              lessonId={lesson.id}
              materials={materials}
              onMaterialsChange={setMaterials}
            /> : <p className="text-xs text-warm-gray">Save this video lesson first, then reopen it to add worksheets, PDFs, files, and links.</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-beige px-6 py-3.5 bg-white/80 shrink-0">
          <div className="text-[11px] text-warm-gray">
            {bunnyVideoId ? 'Video ready' : 'No video attached'} • {materials.length} material(s)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-beige px-4 py-1.5 text-xs font-medium text-warm-gray hover:bg-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Lesson'
              )}
            </button>
          </div>
        </div>
      </div>

      {showPicker && (
        <BunnyLibraryPicker
          currentVideoId={bunnyVideoId ?? undefined}
          onSelect={(guid) => {
            setBunnyVideoId(guid);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
