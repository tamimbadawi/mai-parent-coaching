import { useState } from 'react';
import {
  Video as VideoIcon,
  Play,
  Upload,
  Layers,
  FileText,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Eye,
  Plus,
  Link as LinkIcon,
  Check,
  X,
  AlertCircle,
  File,
  Lock,
  Globe,
} from 'lucide-react';
import {
  adminSaveLesson,
  adminDeleteLesson,
  adminSaveMaterial,
  adminDeleteMaterial,
} from '../../../lib/courses';
import { supabase } from '../../../lib/supabase';
import type { CourseModule, Video as LessonType, CourseMaterial } from '../../../types';
import BunnyVideoUploader from './BunnyVideoUploader';
import BunnyLibraryPicker from './BunnyLibraryPicker';
import SecureBunnyPlayer from '../../../components/media/SecureBunnyPlayer';

interface CurriculumModuleCardProps {
  courseId: string;
  module: CourseModule;
  moduleIndex: number;
  totalModules: number;
  onUpdateModule: (updated: CourseModule) => void;
  onDeleteModule: (moduleId: string) => void;
  onMoveModule: (index: number, direction: 'up' | 'down') => void;
}

export default function CurriculumModuleCard({
  courseId,
  module,
  moduleIndex,
  totalModules,
  onUpdateModule,
  onDeleteModule,
  onMoveModule,
}: CurriculumModuleCardProps): JSX.Element {
  // Module title editing
  const [editingModuleTitle, setEditingModuleTitle] = useState(false);
  const [moduleTitle, setModuleTitle] = useState(module.title);

  // Lesson inline states
  const [renamingLessonId, setRenamingLessonId] = useState<string | null>(null);
  const [lessonRenameTitle, setLessonRenameTitle] = useState('');
  const [activeUploaderLessonId, setActiveUploaderLessonId] = useState<string | null>(null);
  const [activePickerLessonId, setActivePickerLessonId] = useState<string | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  // New Lesson form state
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('10 min');
  const [newLessonIsPreview, setNewLessonIsPreview] = useState(false);

  // Materials inline states
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatType, setNewMatType] = useState<'pdf' | 'worksheet' | 'link' | 'file'>('pdf');
  const [newMatLessonId, setNewMatLessonId] = useState<string>(module.videos[0]?.id || '');
  const [newMatEnrolledOnly, setNewMatEnrolledOnly] = useState(true);
  const [newMatExternalUrl, setNewMatExternalUrl] = useState('');
  const [newMatFile, setNewMatFile] = useState<File | null>(null);
  const [uploadingMat, setUploadingMat] = useState(false);
  const [matError, setMatError] = useState<string | null>(null);

  const [renamingMaterialId, setRenamingMaterialId] = useState<string | null>(null);
  const [materialRenameTitle, setMaterialRenameTitle] = useState('');

  // Save Module Title
  const handleSaveModuleTitle = () => {
    if (!moduleTitle.trim()) return;
    onUpdateModule({ ...module, title: moduleTitle.trim() });
    setEditingModuleTitle(false);
  };

  // Add Lesson
  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;

    const nextOrder = module.videos.length;
    const lessonId = crypto.randomUUID();

    const newLessonObj: LessonType = {
      id: lessonId,
      module_id: module.id,
      course_id: courseId,
      title: newLessonTitle.trim(),
      duration: newLessonDuration.trim() || '10 min',
      url: '#',
      is_preview: newLessonIsPreview,
      status: 'published',
      display_order: nextOrder,
      materials: [],
    };

    // Update in parent immediately
    const updatedVideos = [...module.videos, newLessonObj];
    onUpdateModule({ ...module, videos: updatedVideos });

    // Persist to backend / local draft
    void adminSaveLesson({
      id: lessonId,
      module_id: module.id,
      course_id: courseId,
      title: newLessonObj.title,
      duration: newLessonObj.duration,
      is_preview: newLessonObj.is_preview,
      status: newLessonObj.status,
      display_order: nextOrder,
    });

    setNewLessonTitle('');
    setShowAddLesson(false);
  };

  // Move Lesson
  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= module.videos.length) return;

    const copy = [...module.videos];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;

    const reordered = copy.map((v, idx) => ({ ...v, display_order: idx }));
    onUpdateModule({ ...module, videos: reordered });

    // Persist updated order
    for (const v of reordered) {
      void adminSaveLesson({
        id: v.id,
        module_id: module.id,
        course_id: courseId,
        title: v.title,
        duration: v.duration,
        bunny_video_id: v.bunny_video_id || v.bunnyVideoId,
        is_preview: v.is_preview,
        status: v.status,
        display_order: v.display_order,
      });
    }
  };

  // Rename Lesson
  const handleSaveLessonRename = async (lesson: LessonType) => {
    if (!lessonRenameTitle.trim()) return;
    const updatedTitle = lessonRenameTitle.trim();

    const updatedVideos = module.videos.map((v) =>
      v.id === lesson.id ? { ...v, title: updatedTitle } : v
    );
    onUpdateModule({ ...module, videos: updatedVideos });
    setRenamingLessonId(null);

    void adminSaveLesson({
      id: lesson.id,
      module_id: module.id,
      course_id: courseId,
      title: updatedTitle,
      duration: lesson.duration,
      bunny_video_id: lesson.bunny_video_id || lesson.bunnyVideoId,
      is_preview: lesson.is_preview,
      status: lesson.status,
      display_order: lesson.display_order,
    });
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Delete this video lesson and its attached materials?')) return;

    const updatedVideos = module.videos.filter((v) => v.id !== lessonId);
    onUpdateModule({ ...module, videos: updatedVideos });

    void adminDeleteLesson(lessonId, courseId, module.id);
  };

  // Attach Bunny Video ID to Lesson
  const handleAttachVideo = async (lessonId: string, bunnyVideoId: string) => {
    const updatedVideos = module.videos.map((v) =>
      v.id === lessonId ? { ...v, bunnyVideoId, bunny_video_id: bunnyVideoId } : v
    );
    onUpdateModule({ ...module, videos: updatedVideos });
    setActiveUploaderLessonId(null);
    setActivePickerLessonId(null);

    const lesson = updatedVideos.find((v) => v.id === lessonId);
    if (lesson) {
      void adminSaveLesson({
        id: lesson.id,
        module_id: module.id,
        course_id: courseId,
        title: lesson.title,
        duration: lesson.duration,
        bunny_video_id: bunnyVideoId,
        is_preview: lesson.is_preview,
        status: lesson.status,
        display_order: lesson.display_order,
      });
    }
  };

  // Remove Video from Lesson
  const handleRemoveVideo = async (lessonId: string) => {
    const updatedVideos = module.videos.map((v) =>
      v.id === lessonId ? { ...v, bunnyVideoId: undefined, bunny_video_id: undefined } : v
    );
    onUpdateModule({ ...module, videos: updatedVideos });

    const lesson = updatedVideos.find((v) => v.id === lessonId);
    if (lesson) {
      void adminSaveLesson({
        id: lesson.id,
        module_id: module.id,
        course_id: courseId,
        title: lesson.title,
        duration: lesson.duration,
        bunny_video_id: undefined,
        is_preview: lesson.is_preview,
        status: lesson.status,
        display_order: lesson.display_order,
      });
    }
  };

  // Toggle Preview for Lesson
  const handleTogglePreview = async (lesson: LessonType) => {
    const nextPreview = !lesson.is_preview;
    const updatedVideos = module.videos.map((v) =>
      v.id === lesson.id ? { ...v, is_preview: nextPreview } : v
    );
    onUpdateModule({ ...module, videos: updatedVideos });

    void adminSaveLesson({
      id: lesson.id,
      module_id: module.id,
      course_id: courseId,
      title: lesson.title,
      duration: lesson.duration,
      bunny_video_id: lesson.bunny_video_id || lesson.bunnyVideoId,
      is_preview: nextPreview,
      status: lesson.status,
      display_order: lesson.display_order,
    });
  };

  // All materials across this module's lessons
  const allModuleMaterials = module.videos.flatMap((v) =>
    (v.materials || []).map((m) => ({
      ...m,
      lessonTitle: v.title,
      lessonId: v.id,
    }))
  );

  // Add Material
  const handleAddMaterial = async () => {
    setMatError(null);
    if (!newMatTitle.trim()) {
      setMatError('Material title is required.');
      return;
    }

    // Ensure target lesson exists
    let targetLessonId = newMatLessonId;
    if (!targetLessonId && module.videos.length > 0) {
      targetLessonId = module.videos[0].id;
    }

    if (!targetLessonId) {
      // Auto-create a default lesson if none exists
      const newLesId = crypto.randomUUID();
      const autoLesson: LessonType = {
        id: newLesId,
        module_id: module.id,
        course_id: courseId,
        title: `${module.title} - Overview`,
        duration: '10 min',
        url: '#',
        is_preview: false,
        status: 'published',
        display_order: 0,
        materials: [],
      };
      targetLessonId = newLesId;
      module.videos = [autoLesson];
    }

    setUploadingMat(true);

    try {
      let filePath: string | null = null;
      let externalUrl: string | null = null;
      let fileSizeBytes: number | null = null;

      if (newMatType === 'link') {
        if (!newMatExternalUrl.trim() || !newMatExternalUrl.startsWith('https://')) {
          throw new Error('Please enter a valid HTTPS URL (e.g. https://...)');
        }
        externalUrl = newMatExternalUrl.trim();
      } else if (newMatFile) {
        // Upload to private Supabase Storage
        const cleanName = newMatFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${courseId}/${targetLessonId}/${Date.now()}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('course-materials')
          .upload(storagePath, newMatFile, { upsert: true });

        if (uploadErr) {
          throw new Error(`Storage upload notice: ${uploadErr.message}`);
        }

        filePath = storagePath;
        fileSizeBytes = newMatFile.size;
      }

      const matId = crypto.randomUUID();
      const newMaterial: CourseMaterial = {
        id: matId,
        lesson_id: targetLessonId,
        course_id: courseId,
        title: newMatTitle.trim(),
        type: newMatType,
        file_path: filePath || undefined,
        external_url: externalUrl || undefined,
        file_size_bytes: fileSizeBytes || undefined,
        url: externalUrl || (filePath ? `storage:${filePath}` : '#'),
        display_order: allModuleMaterials.length,
        is_enrolled_only: newMatEnrolledOnly,
      };

      // Update module in state
      const updatedVideos = module.videos.map((v) => {
        if (v.id === targetLessonId) {
          return {
            ...v,
            materials: [...(v.materials || []), newMaterial],
          };
        }
        return v;
      });

      onUpdateModule({ ...module, videos: updatedVideos });

      // Persist to backend / local draft
      void adminSaveMaterial(
        {
          id: matId,
          lesson_id: targetLessonId,
          course_id: courseId,
          title: newMaterial.title,
          type: newMaterial.type,
          file_path: filePath || undefined,
          external_url: externalUrl || undefined,
          file_size_bytes: fileSizeBytes || undefined,
          display_order: newMaterial.display_order,
          is_enrolled_only: newMaterial.is_enrolled_only,
        },
        module.id
      );

      // Reset form
      setNewMatTitle('');
      setNewMatExternalUrl('');
      setNewMatFile(null);
      setShowAddMaterial(false);
    } catch (err) {
      setMatError(err instanceof Error ? err.message : 'Error adding material.');
    } finally {
      setUploadingMat(false);
    }
  };

  // Rename Material
  const handleSaveMaterialRename = (matId: string, lessonId: string) => {
    if (!materialRenameTitle.trim()) return;
    const updatedTitle = materialRenameTitle.trim();

    const updatedVideos = module.videos.map((v) => {
      if (v.id === lessonId) {
        return {
          ...v,
          materials: (v.materials || []).map((m) =>
            m.id === matId ? { ...m, title: updatedTitle } : m
          ),
        };
      }
      return v;
    });

    onUpdateModule({ ...module, videos: updatedVideos });
    setRenamingMaterialId(null);

    void adminSaveMaterial(
      {
        id: matId,
        lesson_id: lessonId,
        course_id: courseId,
        title: updatedTitle,
        type: allModuleMaterials.find((m) => m.id === matId)?.type || 'pdf',
      },
      module.id
    );
  };

  // Delete Material
  const handleDeleteMaterial = (matId: string, lessonId: string, filePath?: string) => {
    if (!window.confirm('Delete this material?')) return;

    const updatedVideos = module.videos.map((v) => {
      if (v.id === lessonId) {
        return {
          ...v,
          materials: (v.materials || []).filter((m) => m.id !== matId),
        };
      }
      return v;
    });

    onUpdateModule({ ...module, videos: updatedVideos });

    void adminDeleteMaterial(matId, filePath, courseId);
  };

  // Move Material Up / Down
  const handleMoveMaterial = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= allModuleMaterials.length) return;

    const copy = [...allModuleMaterials];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;

    // Distribute back to their respective lessons with updated order
    const updatedVideos = module.videos.map((v) => {
      const lessonMats = copy
        .filter((m) => m.lessonId === v.id)
        .map((m, idx) => ({
          id: m.id,
          lesson_id: m.lesson_id,
          course_id: m.course_id,
          title: m.title,
          type: m.type,
          file_path: m.file_path,
          external_url: m.external_url,
          file_size_bytes: m.file_size_bytes,
          url: m.url,
          display_order: idx,
          is_enrolled_only: m.is_enrolled_only,
        }));
      return { ...v, materials: lessonMats };
    });

    onUpdateModule({ ...module, videos: updatedVideos });

    for (const v of updatedVideos) {
      for (const m of v.materials || []) {
        void adminSaveMaterial(
          {
            ...m,
            lesson_id: v.id,
            course_id: courseId,
          },
          module.id
        );
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-beige bg-white shadow-xs">
      {/* Module Header Bar */}
      <div className="flex items-center justify-between border-b border-beige/80 bg-cream/70 px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage/20 text-xs font-semibold text-sage-dark shrink-0">
            {moduleIndex + 1}
          </span>

          {editingModuleTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="rounded-xl border border-beige bg-white px-3 py-1 text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <button
                type="button"
                onClick={handleSaveModuleTitle}
                className="rounded-lg bg-sage px-2.5 py-1 text-xs font-medium text-white hover:bg-sage-dark"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingModuleTitle(false)}
                className="text-xs text-warm-gray hover:text-charcoal"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h4 className="font-serif text-base font-medium text-charcoal truncate">{module.title}</h4>
              <span className="text-xs text-warm-gray shrink-0">({module.duration})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={moduleIndex === 0}
            onClick={() => onMoveModule(moduleIndex, 'up')}
            className="p-1.5 text-warm-gray hover:text-charcoal disabled:opacity-30"
            title="Move module up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={moduleIndex === totalModules - 1}
            onClick={() => onMoveModule(moduleIndex, 'down')}
            className="p-1.5 text-warm-gray hover:text-charcoal disabled:opacity-30"
            title="Move module down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditingModuleTitle(true)}
            className="p-1.5 text-warm-gray hover:text-sage-dark"
            title="Rename module"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteModule(module.id)}
            className="p-1.5 text-warm-gray hover:text-terracotta"
            title="Delete module"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* CONTAINER 1: NUMBERED VIDEO LESSONS */}
        <div className="rounded-2xl border border-beige bg-cream/40 p-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-beige/60">
            <div>
              <h5 className="flex items-center gap-2 font-serif text-sm font-medium text-charcoal">
                <VideoIcon className="h-4 w-4 text-sage" /> Video Lessons
              </h5>
              <p className="text-[11px] text-warm-gray">
                Numbered list of lessons in viewing sequence. Attach videos or mark free preview.
              </p>
            </div>
            <span className="rounded-full bg-sage/10 px-2 py-0.5 text-xs font-semibold text-sage-dark">
              {module.videos.length} lesson(s)
            </span>
          </div>

          {/* Lessons List */}
          {module.videos.length === 0 ? (
            <div className="py-5 text-center text-xs text-warm-gray">
              No video lessons in this module yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {module.videos.map((lesson, lesIdx) => {
                const hasVideo = Boolean(lesson.bunnyVideoId || lesson.bunny_video_id);
                const videoId = lesson.bunny_video_id || lesson.bunnyVideoId;
                const isUploaderOpen = activeUploaderLessonId === lesson.id;
                const isPickerOpen = activePickerLessonId === lesson.id;
                const isPreviewing = previewLessonId === lesson.id;

                return (
                  <div
                    key={lesson.id}
                    className="rounded-xl border border-beige/70 bg-white p-3.5 transition hover:border-sage/40 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Lesson Number & Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cream font-mono text-[11px] font-semibold text-charcoal shrink-0 border border-beige">
                          {moduleIndex + 1}.{lesIdx + 1}
                        </span>

                        <div className="min-w-0">
                          {renamingLessonId === lesson.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={lessonRenameTitle}
                                onChange={(e) => setLessonRenameTitle(e.target.value)}
                                className="w-56 rounded-lg border border-beige bg-white px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleSaveLessonRename(lesson);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveLessonRename(lesson)}
                                className="rounded-md bg-sage px-2 py-1 text-[10px] font-medium text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingLessonId(null)}
                                className="text-[10px] text-warm-gray"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs sm:text-sm text-charcoal truncate">
                                {lesson.title}
                              </span>
                              {lesson.is_preview && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 text-sky-800 px-1.5 py-0.2 text-[9px] font-semibold">
                                  <Eye className="h-2.5 w-2.5" /> Preview
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 text-[11px] text-warm-gray mt-0.5">
                            <span>{lesson.duration}</span>
                            <span>•</span>
                            <span>
                              {hasVideo ? (
                                <span className="inline-flex items-center gap-1 text-sage-dark font-medium font-mono text-[10px]">
                                  <Check className="h-3 w-3" /> {videoId?.slice(0, 8)}...
                                </span>
                              ) : (
                                <span className="text-amber-700 font-medium">No video attached</span>
                              )}
                            </span>
                            <span>•</span>
                            <span>{(lesson.materials || []).length} material(s)</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reorder */}
                        <button
                          type="button"
                          disabled={lesIdx === 0}
                          onClick={() => handleMoveLesson(lesIdx, 'up')}
                          className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                          title="Move lesson up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={lesIdx === module.videos.length - 1}
                          onClick={() => handleMoveLesson(lesIdx, 'down')}
                          className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                          title="Move lesson down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>

                        {/* Inline Rename */}
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingLessonId(lesson.id);
                            setLessonRenameTitle(lesson.title);
                          }}
                          className="p-1 text-warm-gray hover:text-sage-dark"
                          title="Rename lesson"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Preview toggle */}
                        <button
                          type="button"
                          onClick={() => void handleTogglePreview(lesson)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
                            lesson.is_preview
                              ? 'bg-sky-100 text-sky-800'
                              : 'border border-beige text-warm-gray hover:text-charcoal'
                          }`}
                          title="Toggle free preview access"
                        >
                          {lesson.is_preview ? 'Preview: On' : 'Preview: Off'}
                        </button>

                        {/* Video Actions */}
                        {hasVideo ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewLessonId(isPreviewing ? null : lesson.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-beige bg-cream/70 px-2.5 py-1 text-[11px] font-medium text-charcoal hover:bg-white"
                            >
                              <Play className="h-3 w-3 text-sage" /> {isPreviewing ? 'Close' : 'Watch'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRemoveVideo(lesson.id)}
                              className="p-1 text-warm-gray hover:text-terracotta"
                              title="Detach video"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUploaderLessonId(isUploaderOpen ? null : lesson.id);
                                setActivePickerLessonId(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-[11px] font-medium text-white hover:bg-sage-dark shadow-2xs"
                            >
                              <Upload className="h-3 w-3" /> Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePickerLessonId(isPickerOpen ? null : lesson.id);
                                setActiveUploaderLessonId(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-beige bg-cream px-2 py-1 text-[11px] font-medium text-warm-gray hover:text-charcoal"
                            >
                              <Layers className="h-3 w-3" /> Bunny Library
                            </button>
                          </>
                        )}

                        {/* Delete Lesson */}
                        <button
                          type="button"
                          onClick={() => void handleDeleteLesson(lesson.id)}
                          className="p-1 text-warm-gray hover:text-terracotta ml-1"
                          title="Delete lesson"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Uploader Box */}
                    {isUploaderOpen && (
                      <div className="pt-2 border-t border-beige/60">
                        <BunnyVideoUploader
                          lessonTitle={lesson.title}
                          onVideoReady={(guid) => void handleAttachVideo(lesson.id, guid)}
                          onCancel={() => setActiveUploaderLessonId(null)}
                        />
                      </div>
                    )}

                    {/* Inline Video Player Preview */}
                    {isPreviewing && videoId && (
                      <div className="pt-2 border-t border-beige/60">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-charcoal">Previewing Video</span>
                          <button
                            type="button"
                            onClick={() => setPreviewLessonId(null)}
                            className="text-xs text-sage-dark hover:underline"
                          >
                            Close
                          </button>
                        </div>
                        <SecureBunnyPlayer
                          key={videoId}
                          request={{ action: 'getAdminPlayback', videoId }}
                          title={lesson.title}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Video Lesson Form */}
          {showAddLesson ? (
            <div className="rounded-xl border border-sage/40 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-sage-dark">
                  New Video Lesson
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddLesson(false)}
                  className="text-xs text-warm-gray hover:text-charcoal"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Co-Regulation Principles"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-cream/40 px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="10 min"
                    value={newLessonDuration}
                    onChange={(e) => setNewLessonDuration(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-cream/40 px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLessonIsPreview}
                      onChange={(e) => setNewLessonIsPreview(e.target.checked)}
                      className="rounded text-sage focus:ring-sage"
                    />
                    <span>Free Preview</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddLesson(false)}
                  className="rounded-full border border-beige px-3 py-1 text-xs text-warm-gray"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newLessonTitle.trim()}
                  onClick={() => void handleAddLesson()}
                  className="rounded-full bg-sage px-4 py-1 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
                >
                  Add Lesson
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddLesson(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-sage/60 bg-sage/5 px-3.5 py-1.5 text-xs font-medium text-sage-dark hover:bg-sage/15 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Video Lesson
            </button>
          )}
        </div>

        {/* CONTAINER 2: VISIBLY SEPARATE MATERIALS CONTAINER */}
        <div className="rounded-2xl border border-beige bg-white p-4 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-beige/60">
            <div>
              <h5 className="flex items-center gap-2 font-serif text-sm font-medium text-charcoal">
                <FileText className="h-4 w-4 text-dusty-blue" /> Materials & Resources
              </h5>
              <p className="text-[11px] text-warm-gray">
                Downloadable worksheets, PDFs, and HTTPS external links for this module.
              </p>
            </div>
            <span className="rounded-full bg-dusty-blue/10 px-2 py-0.5 text-xs font-semibold text-dusty-blue-dark">
              {allModuleMaterials.length} material(s)
            </span>
          </div>

          {/* Materials List */}
          {allModuleMaterials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-beige p-4 text-center text-xs text-warm-gray">
              No materials attached to this module yet. Click "Add Material" below to upload a worksheet or add a secure link.
            </div>
          ) : (
            <div className="space-y-2">
              {allModuleMaterials.map((mat, matIdx) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-beige/70 bg-cream/30 p-3 text-xs transition hover:bg-cream/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-dusty-blue-dark shrink-0 border border-beige">
                      {mat.type === 'link' ? (
                        <LinkIcon className="h-3.5 w-3.5" />
                      ) : (
                        <File className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      {renamingMaterialId === mat.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={materialRenameTitle}
                            onChange={(e) => setMaterialRenameTitle(e.target.value)}
                            className="w-48 rounded-lg border border-beige bg-white px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveMaterialRename(mat.id, mat.lessonId);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveMaterialRename(mat.id, mat.lessonId)}
                            className="rounded-md bg-sage px-2 py-1 text-[10px] font-medium text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingMaterialId(null)}
                            className="text-[10px] text-warm-gray"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-charcoal truncate">{mat.title}</span>
                          <span className="rounded-full bg-cream border border-beige px-1.5 py-0.2 text-[9px] uppercase tracking-wider text-warm-gray">
                            {mat.type}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-warm-gray mt-0.5">
                        <span className="text-sage-dark font-medium truncate">
                          Linked to: {mat.lessonTitle}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5">
                          {mat.is_enrolled_only ? (
                            <>
                              <Lock className="h-2.5 w-2.5 text-amber-700" /> Enrolled Only
                            </>
                          ) : (
                            <>
                              <Globe className="h-2.5 w-2.5 text-sky-700" /> Public
                            </>
                          )}
                        </span>
                        {mat.file_size_bytes && (
                          <>
                            <span>•</span>
                            <span>{(mat.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={matIdx === 0}
                      onClick={() => handleMoveMaterial(matIdx, 'up')}
                      className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                      title="Move material up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={matIdx === allModuleMaterials.length - 1}
                      onClick={() => handleMoveMaterial(matIdx, 'down')}
                      className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                      title="Move material down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingMaterialId(mat.id);
                        setMaterialRenameTitle(mat.title);
                      }}
                      className="p-1 text-warm-gray hover:text-sage-dark"
                      title="Rename material"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMaterial(mat.id, mat.lessonId, mat.file_path)}
                      className="p-1 text-warm-gray hover:text-terracotta"
                      title="Delete material"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Material Inline Form */}
          {showAddMaterial ? (
            <div className="rounded-xl border border-dusty-blue/40 bg-cream/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-dusty-blue-dark">
                  Add Material to Module
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="text-xs text-warm-gray hover:text-charcoal"
                >
                  Cancel
                </button>
              </div>

              {matError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{matError}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">
                    Material Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nervous System Regulation Worksheet"
                    value={newMatTitle}
                    onChange={(e) => setNewMatTitle(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">Type</label>
                  <select
                    value={newMatType}
                    onChange={(e) => setNewMatType(e.target.value as typeof newMatType)}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-1.5 text-xs text-charcoal focus:outline-none"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="worksheet">Worksheet</option>
                    <option value="link">HTTPS External Link</option>
                    <option value="file">Other File</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">
                    Linked Lesson *
                  </label>
                  <select
                    value={newMatLessonId}
                    onChange={(e) => setNewMatLessonId(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-1.5 text-xs text-charcoal focus:outline-none"
                  >
                    {module.videos.length === 0 ? (
                      <option value="">(Module Overview Lesson will be created)</option>
                    ) : (
                      module.videos.map((v, i) => (
                        <option key={v.id} value={v.id}>
                          Lesson {moduleIndex + 1}.{i + 1}: {v.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-1.5 text-xs text-charcoal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMatEnrolledOnly}
                      onChange={(e) => setNewMatEnrolledOnly(e.target.checked)}
                      className="rounded text-sage focus:ring-sage"
                    />
                    <span>Require Active Enrollment (Private)</span>
                  </label>
                </div>
              </div>

              {newMatType === 'link' ? (
                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">
                    Secure HTTPS URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/guide.pdf"
                    value={newMatExternalUrl}
                    onChange={(e) => setNewMatExternalUrl(e.target.value)}
                    className="w-full rounded-xl border border-beige bg-white px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-charcoal mb-1">
                    Upload File (Max 50MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => setNewMatFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-warm-gray file:mr-3 file:py-1 file:px-3 file:rounded-full file:border file:border-beige file:bg-white file:text-xs file:font-medium hover:file:bg-cream"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="rounded-full border border-beige px-3 py-1 text-xs text-warm-gray hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={uploadingMat || !newMatTitle.trim()}
                  onClick={() => void handleAddMaterial()}
                  className="rounded-full bg-dusty-blue-dark px-4 py-1 text-xs font-medium text-white hover:bg-dusty-blue disabled:opacity-50 shadow-2xs"
                >
                  {uploadingMat ? 'Saving Material...' : 'Add Material'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAddMaterial(true);
                if (!newMatLessonId && module.videos[0]) {
                  setNewMatLessonId(module.videos[0].id);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-dusty-blue/60 bg-dusty-blue/5 px-3.5 py-1.5 text-xs font-medium text-dusty-blue-dark hover:bg-dusty-blue/15 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Material
            </button>
          )}
        </div>
      </div>

      {/* Library Video Selector Modal */}
      {activePickerLessonId && (
        <BunnyLibraryPicker
          onSelect={(guid) => void handleAttachVideo(activePickerLessonId, guid)}
          onClose={() => setActivePickerLessonId(null)}
        />
      )}
    </div>
  );
}
