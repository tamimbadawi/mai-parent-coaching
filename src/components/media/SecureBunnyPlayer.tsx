import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

type PlaybackRequest =
  | { action: 'getAdminPlayback'; videoId?: string; lessonId?: string }
  | { action: 'getPlayback'; courseId: string; lessonId: string };

interface SecureBunnyPlayerProps {
  request: PlaybackRequest;
  title: string;
}

interface BunnyPlayerInstance {
  on(event: string, callback: (data?: string | { seconds?: number; duration?: number }) => void): void;
  off(event: string): void;
  setCurrentTime(seconds: number): void;
}

declare global {
  interface Window {
    playerjs?: { Player: new (iframe: HTMLIFrameElement) => BunnyPlayerInstance };
  }
}

let playerScriptPromise: Promise<void> | null = null;
const loadPlayerScript = (): Promise<void> => {
  if (window.playerjs) return Promise.resolve();
  if (!playerScriptPromise) {
    playerScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { playerScriptPromise = null; reject(new Error('Video progress controls could not load.')); };
      document.head.appendChild(script);
    });
  }
  return playerScriptPromise;
};

export default function SecureBunnyPlayer({ request, title }: SecureBunnyPlayerProps): JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setUrl(null);
    setProgressError(null);
    const load = async () => {
      const { data, error: functionError } = await supabase.functions.invoke('bunny-stream-manager', { body: JSON.parse(requestKey) as PlaybackRequest });
      if (!active) return;
      if (functionError || typeof data?.url !== 'string') {
        setError(typeof data?.error === 'string' ? data.error : 'The video could not be loaded. Please try again.');
      } else {
        setUrl(data.url);
        setProgressSeconds(typeof data.progressSeconds === 'number' ? data.progressSeconds : 0);
        setAlreadyCompleted(data.completed === true);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [requestKey, attempt]);

  useEffect(() => {
    if (!url || request.action !== 'getPlayback') return;
    let active = true;
    let player: BunnyPlayerInstance | null = null;
    let lastSaved = 0;
    let completed = alreadyCompleted;
    let lastSeconds = progressSeconds;
    const payload = request;
    const save = async (seconds: number, done: boolean) => {
      const { error: saveError } = await supabase.functions.invoke('bunny-stream-manager', {
        body: { action: 'saveProgress', courseId: payload.courseId, lessonId: payload.lessonId, seconds, completed: done },
      });
      if (active && saveError) setProgressError('Your video position could not be saved.');
    };
    const connect = async () => {
      try {
        await loadPlayerScript();
        if (!active || !iframeRef.current || !window.playerjs) return;
        player = new window.playerjs.Player(iframeRef.current);
        player.on('ready', () => {
          if (progressSeconds > 0 && player) player.setCurrentTime(progressSeconds);
        });
        player.on('timeupdate', (raw) => {
          let data: { seconds?: number; duration?: number } | undefined;
          try { data = typeof raw === 'string' ? JSON.parse(raw) as { seconds?: number; duration?: number } : raw; } catch { return; }
          const seconds = data?.seconds;
          if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return;
          lastSeconds = seconds;
          if (Date.now() - lastSaved >= 15000) {
            lastSaved = Date.now();
            void save(seconds, completed);
          }
        });
        player.on('ended', () => {
          completed = true;
          void save(lastSeconds, true);
        });
      } catch {
        if (active) setProgressError('Playback is available, but progress tracking could not start.');
      }
    };
    void connect();
    return () => {
      active = false;
      player?.off('ready');
      player?.off('timeupdate');
      player?.off('ended');
    };
  }, [url, requestKey, progressSeconds, alreadyCompleted]);

  if (loading) return <div className="rounded-2xl bg-cream p-8 text-center text-warm-gray" role="status">Loading video…</div>;
  if (error || !url) return (
    <div className="rounded-2xl border border-beige bg-cream p-8 text-center text-warm-gray" role="alert">
      <p>{error ?? 'This video is unavailable.'}</p>
      <button type="button" className="mt-4 rounded-full bg-sage px-4 py-2 text-white" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
    </div>
  );
  return (
    <div>
      {progressError ? <p className="mb-3 text-sm text-terracotta" role="alert">{progressError}</p> : null}
      <div className="overflow-hidden rounded-[28px] border border-beige bg-charcoal shadow-sm">
      <div className="aspect-video w-full">
        <iframe ref={iframeRef} src={url} title={title} className="h-full w-full" loading="lazy" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen />
      </div>
      </div>
    </div>
  );
}
