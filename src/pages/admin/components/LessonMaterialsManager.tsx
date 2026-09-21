import { useState } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { adminSaveMaterial, adminDeleteMaterial } from '../../../lib/courses';
import type { CourseMaterial } from '../../../types';

interface LessonMaterialsManagerProps {
  courseId: string;
  lessonId: string;
  materials: CourseMaterial[];
  onMaterialsChange: (updated: CourseMaterial[]) => void;
}

export default function LessonMaterialsManager({
  courseId,
  lessonId,
  materials,
  onMaterialsChange,
}: LessonMaterialsManagerProps): JSX.Element {
  const [showAddForm, setShowAddForm] = useState(false);
  const [materialType, setMaterialType] = useState<'pdf' | 'worksheet' | 'link' | 'audio' | 'file'>('pdf');
  const [title, setTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isEnrolledOnly, setIsEnrolledOnly] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validate size (max 50MB for materials)
    if (f.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB.');
      return;
    }

    setSelectedFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
    setError(null);
  };

  const handleSaveMaterial = async () => {
    if (!title.trim()) {
      setError('Material title is required.');
      return;
    }

    if (materialType === 'link') {
      if (!externalUrl.trim() || !externalUrl.startsWith('https://')) {
        setError('Please enter a valid secure URL starting with https://');
        return;
      }
    } else {
      if (!selectedFile) {
        setError('Please select a file to upload.');
        return;
      }
    }

    setUploading(true);
    setError(null);

    try {
      let filePath: string | null = null;
      let fileSize: number | null = null;

      if (selectedFile) {
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${courseId}/${lessonId}/${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-materials')
          .upload(storagePath, selectedFile, {
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        filePath = storagePath;
        fileSize = selectedFile.size;
      }

      const nextOrder = materials.length;
      const { data: saved, error: dbError } = await adminSaveMaterial({
        lesson_id: lessonId,
        course_id: courseId,
        title: title.trim(),
        type: materialType,
        file_path: filePath || undefined,
        external_url: materialType === 'link' ? externalUrl.trim() : undefined,
        file_size_bytes: fileSize || undefined,
        display_order: nextOrder,
        is_enrolled_only: isEnrolledOnly,
      });

      if (dbError || !saved) {
        throw new Error(dbError || 'Failed to save material in database.');
      }

      const newMaterial: CourseMaterial = {
        id: saved.id,
        lesson_id: saved.lesson_id,
        course_id: saved.course_id,
        title: saved.title,
        type: saved.type,
        url: saved.external_url || (saved.file_path ? `storage:${saved.file_path}` : '#'),
        file_path: saved.file_path || undefined,
        external_url: saved.external_url || undefined,
        file_size_bytes: saved.file_size_bytes || undefined,
        display_order: saved.display_order,
        is_enrolled_only: saved.is_enrolled_only,
        created_at: saved.created_at,
        updated_at: saved.updated_at,
      };

      onMaterialsChange([...materials, newMaterial]);
      setShowAddForm(false);
      setTitle('');
      setExternalUrl('');
      setSelectedFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mat: CourseMaterial) => {
    if (!window.confirm(`Are you sure you want to remove "${mat.title}"?`)) return;

    setDeletingId(mat.id);
    const { error: delError } = await adminDeleteMaterial(mat.id, mat.file_path);
    if (delError) {
      alert(`Could not delete material: ${delError}`);
    } else {
      onMaterialsChange(materials.filter((m) => m.id !== mat.id));
    }
    setDeletingId(null);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= materials.length) return;

    const copy = [...materials];
    const item = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = item;

    const updated = copy.map((m, idx) => ({ ...m, display_order: idx }));
    setReordering(true);
    setError(null);
    for (const m of updated) {
      const { error: saveError } = await adminSaveMaterial({
        id: m.id,
        lesson_id: m.lesson_id || lessonId,
        course_id: m.course_id || courseId,
        title: m.title,
        type: m.type,
        file_path: m.file_path,
        external_url: m.external_url,
        file_size_bytes: m.file_size_bytes,
        is_enrolled_only: m.is_enrolled_only,
        display_order: m.display_order,
      });
      if (saveError) {
        setError(`Could not reorder materials: ${saveError}`);
        setReordering(false);
        return;
      }
    }
    onMaterialsChange(updated);
    setReordering(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-charcoal">Lesson Materials & Resources</h4>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1 text-xs font-medium text-white hover:bg-sage-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Add Material
          </button>
        )}
      </div>

      {/* Add Material Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-beige bg-cream p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-warm-gray">New Material</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-warm-gray hover:text-charcoal"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Assessment Worksheet (PDF)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Type</label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as typeof materialType)}
                className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                <option value="pdf">PDF Document</option>
                <option value="worksheet">Worksheet</option>
                <option value="audio">Audio Resource</option>
                <option value="file">General File</option>
                <option value="link">External HTTPS Link</option>
              </select>
            </div>
          </div>

          {materialType === 'link' ? (
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">External HTTPS Link</label>
              <input
                type="url"
                placeholder="https://example.com/guide"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full rounded-xl border border-beige bg-white px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1">Document File</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.mp3,.m4a,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="w-full rounded-xl border border-beige bg-white p-2 text-xs text-charcoal file:mr-3 file:rounded-lg file:border-0 file:bg-sage/15 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sage-dark hover:file:bg-sage/25"
              />
              <p className="mt-1 text-[11px] text-warm-gray">
                Stored in private Supabase bucket. Accessible only via short-lived signed access.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="enrolledOnlyCheck"
              checked={isEnrolledOnly}
              onChange={(e) => setIsEnrolledOnly(e.target.checked)}
              className="rounded border-beige text-sage focus:ring-sage"
            />
            <label htmlFor="enrolledOnlyCheck" className="text-xs text-charcoal cursor-pointer flex items-center gap-1">
              <Lock className="h-3 w-3 text-warm-gray" /> Require active student enrollment (locked for visitors)
            </label>
          </div>

          {error && (
            <p className="text-xs text-terracotta flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-beige/60">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-full border border-beige px-4 py-1.5 text-xs text-warm-gray hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={handleSaveMaterial}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Save Material
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-beige bg-cream/50 p-4 text-center text-xs text-warm-gray">
          No materials attached to this lesson yet.
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((mat, index) => (
            <div
              key={mat.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-beige bg-white px-3.5 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {mat.type === 'link' ? (
                  <Globe className="h-4 w-4 text-dusty-blue shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-sage-dark shrink-0" />
                )}
                <div className="min-w-0 truncate">
                  <p className="font-medium text-charcoal truncate">{mat.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-warm-gray mt-0.5">
                    <span className="uppercase">{mat.type}</span>
                    {mat.file_size_bytes ? (
                      <>
                        <span>•</span>
                        <span>{(mat.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                      </>
                    ) : null}
                    <span>•</span>
                    <span className="inline-flex items-center gap-0.5">
                      {mat.is_enrolled_only ? (
                        <>
                          <Lock className="h-2.5 w-2.5 text-warm-gray" /> Enrolled Only
                        </>
                      ) : (
                        'Public'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={reordering || index === 0}
                  onClick={() => handleMove(index, 'up')}
                  className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={reordering || index === materials.length - 1}
                  onClick={() => handleMove(index, 'down')}
                  className="p-1 text-warm-gray hover:text-charcoal disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {mat.external_url && (
                  <a
                    href={mat.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-warm-gray hover:text-sage-dark"
                    title="Open link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  disabled={deletingId === mat.id}
                  onClick={() => handleDelete(mat)}
                  className="p-1 text-warm-gray hover:text-terracotta disabled:opacity-50"
                  title="Remove material"
                >
                  {deletingId === mat.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
