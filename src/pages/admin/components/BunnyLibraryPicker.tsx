import { useEffect, useState } from 'react';
import { Video, Search, Check, X, ShieldAlert, Loader2, Play } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import SecureBunnyPlayer from '../../../components/media/SecureBunnyPlayer';

interface BunnyLibraryPickerProps {
  currentVideoId?: string;
  onSelect: (bunnyVideoId: string) => void;
  onClose: () => void;
}

interface BunnyVideoItem {
  guid: string;
  title: string;
  status: number;
  length: number;
  totalSize: number;
}

const FORBIDDEN_EXAMPLE_GUID = 'fd9e91b3-4a79-4f2f-8b16-ac07b8818642'; // Karim Waving.mp4

export default function BunnyLibraryPicker({
  currentVideoId,
  onSelect,
  onClose,
}: BunnyLibraryPickerProps): JSX.Element {
  const [videos, setVideos] = useState<BunnyVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [previewGuid, setPreviewGuid] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('bunny-stream-manager', {
          body: { action: 'listVideos', page: 1, itemsPerPage: 50 },
        });

        if (fnError || !data?.videos) {
          setError('Failed to fetch videos from Bunny Stream library.');
        } else {
          setVideos(data.videos as BunnyVideoItem[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error contacting video service.');
      } finally {
        setLoading(false);
      }
    };

    void fetchVideos();
  }, []);

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.guid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[28px] border border-beige bg-ivory shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige px-6 py-4 bg-white/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <Video className="h-5 w-5 text-sage-dark" />
            <h3 className="font-serif text-lg font-medium text-charcoal">Choose from Bunny Library</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-warm-gray hover:bg-beige/60 hover:text-charcoal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-beige px-6 py-3 bg-cream shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
            <input
              type="text"
              placeholder="Search by title or GUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-beige bg-white pl-10 pr-4 py-2 text-xs text-charcoal placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-warm-gray">
              <Loader2 className="h-8 w-8 animate-spin text-sage mb-2" />
              <p className="text-xs">Loading Bunny Stream library...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-beige bg-cream p-6 text-center text-xs text-terracotta">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-beige bg-cream p-8 text-center text-xs text-warm-gray">
              No videos found matching your query.
            </div>
          ) : (
            filtered.map((video) => {
              const isSelected = currentVideoId === video.guid;
              const isForbidden = video.guid.toLowerCase() === FORBIDDEN_EXAMPLE_GUID.toLowerCase();

              return (
                <div
                  key={video.guid}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-sage bg-sage/5'
                      : isForbidden
                      ? 'border-beige/60 bg-cream/40 opacity-75'
                      : 'border-beige bg-white hover:border-sage/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-charcoal truncate">{video.title}</span>
                        {isForbidden && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            <ShieldAlert className="h-3 w-3" /> Admin Example Only
                          </span>
                        )}
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                            <Check className="h-3 w-3" /> Attached
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-warm-gray truncate">{video.guid}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-warm-gray">
                        <span>Status: {video.status === 4 ? 'Ready' : `Processing (${video.status})`}</span>
                        <span>•</span>
                        <span>{Math.round((video.length || 0) / 60)} min</span>
                        <span>•</span>
                        <span>{((video.totalSize || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewGuid(previewGuid === video.guid ? null : video.guid)}
                        className="inline-flex items-center gap-1 rounded-full border border-beige px-3 py-1.5 text-xs text-warm-gray hover:text-charcoal hover:bg-cream"
                      >
                        <Play className="h-3 w-3 text-sage" />
                        {previewGuid === video.guid ? 'Close' : 'Preview'}
                      </button>

                      <button
                        type="button"
                        disabled={isForbidden}
                        onClick={() => {
                          if (!isForbidden) {
                            onSelect(video.guid);
                            onClose();
                          }
                        }}
                        className={`rounded-full px-4 py-1.5 text-xs font-medium shadow-xs transition ${
                          isForbidden
                            ? 'cursor-not-allowed bg-beige/60 text-warm-gray'
                            : 'bg-sage text-white hover:bg-sage-dark'
                        }`}
                        title={isForbidden ? 'This approved test example cannot be attached to a course lesson.' : 'Attach this video'}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>

                  {previewGuid === video.guid && (
                    <div className="mt-4 pt-3 border-t border-beige/60">
                      <SecureBunnyPlayer
                        request={{ action: 'getAdminPlayback', videoId: video.guid }}
                        title={video.title}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-beige px-6 py-3 bg-white/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-beige px-5 py-2 text-xs font-medium text-warm-gray hover:bg-cream"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
