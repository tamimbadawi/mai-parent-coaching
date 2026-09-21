import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Play,
  Loader2,
  PauseCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import SecureBunnyPlayer from '../../../components/media/SecureBunnyPlayer';

interface BunnyVideoUploaderProps {
  lessonTitle: string;
  onVideoReady: (bunnyVideoId: string) => void;
  onCancel: () => void;
}

interface UploadSession {
  videoId: string;
  uploadUrl: string;
  fileName: string;
  fileSize: number;
  expirationTime: number;
  signature: string;
  libraryId: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_PROCESSING_SECONDS = 900; // 15 minutes timeout

export default function BunnyVideoUploader({
  lessonTitle,
  onVideoReady,
  onCancel,
}: BunnyVideoUploaderProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [stage, setStage] = useState<
    'idle' | 'authorizing' | 'uploading' | 'interrupted' | 'processing' | 'timeout' | 'ready' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeSessionRef = useRef<UploadSession | null>(null);
  const currentXhrRef = useRef<XMLHttpRequest | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processingStartRef = useRef<number>(0);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (currentXhrRef.current) currentXhrRef.current.abort();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (MP4, MOV, WebM, etc.).');
      return;
    }

    if (selected.size > 2 * 1024 * 1024 * 1024) {
      setErrorMessage('File size exceeds 2GB. Please compress or optimize the video.');
      return;
    }

    setFile(selected);
    setErrorMessage(null);
    setProgress(0);
    setBytesUploaded(0);

