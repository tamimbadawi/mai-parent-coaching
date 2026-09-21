import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Lightbulb,
  MessageSquare,
  FileText,
  HeartHandshake,
  Edit3,
  Trash2,
  RefreshCw,
  Tag,
  Check,
  X,
  AlertCircle,
  Eye,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CRMContentItem, CRMContentType, CRMTargetTrack } from '../../../types';

const TYPE_CONFIG: Record<
  CRMContentType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  tip: { label: 'Micro-Tip', icon: Lightbulb, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  prompt: { label: 'Reflective Prompt', icon: MessageSquare, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  worksheet: { label: 'Worksheet / Guide', icon: FileText, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  check_in: { label: 'Continuity Check-In', icon: HeartHandshake, color: 'text-purple-700 bg-purple-50 border-purple-200' },
};

const TRACK_CONFIG: Record<CRMTargetTrack, { label: string; badgeColor: string }> = {
  track_a: { label: 'Track A (Nurture)', badgeColor: 'bg-sage/15 text-sage-dark border-sage/30' },
  track_b: { label: 'Track B (Continuity)', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  all: { label: 'All Tracks', badgeColor: 'bg-warm-gray-100 text-charcoal border-warm-gray-300' },
};

const SUGGESTED_TAGS = [
  'tantrums',
  'nervous-system',
  'burnout',
  'reflection',
  'boundaries',
  'emotional-regulation',
  'sleep',
  'connection',
  'coaching-integration',
];

interface ContentFormState {
  id?: string;
  title: string;
  body_template: string;
  content_type: CRMContentType;
  target_track: CRMTargetTrack;
  tags: string[];
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_FORM: ContentFormState = {
  title: '',
  body_template: "Hello {parentName},\n\nHere is a grounding thought for today...\n\nWarmly,\nMai",
  content_type: 'tip',
  target_track: 'track_a',
  tags: [],
  is_active: true,
  sort_order: 1,
};

export default function ContentLibraryStudio(): JSX.Element {
  const [items, setItems] = useState<CRMContentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrack, setSelectedTrack] = useState<CRMTargetTrack | 'all_filter'>('all_filter');
  const [selectedType, setSelectedType] = useState<CRMContentType | 'all_filter'>('all_filter');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<ContentFormState>(DEFAULT_FORM);
  const [tagInput, setTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal states
  const [deleteTarget, setDeleteTarget] = useState<CRMContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch content library
  const fetchLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('crm_content_library')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setItems(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load content library';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchLibrary();
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'archived' && item.is_active) return false;

      // Track filter
      if (selectedTrack !== 'all_filter') {
        if (item.target_track !== selectedTrack && item.target_track !== 'all') return false;
      }

      // Type filter
      if (selectedType !== 'all_filter' && item.content_type !== selectedType) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesBody = item.body_template.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        return matchesTitle || matchesBody || matchesTags;
      }

      return true;
    });
  }, [items, statusFilter, selectedTrack, selectedType, searchQuery]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setFormState({
      ...DEFAULT_FORM,
      sort_order: items.length + 1,
    });
    setTagInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (item: CRMContentItem) => {
    setFormState({
      id: item.id,
      title: item.title,
      body_template: item.body_template,
      content_type: item.content_type,
      target_track: item.target_track,
      tags: [...item.tags],
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setTagInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Tag management
  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (trimmed && !formState.tags.includes(trimmed)) {
      setFormState((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmed],
      }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormState((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  // Save content piece (Insert / Update)
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      setFormError('Please enter a descriptive title for this piece.');
      return;
    }
    if (!formState.body_template.trim()) {
      setFormError('Please write the message body template.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (formState.id) {
        // Update
        const { error: updateErr } = await supabase
          .from('crm_content_library')
          .update({
            title: formState.title.trim(),
            body_template: formState.body_template.trim(),
            content_type: formState.content_type,
            target_track: formState.target_track,
            tags: formState.tags,
            is_active: formState.is_active,
            sort_order: Number(formState.sort_order) || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', formState.id);

        if (updateErr) throw updateErr;
        setSuccessMessage(`Updated "${formState.title}" successfully.`);
      } else {
        // Insert
        const { error: insertErr } = await supabase
          .from('crm_content_library')
          .insert({
            title: formState.title.trim(),
            body_template: formState.body_template.trim(),
            content_type: formState.content_type,
            target_track: formState.target_track,
            tags: formState.tags,
            is_active: formState.is_active,
            sort_order: Number(formState.sort_order) || 0,
          });

        if (insertErr) throw insertErr;
        setSuccessMessage(`Created "${formState.title}" successfully.`);
      }

      setIsModalOpen(false);
      await fetchLibrary();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving content item';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle quick active status
  const handleToggleActive = async (item: CRMContentItem) => {
    const nextStatus = !item.is_active;
    try {
      const { error: toggleErr } = await supabase
        .from('crm_content_library')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (toggleErr) throw toggleErr;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: nextStatus } : i))
      );
      setSuccessMessage(
        nextStatus
          ? `Activated "${item.title}".`
          : `Archived "${item.title}". It will not be scheduled for delivery.`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      setError(msg);
    }
  };

  // Delete content item
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error: delErr } = await supabase
        .from('crm_content_library')
        .delete()
        .eq('id', deleteTarget.id);

      if (delErr) throw delErr;

      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setSuccessMessage(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete item';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Sample preview text
  const previewText = useMemo(() => {
    return formState.body_template.replace(/\{parentName\}/g, 'Sarah');
  }, [formState.body_template]);

  const activeCount = items.filter((i) => i.is_active).length;
  const trackACount = items.filter((i) => i.is_active && (i.target_track === 'track_a' || i.target_track === 'all')).length;
  const trackBCount = items.filter((i) => i.is_active && (i.target_track === 'track_b' || i.target_track === 'all')).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Card */}
      <div className="bg-white border border-[#e5e0d8] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-sage/10 text-sage-dark rounded-xl">
                <BookOpen className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-serif text-charcoal font-medium">
                Client Nurture & Content Library
              </h2>
            </div>
            <p className="text-sm text-charcoal/70 mt-1 max-w-2xl">
              Curate bite-sized reflective prompts, worksheets, and micro-tips. Pieces are automatically
              rotated and delivered to parents on a calm cadence without repeating.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchLibrary()}
              disabled={isLoading}
              className="p-2.5 text-charcoal/60 hover:text-charcoal border border-[#e5e0d8] rounded-xl hover:bg-[#faf8f4] transition-colors"
              title="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-sage text-white rounded-xl hover:bg-sage-dark font-medium shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Piece</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#f0ece5]">
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#ede8e1]">
            <p className="text-xs text-charcoal/60">Active Total</p>
            <p className="text-xl font-semibold text-charcoal mt-0.5">{activeCount} pieces</p>
          </div>
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#ede8e1]">
            <p className="text-xs text-charcoal/60">Track A (Pre-Paid Nurture)</p>
            <p className="text-xl font-semibold text-sage-dark mt-0.5">{trackACount} eligible</p>
          </div>
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#ede8e1]">
            <p className="text-xs text-charcoal/60">Track B (Continuity Care)</p>
            <p className="text-xl font-semibold text-purple-800 mt-0.5">{trackBCount} eligible</p>
          </div>
          <div className="bg-[#faf8f4] rounded-xl p-3 border border-[#ede8e1]">
            <p className="text-xs text-charcoal/60">Runway at 14d Cadence</p>
            <p className="text-xl font-semibold text-charcoal mt-0.5">
              {Math.round((trackACount * 14) / 30)} months
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e5e0d8] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, prompt text, or tag..."
              className="w-full pl-9 pr-4 py-2 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center bg-[#faf8f4] border border-[#e5e0d8] rounded-xl p-1 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                statusFilter === 'active' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                statusFilter === 'archived' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              Archived
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                statusFilter === 'all' ? 'bg-white text-charcoal shadow-xs' : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Track and Type Pill Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f0ece5] text-xs">
          {/* Track Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-charcoal/50 font-medium">Track:</span>
            <button
              onClick={() => setSelectedTrack('all_filter')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedTrack === 'all_filter'
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTrack('track_a')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedTrack === 'track_a'
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              Track A (Nurture)
            </button>
            <button
              onClick={() => setSelectedTrack('track_b')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedTrack === 'track_b'
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              Track B (Continuity)
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-charcoal/50 font-medium">Type:</span>
            <button
              onClick={() => setSelectedType('all_filter')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedType === 'all_filter'
                  ? 'bg-charcoal text-white border-charcoal'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('tip')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedType === 'tip'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              Tips
            </button>
            <button
              onClick={() => setSelectedType('prompt')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedType === 'prompt'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              Prompts
            </button>
            <button
              onClick={() => setSelectedType('worksheet')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedType === 'worksheet'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              Worksheets
            </button>
            <button
              onClick={() => setSelectedType('check_in')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedType === 'check_in'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-charcoal/70 border-[#e5e0d8] hover:bg-[#faf8f4]'
              }`}
            >
              Check-ins
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-charcoal/50">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-sage" />
          <p>Loading content library...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#e5e0d8] rounded-2xl py-16 px-6 text-center shadow-xs">
          <BookOpen className="w-12 h-12 mx-auto text-charcoal/30 mb-3" />
          <h3 className="text-lg font-serif text-charcoal font-medium">No content pieces match this filter</h3>
          <p className="text-sm text-charcoal/60 mt-1 max-w-md mx-auto">
            Try adjusting your search criteria, selecting another track, or adding a new piece to the library.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-sage text-white rounded-xl text-sm font-medium hover:bg-sage-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Content Piece</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const typeInfo = TYPE_CONFIG[item.content_type] || TYPE_CONFIG.tip;
            const trackInfo = TRACK_CONFIG[item.target_track] || TRACK_CONFIG.all;
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                  item.is_active
                    ? 'border-[#e5e0d8] hover:border-sage/40'
                    : 'border-dashed border-gray-300 opacity-60 bg-gray-50/50'
                }`}
              >
                <div>
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${trackInfo.badgeColor}`}>
                        {trackInfo.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${typeInfo.color}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        <span>{typeInfo.label}</span>
                      </span>
                    </div>

                    {/* Active toggle button */}
                    <button
                      onClick={() => void handleToggleActive(item)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${
                        item.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title={item.is_active ? 'Click to archive' : 'Click to activate'}
                    >
                      {item.is_active ? 'Active' : 'Archived'}
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-charcoal mb-2">
                    {item.title}
                  </h3>

                  {/* Body Preview (pre-wrap) */}
                  <div className="bg-[#faf8f4] border border-[#ede8e1] rounded-xl p-3 text-xs text-charcoal/80 font-mono whitespace-pre-wrap line-clamp-4 leading-relaxed">
                    {item.body_template}
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-warm-gray-100 text-charcoal/70 rounded-md text-[11px]"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f0ece5] text-xs text-charcoal/50">
                  <span className="flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Priority #{item.sort_order}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e5e0d8] text-charcoal hover:bg-[#faf8f4] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg border border-[#e5e0d8] text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                      title="Delete piece"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e5e0d8] animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#f0ece5]">
              <div>
                <h3 className="text-xl font-serif font-medium text-charcoal">
                  {formState.id ? 'Edit Content Piece' : 'New Content Piece'}
                </h3>
                <p className="text-xs text-charcoal/60 mt-0.5">
                  Design a message template for automated client nurture and continuity.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-charcoal/40 hover:text-charcoal rounded-xl hover:bg-[#faf8f4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSaveContent} className="overflow-y-auto p-6 space-y-5 flex-1">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                  Piece Title *
                </label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="e.g., The 3-Second Pause for Tantrums"
                  className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
                />
              </div>

              {/* Track & Type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Track */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Target Lifecycle Track
                  </label>
                  <select
                    value={formState.target_track}
                    onChange={(e) =>
                      setFormState({ ...formState, target_track: e.target.value as CRMTargetTrack })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
                  >
                    <option value="track_a">Track A (Pre-Paid Nurture & Taste)</option>
                    <option value="track_b">Track B (Post-Paid Relationship Continuity)</option>
                    <option value="all">All Tracks</option>
                  </select>
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Content Type
                  </label>
                  <select
                    value={formState.content_type}
                    onChange={(e) =>
                      setFormState({ ...formState, content_type: e.target.value as CRMContentType })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
                  >
                    <option value="tip">💡 Micro-Tip (Quick regulation technique)</option>
                    <option value="prompt">💬 Reflective Prompt (Question to hold)</option>
                    <option value="worksheet">📄 Worksheet / Guide (Resource share)</option>
                    <option value="check_in">🤝 Continuity Check-In (Progress inquiry)</option>
                  </select>
                </div>
              </div>

              {/* Sort priority and Active toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                    Rotation Sort Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formState.sort_order}
                    onChange={(e) =>
                      setFormState({ ...formState, sort_order: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3.5 py-2 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
                  />
                  <p className="text-[11px] text-charcoal/50 mt-1">Lower numbers rotate earlier.</p>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.is_active}
                      onChange={(e) => setFormState({ ...formState, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sage"></div>
                  </label>
                  <span className="text-xs font-medium text-charcoal">
                    {formState.is_active ? 'Active for scheduling' : 'Archived (skipped)'}
                  </span>
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                  Topic Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder="Type tag and press Add (e.g. tantrums)"
                    className="flex-1 px-3.5 py-2 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage/40"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="px-4 py-2 bg-charcoal text-white rounded-xl text-xs font-medium hover:bg-charcoal/90"
                  >
                    Add Tag
                  </button>
                </div>

                {/* Suggested tags chips */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[11px] text-charcoal/50 mr-1 self-center">Suggestions:</span>
                  {SUGGESTED_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className="text-[11px] px-2 py-0.5 bg-[#faf8f4] border border-[#ede8e1] rounded-md text-charcoal/70 hover:bg-sage/10 hover:text-sage-dark transition-colors"
                    >
                      +{t}
                    </button>
                  ))}
                </div>

                {/* Selected tags list */}
                {formState.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formState.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sage/10 text-sage-dark rounded-lg text-xs font-medium"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Body Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Message Body Template *
                  </label>
                  <span className="text-[11px] text-charcoal/50">
                    Use <code className="bg-warm-gray-100 px-1 py-0.5 rounded text-charcoal">&#123;parentName&#125;</code> for client's first name
                  </span>
                </div>
                <textarea
                  rows={7}
                  required
                  value={formState.body_template}
                  onChange={(e) => setFormState({ ...formState, body_template: e.target.value })}
                  className="w-full p-3.5 bg-[#faf8f4] border border-[#e5e0d8] rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sage/40 leading-relaxed"
                />
              </div>

              {/* Live Preview Box */}
              <div className="bg-[#f4efe8]/70 border border-[#e5dfd5] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-medium text-charcoal/70">
                  <Eye className="w-3.5 h-3.5 text-sage" />
                  <span>Live Delivery Preview (Recipient: Sarah)</span>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-[#e5e0d8] text-xs text-charcoal whitespace-pre-wrap font-sans shadow-2xs leading-relaxed">
                  {previewText}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0ece5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-[#e5e0d8] rounded-xl text-xs font-medium text-charcoal hover:bg-[#faf8f4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-sage text-white rounded-xl text-xs font-medium hover:bg-sage-dark shadow-xs disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{formState.id ? 'Update Piece' : 'Create Piece'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5e0d8] animate-scale-in">
            <h3 className="text-lg font-serif font-medium text-charcoal mb-2">Delete Content Piece?</h3>
            <p className="text-xs text-charcoal/70 mb-4 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>?
              If you simply want to stop sending it temporarily, you can <strong>Archive</strong> it instead.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 border border-[#e5e0d8] rounded-xl text-xs text-charcoal hover:bg-[#faf8f4]"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteConfirm()}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
