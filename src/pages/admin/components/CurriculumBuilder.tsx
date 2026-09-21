import { useState } from 'react';
import {
  FolderPlus,
  Plus,
  Play,
  FileText,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Eye,
  Video,
} from 'lucide-react';
import { adminSaveModule, adminDeleteModule, adminDeleteLesson, adminSaveLesson, adminSaveMaterial } from '../../../lib/courses';
import type { CourseModule, Video as LessonType } from '../../../types';
import LessonEditorModal from './LessonEditorModal';

interface CurriculumBuilderProps {
  courseId: string;
  modules: CourseModule[];
  onModulesChange: (updated: CourseModule[]) => void;
}

export default function CurriculumBuilder({
  courseId,
  modules,
  onModulesChange,
}: CurriculumBuilderProps): JSX.Element {
  const [editingLesson, setEditingLesson] = useState<{
    moduleId: string;
    lesson: LessonType | null;
  } | null>(null);

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDuration, setNewModuleDuration] = useState('45 min');
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleEditTitle, setModuleEditTitle] = useState('');
  const [renamingLessonId, setRenamingLessonId] = useState<string | null>(null);
  const [renamingMaterialId, setRenamingMaterialId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;

    const nextOrder = modules.length;
    const { data: saved, error } = await adminSaveModule({
      course_id: courseId,
      title: newModuleTitle.trim(),
      duration: newModuleDuration.trim() || '45 min',
      display_order: nextOrder,
    });

    if (error || !saved) {
      alert(`Could not create module: ${error}`);
      return;
    }

    const newMod: CourseModule = {
      id: saved.id,
      course_id: saved.course_id,
      title: saved.title,
      duration: saved.duration || '45 min',
      display_order: saved.display_order,
      status: saved.status,
      videos: [],
      resources: [],
    };

    onModulesChange([...modules, newMod]);
    setNewModuleTitle('');
    setShowAddModule(false);
  };

  const handleUpdateModule = async (mod: CourseModule) => {
    if (!moduleEditTitle.trim()) return;

    const { data: saved, error } = await adminSaveModule({
      id: mod.id,
      course_id: courseId,
      title: moduleEditTitle.trim(),
      duration: mod.duration,
      display_order: mod.display_order,
      status: mod.status,
    });

    if (error || !saved) {
      alert(`Could not update module: ${error}`);
      return;
    }

    onModulesChange(
      modules.map((m) => (m.id === mod.id ? { ...m, title: saved.title } : m))
    );
    setEditingModuleId(null);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Delete this module and all of its lessons? This cannot be undone.')) {
      return;
    }

    const { error } = await adminDeleteModule(moduleId);
    if (error) {
      alert(`Could not delete module: ${error}`);
      return;
    }

    onModulesChange(modules.filter((m) => m.id !== moduleId));
  };

  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= modules.length) return;

    const copy = [...modules];
    const item = copy[index];
    copy[index] = copy[target];
    copy[target] = item;

    const updated = copy.map((m, idx) => ({ ...m, display_order: idx }));
    onModulesChange(updated);

    for (const m of updated) {
      void adminSaveModule({
        id: m.id,
        course_id: courseId,
        title: m.title,
        display_order: m.display_order,
      });
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;

    const { error } = await adminDeleteLesson(lessonId);
    if (error) {
      alert(`Could not delete lesson: ${error}`);
      return;
    }

    onModulesChange(
      modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              videos: m.videos.filter((v) => v.id !== lessonId),
            }
          : m
      )
    );
  };

  const handleMoveLesson = async (moduleId: string, lessonIndex: number, direction: 'up' | 'down') => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const target = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (target < 0 || target >= mod.videos.length) return;

    const copyVideos = [...mod.videos];
    const item = copyVideos[lessonIndex];
    copyVideos[lessonIndex] = copyVideos[target];
    copyVideos[target] = item;

    const updatedVideos = copyVideos.map((v, idx) => ({ ...v, display_order: idx }));

    setBusy(true);
    setListError(null);
    for (const video of updatedVideos) {
      const { error } = await adminSaveLesson({
        id: video.id, module_id: moduleId, course_id: courseId,
        title: video.title, description: video.description, duration: video.duration,
        bunny_video_id: video.bunny_video_id || video.bunnyVideoId,
        is_preview: video.is_preview, status: video.status,
        display_order: video.display_order,
      });
      if (error) {
        setListError(`Could not reorder videos: ${error}`);
        setBusy(false);
        return;
      }
    }
    onModulesChange(modules.map((m) => (m.id === moduleId ? { ...m, videos: updatedVideos } : m)));
    setBusy(false);
  };

  const handleRenameLesson = async (moduleId: string, lesson: LessonType) => {
    if (!renameTitle.trim()) return;
    setBusy(true);
    const { error } = await adminSaveLesson({
      id: lesson.id, module_id: moduleId, course_id: courseId,
      title: renameTitle.trim(), description: lesson.description, duration: lesson.duration,
      bunny_video_id: lesson.bunny_video_id || lesson.bunnyVideoId,
      is_preview: lesson.is_preview, status: lesson.status,
      display_order: lesson.display_order,
    });
    if (error) setListError(`Could not rename video: ${error}`);
    else {
      onModulesChange(modules.map((m) => m.id === moduleId ? {
        ...m, videos: m.videos.map((v) => v.id === lesson.id ? { ...v, title: renameTitle.trim() } : v),
      } : m));
      setRenamingLessonId(null);
    }
    setBusy(false);
  };

  const handleRenameMaterial = async (moduleId: string, lessonId: string, materialId: string) => {
    if (!renameTitle.trim()) return;
    const module = modules.find((m) => m.id === moduleId);
    const lesson = module?.videos.find((v) => v.id === lessonId);
    const material = lesson?.materials?.find((m) => m.id === materialId);
    if (!material) return;
    setBusy(true);
    const { error } = await adminSaveMaterial({
      ...material, id: material.id, lesson_id: lessonId, course_id: courseId,
      title: renameTitle.trim(), type: material.type,
    });
    if (error) setListError(`Could not rename material: ${error}`);
    else {
      onModulesChange(modules.map((m) => m.id === moduleId ? {
        ...m, videos: m.videos.map((v) => v.id === lessonId ? {
          ...v, materials: v.materials?.map((item) => item.id === materialId ? { ...item, title: renameTitle.trim() } : item),
        } : v),
      } : m));
      setRenamingMaterialId(null);
    }
    setBusy(false);
  };

  const handleLessonSaved = (moduleId: string, savedLesson: LessonType) => {
    onModulesChange(
      modules.map((m) => {
        if (m.id !== moduleId) return m;
        const exists = m.videos.some((v) => v.id === savedLesson.id);
        const updatedVideos = exists
          ? m.videos.map((v) => (v.id === savedLesson.id ? savedLesson : v))
          : [...m.videos, savedLesson];
        return {
          ...m,
          videos: updatedVideos,
        };
      })
    );
  };

  return (
    <div className="space-y-5">
      {listError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{listError}</p>}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-serif text-base font-medium text-charcoal">Course Curriculum</h4>
          <p className="text-xs text-warm-gray">
            Organize modules, arrange lessons, attach Bunny videos, and add student materials.
          </p>
        </div>
        {!showAddModule && (
          <button
            type="button"
            onClick={() => setShowAddModule(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark shadow-xs"
          >
            <FolderPlus className="h-4 w-4" /> Add Module
          </button>
        )}
      </div>

      {/* Add Module Inline */}
      {showAddModule && (
        <div className="rounded-2xl border border-beige bg-cream p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-warm-gray">New Module</span>
            <button
              type="button"
              onClick={() => setShowAddModule(false)}
              className="text-xs text-warm-gray hover:text-charcoal"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Module Title</label>
              <input
                type="text"
                placeholder="e.g. Module 1: Foundations of Regulation"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Duration</label>
              <input
                type="text"
                placeholder="e.g. 45 min"
                value={newModuleDuration}
                onChange={(e) => setNewModuleDuration(e.target.value)}
                className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddModule(false)}
              className="rounded-full border border-beige px-3.5 py-1.5 text-xs text-warm-gray hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newModuleTitle.trim()}
              onClick={handleAddModule}
              className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
            >
              Create Module
            </button>
          </div>
        </div>
      )}

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-beige bg-white/70 p-10 text-center">
          <FolderPlus className="h-8 w-8 text-sage mx-auto mb-2" />
          <p className="font-serif text-base text-charcoal">No curriculum modules yet</p>
          <p className="text-xs text-warm-gray mt-1 max-w-sm mx-auto">
            Click "Add Module" to start structuring your course into chapters, modules, and video lessons.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => (
            <div
              key={mod.id}
              className="overflow-hidden rounded-[24px] border border-beige bg-white shadow-xs"
            >
              {/* Module Header */}
              <div className="flex items-center justify-between border-b border-beige/60 bg-cream/70 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/15 text-[11px] font-semibold text-sage-dark shrink-0">
                    {modIdx + 1}
                  </span>

                  {editingModuleId === mod.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={moduleEditTitle}
                        onChange={(e) => setModuleEditTitle(e.target.value)}
                        className="rounded-lg border border-beige bg-white px-2 py-1 text-xs text-charcoal focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateModule(mod)}
                        className="rounded-md bg-sage px-2 py-1 text-[10px] font-medium text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModuleId(null)}
                        className="text-[10px] text-warm-gray"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 min-w-0">
                      <h5 className="font-serif text-sm font-medium text-charcoal truncate">{mod.title}</h5>
                      <span className="text-[11px] text-warm-gray shrink-0">{mod.duration}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={modIdx === 0}
                    onClick={() => handleMoveModule(modIdx, 'up')}
                    className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                    title="Move module up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={modIdx === modules.length - 1}
                    onClick={() => handleMoveModule(modIdx, 'down')}
                    className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                    title="Move module down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingModuleId(mod.id);
                      setModuleEditTitle(mod.title);
                    }}
                    className="p-1 text-warm-gray hover:text-sage-dark"
                    title="Edit module title"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModule(mod.id)}
                    className="p-1 text-warm-gray hover:text-terracotta"
                    title="Delete module"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Videos stay attached to lessons; materials are listed separately below. */}
              <div className="m-4 rounded-2xl border border-beige bg-cream/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 pb-1">
                  <div><h6 className="flex items-center gap-2 font-medium text-sm text-charcoal"><Video className="h-4 w-4 text-sage" /> Videos</h6><p className="text-[11px] text-warm-gray">Rename and arrange the lesson videos in viewing order.</p></div>
                  <span className="text-xs text-warm-gray">{mod.videos.length}</span>
                </div>
                {mod.videos.length === 0 ? (
                  <p className="py-2 text-center text-xs text-warm-gray italic">
                    No lessons in this module.
                  </p>
                ) : (
                  mod.videos.map((lesson, lesIdx) => {
                    const hasVideo = Boolean(lesson.bunnyVideoId || lesson.bunny_video_id);
                    const matCount = lesson.materials?.length ?? 0;

                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-beige/60 bg-cream/30 p-3 text-xs transition hover:bg-cream/60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Play className="h-4 w-4 text-sage shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {renamingLessonId === lesson.id ? (
                                <span className="flex items-center gap-1"><input aria-label="Video title" value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} className="w-40 rounded border border-beige bg-white px-2 py-1 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') void handleRenameLesson(mod.id, lesson); }} /><button type="button" disabled={busy || !renameTitle.trim()} onClick={() => void handleRenameLesson(mod.id, lesson)} className="text-sage-dark">Save</button><button type="button" onClick={() => setRenamingLessonId(null)}>Cancel</button></span>
                              ) : <span className="font-medium text-charcoal truncate">{lesson.title}</span>}
                              {lesson.status === 'draft' && (
                                <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-medium">
                                  Draft
                                </span>
                              )}
                              {lesson.is_preview && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 text-sky-800 px-1.5 py-0.2 text-[9px] font-medium">
                                  <Eye className="h-2.5 w-2.5" /> Preview
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-warm-gray mt-0.5">
                              <span>{lesson.duration}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                {hasVideo ? (
                                  <>
                                    <Video className="h-3 w-3 text-sage-dark" /> Video attached
                                  </>
                                ) : (
                                  <span className="text-amber-700">No video</span>
                                )}
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3 w-3 text-dusty-blue" /> {matCount} material(s)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={busy || lesIdx === 0}
                            onClick={() => void handleMoveLesson(mod.id, lesIdx, 'up')}
                            className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                            title="Move lesson up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busy || lesIdx === mod.videos.length - 1}
                            onClick={() => void handleMoveLesson(mod.id, lesIdx, 'down')}
                            className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                            title="Move lesson down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => { setRenamingLessonId(lesson.id); setRenamingMaterialId(null); setRenameTitle(lesson.title); }} className="p-1 text-warm-gray hover:text-sage-dark" title={`Rename ${lesson.title}`} aria-label={`Rename ${lesson.title}`}><Edit2 className="h-3.5 w-3.5" /></button>
                          <button
                            type="button"
                            onClick={() => setEditingLesson({ moduleId: mod.id, lesson })}
                            className="inline-flex items-center gap-1 rounded-full border border-beige bg-white px-2.5 py-1 text-xs text-charcoal hover:bg-beige/40"
                          >
                            <Edit2 className="h-3 w-3 text-sage" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                            className="p-1 text-warm-gray hover:text-terracotta"
                            title="Delete lesson"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingLesson({ moduleId: mod.id, lesson: null })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-sage/60 bg-sage/5 px-3 py-1 text-xs font-medium text-sage-dark hover:bg-sage/15 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Video Lesson
                  </button>
                </div>
              </div>
              <div className="m-4 rounded-2xl border border-beige bg-white p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 pb-1"><div><h6 className="flex items-center gap-2 font-medium text-sm text-charcoal"><FileText className="h-4 w-4 text-sage" /> Materials & Links</h6><p className="text-[11px] text-warm-gray">Files and links are attached to a lesson. Open a lesson to add or arrange them.</p></div><span className="text-xs text-warm-gray">{mod.videos.reduce((sum, video) => sum + (video.materials?.length ?? 0), 0)}</span></div>
                {mod.videos.every((video) => !video.materials?.length) ? <p className="rounded-xl border border-dashed border-beige p-4 text-center text-xs text-warm-gray">No materials yet. Add a video lesson, then attach its worksheets, PDFs, or links.</p> : mod.videos.flatMap((video) => (video.materials ?? []).map((material) => (
                  <div key={material.id} className="flex items-center justify-between gap-3 rounded-xl border border-beige bg-cream/30 px-3 py-2 text-xs">
                    <div className="min-w-0"><span className="block truncate text-[10px] text-warm-gray">{video.title}</span>{renamingMaterialId === material.id ? <span className="flex items-center gap-1"><input aria-label="Material title" value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} className="w-40 rounded border border-beige bg-white px-2 py-1 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') void handleRenameMaterial(mod.id, video.id, material.id); }} /><button type="button" disabled={busy || !renameTitle.trim()} onClick={() => void handleRenameMaterial(mod.id, video.id, material.id)} className="text-sage-dark">Save</button><button type="button" onClick={() => setRenamingMaterialId(null)}>Cancel</button></span> : <span className="font-medium text-charcoal">{material.title}</span>}</div>
                    <div className="flex items-center gap-2"><span className="uppercase text-[10px] text-warm-gray">{material.type}</span><button type="button" onClick={() => { setRenamingMaterialId(material.id); setRenamingLessonId(null); setRenameTitle(material.title); }} className="p-1 text-warm-gray hover:text-sage-dark" title={`Rename ${material.title}`} aria-label={`Rename ${material.title}`}><Edit2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setEditingLesson({ moduleId: mod.id, lesson: video })} className="rounded-full border border-beige bg-white px-2 py-1 text-charcoal">Manage</button></div>
                  </div>
                )))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lesson Editor Modal */}
      {editingLesson && (
        <LessonEditorModal
          courseId={courseId}
          moduleId={editingLesson.moduleId}
          lesson={editingLesson.lesson}
          nextOrder={modules.find((m) => m.id === editingLesson.moduleId)?.videos.length ?? 0}
          onSave={(saved) => handleLessonSaved(editingLesson.moduleId, saved)}
          onClose={() => setEditingLesson(null)}
        />
      )}
    </div>
  );
}