    // Check if an existing resumable session exists for this exact file in sessionStorage
    try {
      const savedKey = `bunny_upload_${selected.name}_${selected.size}`;
      const saved = sessionStorage.getItem(savedKey);
      if (saved) {
        const session = JSON.parse(saved) as UploadSession;
        // Verify expiration
        if (session.expirationTime > Math.floor(Date.now() / 1000) + 300) {
          activeSessionRef.current = session;
          setUploadedVideoId(session.videoId);
        }
      }
    } catch {
      // ignore storage access errors
    }
  };

  /**
   * Queries Bunny Stream with HEAD request to retrieve current Upload-Offset.
   */
  const getRemoteOffset = async (uploadUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', uploadUrl);
      xhr.setRequestHeader('Tus-Resumable', '1.0.0');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const offsetHeader = xhr.getResponseHeader('Upload-Offset');
          const parsed = offsetHeader ? parseInt(offsetHeader, 10) : 0;
          resolve(Number.isFinite(parsed) ? parsed : 0);
        } else {
          resolve(0);
        }
      };
      xhr.onerror = () => resolve(0);
      xhr.send();
    });
  };

  /**
   * Uploads the file in sequential 5MB chunks via TUS PATCH.
   */
  const uploadChunks = async (session: UploadSession, targetFile: File, startOffset: number) => {
    let currentOffset = startOffset;
    setBytesUploaded(currentOffset);
    setProgress(Math.round((currentOffset / targetFile.size) * 100));

    while (currentOffset < targetFile.size) {
      if (isCancelledRef.current) {
        throw new Error('Upload cancelled.');
      }

      const endOffset = Math.min(currentOffset + CHUNK_SIZE, targetFile.size);
      const chunk = targetFile.slice(currentOffset, endOffset);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        currentXhrRef.current = xhr;

        xhr.open('PATCH', session.uploadUrl);
        xhr.setRequestHeader('Tus-Resumable', '1.0.0');
        xhr.setRequestHeader('Upload-Offset', currentOffset.toString());
        xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream');

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const uploadedSoFar = currentOffset + evt.loaded;
            setBytesUploaded(uploadedSoFar);
            setProgress(Math.min(99, Math.round((uploadedSoFar / targetFile.size) * 100)));
          }
        };

        xhr.onload = () => {
          currentXhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            const respOffset = xhr.getResponseHeader('Upload-Offset');
            const nextOffset = respOffset ? parseInt(respOffset, 10) : endOffset;
            currentOffset = Number.isFinite(nextOffset) ? nextOffset : endOffset;
            setBytesUploaded(currentOffset);
            setProgress(Math.min(100, Math.round((currentOffset / targetFile.size) * 100)));
            resolve();
          } else {
            reject(new Error(`Chunk upload failed with HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          currentXhrRef.current = null;
          reject(new Error('Network connection interrupted during chunk upload.'));
        };

        xhr.onabort = () => {
          currentXhrRef.current = null;
          reject(new Error('Upload interrupted.'));
        };

        xhr.send(chunk);
      });
    }
  };

  /**
   * Starts or resumes an upload session.
   */
  const startOrResumeUpload = async () => {
    if (!file) return;

    isCancelledRef.current = false;
    setErrorMessage(null);

    try {
      let session = activeSessionRef.current;

      // 1. Authorize new session if not present or expired
      if (!session || session.expirationTime <= Math.floor(Date.now() / 1000) + 300) {
        setStage('authorizing');
        const { data: authData, error: authError } = await supabase.functions.invoke('bunny-stream-manager', {
          body: {
            action: 'createUpload',
            title: lessonTitle.trim() || file.name,
          },
        });

        if (authError || !authData?.videoId || !authData?.signature) {
          throw new Error(authData?.error || 'Failed to authorize video upload with Bunny Stream.');
        }

        const { videoId, libraryId, expirationTime, signature, uploadEndpoint } = authData as {
          videoId: string;
          libraryId: string;
          expirationTime: number;
          signature: string;
          uploadEndpoint: string;
        };

        // Create TUS initial upload object on Bunny
        const createRes = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            'Upload-Length': file.size.toString(),
            'Tus-Resumable': '1.0.0',
            'AuthorizationSignature': signature,
            'AuthorizationExpire': expirationTime.toString(),
            'LibraryId': libraryId,
            'VideoId': videoId,
            'Upload-Metadata': `filetype ${btoa(file.type || 'video/mp4')},title ${btoa(lessonTitle || file.name)}`,
          },
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(`Upload creation rejected by Bunny: ${errText}`);
        }

        const uploadUrl = createRes.headers.get('Location') || `${uploadEndpoint}/${videoId}`;

        session = {
          videoId,
          uploadUrl,
          fileName: file.name,
          fileSize: file.size,
          expirationTime,
          signature,
          libraryId,
        };

        activeSessionRef.current = session;
        setUploadedVideoId(videoId);

        try {
          sessionStorage.setItem(`bunny_upload_${file.name}_${file.size}`, JSON.stringify(session));
        } catch {
          // ignore
        }
      }

      setStage('uploading');

      // 2. Query remote offset to resume if previously interrupted
      const remoteOffset = await getRemoteOffset(session.uploadUrl);

      // 3. Upload chunks starting from remoteOffset
      await uploadChunks(session, file, remoteOffset);

      // 4. Finished streaming binary chunks -> poll processing
      try {
        sessionStorage.removeItem(`bunny_upload_${file.name}_${file.size}`);
      } catch {
        // ignore
      }

      startStatusPolling(session.videoId);
    } catch (err: unknown) {
      if (isCancelledRef.current) return;
      const msg = err instanceof Error ? err.message : 'Upload interrupted.';
      setErrorMessage(msg);
      setStage('interrupted');
    }
  };

  /**
   * Bounded processing status polling with 15-minute timeout.
   */
  const startStatusPolling = (videoId: string) => {
    setStage('processing');
    processingStartRef.current = Date.now();

    const check = async () => {
      // Check for timeout
      const elapsed = Math.floor((Date.now() - processingStartRef.current) / 1000);
      if (elapsed > MAX_PROCESSING_SECONDS) {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        setStage('timeout');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('bunny-stream-manager', {
          body: { action: 'getVideoStatus', videoId },
        });

        if (error || !data) return;

        setEncodeProgress(data.encodeProgress ?? 0);

        // Status 4 = Ready / Finished
        if (data.status === 4) {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setStage('ready');
          onVideoReady(videoId);
        } else if (data.status === 5) {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setStage('error');
          setErrorMessage('Video transcoding failed in Bunny Stream.');
        }
      } catch {
        // keep polling until timeout
      }
    };

    void check();
    pollingTimerRef.current = setInterval(check, 4000);
  };

  /**
   * Intentionally simulate network interruption for verification.
   */
  const handleSimulateInterruption = () => {
    if (currentXhrRef.current) {
      currentXhrRef.current.abort();
    }
  };

  /**
   * Cancellation with server-side orphan cleanup.
   */
  const handleCancel = async () => {
    isCancelledRef.current = true;
    if (currentXhrRef.current) {
      currentXhrRef.current.abort();
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    // Clean up created video in Bunny library if not finished
    const session = activeSessionRef.current;
    if (session?.videoId && stage !== 'ready') {
      void supabase.functions.invoke('bunny-stream-manager', {
        body: { action: 'deleteVideo', videoId: session.videoId },
      });
    }

    if (file) {
      try {
        sessionStorage.removeItem(`bunny_upload_${file.name}_${file.size}`);
      } catch {
        // ignore
      }
    }

    onCancel();
  };

  return (
    <div className="rounded-2xl border border-beige bg-cream p-5">
      <div className="flex items-center justify-between pb-3 border-b border-beige">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-sage" />
          <h4 className="font-serif text-base font-medium text-charcoal">Resumable Video Upload</h4>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full p-1 text-warm-gray hover:bg-beige/60 hover:text-charcoal"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* STAGE: IDLE */}
      {stage === 'idle' && (
        <div className="mt-4 space-y-4">
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-beige bg-white p-6 cursor-pointer hover:border-sage/60 transition">
            <Upload className="h-8 w-8 text-sage mb-2" />
            <span className="text-sm font-medium text-charcoal">
              {file ? file.name : 'Select video file (MP4, MOV, WebM)'}
            </span>
            <span className="mt-1 text-xs text-warm-gray">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB • Resumable 5MB chunking`
                : 'Direct browser-to-Bunny streaming with resumable chunking up to 2GB.'}
            </span>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>

          {errorMessage && (
            <p className="text-xs text-terracotta flex items-center gap-1.5" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-beige px-4 py-2 text-xs font-medium text-warm-gray hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!file}
              onClick={startOrResumeUpload}
              className="rounded-full bg-sage px-5 py-2 text-xs font-medium text-white shadow-xs hover:bg-sage-dark disabled:opacity-50"
            >
              Start Chunked Upload
            </button>
          </div>
        </div>
      )}

      {/* STAGE: AUTHORIZING or UPLOADING */}
      {(stage === 'authorizing' || stage === 'uploading') && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-charcoal font-medium">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-sage" />
              {stage === 'authorizing' ? 'Generating signed upload authorization...' : 'Streaming 5MB chunks to Bunny...'}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-beige/60">
            <div className="h-full bg-sage transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-warm-gray">
            <span>
              {file ? `${(bytesUploaded / (1024 * 1024)).toFixed(1)} MB of ${(file.size / (1024 * 1024)).toFixed(1)} MB` : ''}
            </span>
            <span>Bunny TUS Direct Upload</span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSimulateInterruption}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800 hover:bg-amber-100"
              title="Test interrupting the in-flight chunk to verify resume"
            >
              <Zap className="h-3 w-3" /> Test Interruption
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-beige px-3.5 py-1.5 text-xs text-warm-gray hover:bg-white"
            >
              Cancel & Clean Up
            </button>
          </div>
        </div>
      )}

      {/* STAGE: INTERRUPTED (Resumable) */}
      {stage === 'interrupted' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <PauseCircle className="h-4 w-4 text-amber-700" /> Upload Paused / Interrupted
            </div>
            <p className="text-[11px] text-amber-800">
              {errorMessage || 'Connection was interrupted.'} The upload session is saved. You can resume exactly where it stopped.
            </p>
            <p className="font-mono text-[10px] text-amber-700">
              Uploaded: {(bytesUploaded / (1024 * 1024)).toFixed(1)} MB ({progress}%)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-beige px-4 py-1.5 text-xs text-warm-gray hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startOrResumeUpload}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resume Upload
            </button>
          </div>
        </div>
      )}

      {/* STAGE: PROCESSING */}
      {stage === 'processing' && (
        <div className="mt-4 space-y-3 text-center py-4">
          <RefreshCw className="h-8 w-8 animate-spin text-sage mx-auto" />
          <div>
            <p className="text-sm font-medium text-charcoal">All Chunks Uploaded — Transcoding in Bunny Stream</p>
            <p className="mt-1 text-xs text-warm-gray">
              Generating multi-resolution HLS streams ({encodeProgress}% encoded).
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            {uploadedVideoId && (
              <button
                type="button"
                onClick={() => {
                  if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
                  onVideoReady(uploadedVideoId);
                }}
                className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
              >
                Attach Video Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE: TIMEOUT */}
      {stage === 'timeout' && (
        <div className="mt-4 space-y-3 text-center py-4">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
          <div>
            <p className="text-sm font-medium text-charcoal">Transcoding is Taking Longer than Usual</p>
            <p className="mt-1 text-xs text-warm-gray max-w-sm mx-auto">
              Bunny Stream is still processing high-definition resolutions. You can check status now or attach the video to proceed.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => uploadedVideoId && startStatusPolling(uploadedVideoId)}
              className="inline-flex items-center gap-1 rounded-full border border-beige bg-white px-4 py-1.5 text-xs font-medium text-charcoal hover:bg-cream"
            >
              <RefreshCw className="h-3 w-3" /> Check Status Again
            </button>
            {uploadedVideoId && (
              <button
                type="button"
                onClick={() => onVideoReady(uploadedVideoId)}
                className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
              >
                Attach Video Anyway
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE: READY */}
      {stage === 'ready' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sage-dark text-sm font-medium">
            <CheckCircle2 className="h-5 w-5" /> Video ready and encoded!
          </div>
          <p className="text-xs text-warm-gray">
            Bunny Video GUID: <span className="font-mono text-charcoal">{uploadedVideoId}</span>
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-beige bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-beige/40"
            >
              <Play className="h-3.5 w-3.5 text-sage" /> {previewOpen ? 'Hide Preview' : 'Preview Video'}
            </button>
            <button
              type="button"
              onClick={() => uploadedVideoId && onVideoReady(uploadedVideoId)}
              className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark shadow-xs"
            >
              Attach to Lesson
            </button>
          </div>

          {previewOpen && uploadedVideoId && (
            <div className="mt-3">
              <SecureBunnyPlayer
                request={{ action: 'getAdminPlayback', videoId: uploadedVideoId }}
                title={lessonTitle}
              />
            </div>
          )}
        </div>
      )}

      {/* STAGE: ERROR */}
      {stage === 'error' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 text-terracotta text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Upload Failed</p>
              <p className="text-xs text-warm-gray mt-1">{errorMessage ?? 'An error occurred.'}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStage('idle')}
              className="rounded-full bg-sage px-4 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
