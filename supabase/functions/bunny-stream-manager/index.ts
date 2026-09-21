import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { courseVideoIds } from '../../../src/data/courseVideoIds.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RequestPayload =
  | { action: 'getStatus' }
  | { action: 'listVideos'; page?: number; itemsPerPage?: number }
  | { action: 'getAdminPlayback'; videoId?: string; lessonId?: string }
  | { action: 'getPlayback'; courseId: string; lessonId: string }
  | { action: 'saveProgress'; courseId: string; lessonId: string; seconds: number; completed: boolean }
  | { action: 'createUpload'; title: string }
  | { action: 'getVideoStatus'; videoId: string }
  | { action: 'deleteVideo'; videoId: string }
  | { action: 'getMaterialAccess'; materialId: string };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getConfig = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const serviceRoleKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY'))?.trim() ?? '';
  const libraryId = Deno.env.get('BUNNY_STREAM_LIBRARY_ID')?.trim() ?? '';
  const apiKey = Deno.env.get('BUNNY_STREAM_API_KEY')?.trim() ?? '';
  const cdnHostname = Deno.env.get('BUNNY_STREAM_CDN_HOSTNAME')?.trim() ?? '';
  const embedTokenKey = Deno.env.get('BUNNY_STREAM_EMBED_TOKEN_KEY')?.trim() ?? '';

  return {
    supabaseUrl,
    serviceRoleKey,
    libraryId,
    apiKey,
    cdnHostname,
    embedTokenKey,
    configured: Boolean(libraryId && apiKey),
  };
};

const getViewer = async (config: ReturnType<typeof getConfig>, authHeader: string | null) => {
  if (!config.supabaseUrl || !config.serviceRoleKey) {
    return { error: json({ error: 'Missing Supabase configuration.' }, 500) };
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: json({ error: 'Missing bearer token.' }, 401) };
  }

  const token = authHeader.replace('Bearer ', '');
  const client = createClient(config.supabaseUrl, config.serviceRoleKey);
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) {
    return { error: json({ error: 'Unauthorized request.' }, 401) };
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'student' | 'admin' }>();

  if (profileError || !profile) {
    return { error: json({ error: 'User profile is unavailable.' }, 403) };
  }

  return { client, user, role: profile.role };
};

const signedEmbedUrl = async (libraryId: string, videoId: string, key: string): Promise<string> => {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const bytes = new TextEncoder().encode(`${key}${videoId}${expires}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const token = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?token=${token}&expires=${expires}`;
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const payload = (await request.json()) as RequestPayload;
    const config = getConfig();
    const viewer = await getViewer(config, request.headers.get('Authorization'));
    if (viewer.error) return viewer.error;

    // --- STUDENT & GENERAL ACCESS ACTIONS ---

    if (payload.action === 'getPlayback' || payload.action === 'saveProgress') {
      if (typeof payload.courseId !== 'string' || typeof payload.lessonId !== 'string') {
        return json({ error: 'Invalid parameters.' }, 400);
      }

      // Check database first, then static map fallback
      let bunnyVideoId: string | null = null;
      let isPreview = false;

      const { data: dbLesson } = await viewer.client
        .from('course_lessons')
        .select('id, course_id, bunny_video_id, status, is_preview')
        .eq('course_id', payload.courseId)
        .eq('id', payload.lessonId)
        .maybeSingle();

      if (dbLesson) {
        if (dbLesson.status !== 'published' && viewer.role !== 'admin') {
          return json({ error: 'Lesson is not published.' }, 403);
        }
        bunnyVideoId = dbLesson.bunny_video_id;
        isPreview = dbLesson.is_preview;
      } else if (
        Object.prototype.hasOwnProperty.call(courseVideoIds, payload.courseId) &&
        Object.prototype.hasOwnProperty.call(courseVideoIds[payload.courseId], payload.lessonId)
      ) {
        bunnyVideoId = courseVideoIds[payload.courseId][payload.lessonId];
      }

      if (!bunnyVideoId || !/^[a-f0-9-]{36}$/i.test(bunnyVideoId)) {
        return json({ error: 'Lesson video is unavailable.' }, 404);
      }

      if (!config.libraryId || !config.embedTokenKey) {
        return json({ error: 'Secure playback is not configured.' }, 503);
      }

      // If not preview and not admin, verify active enrollment
      if (!isPreview && viewer.role !== 'admin') {
        const { data: enrollment, error: enrollError } = await viewer.client
          .from('course_enrollments')
          .select('id')
          .eq('user_id', viewer.user.id)
          .eq('course_id', payload.courseId)
          .eq('status', 'active')
          .maybeSingle();

        if (enrollError) return json({ error: 'Could not verify enrollment.' }, 500);
        if (!enrollment) return json({ error: 'Active enrollment is required.' }, 403);
      }

      if (payload.action === 'saveProgress') {
        if (!Number.isFinite(payload.seconds) || payload.seconds < 0 || payload.seconds > 86400 || typeof payload.completed !== 'boolean') {
          return json({ error: 'Invalid progress.' }, 400);
        }
        const { error: saveError } = await viewer.client.from('video_progress').upsert(
          {
            user_id: viewer.user.id,
            course_id: payload.courseId,
            video_id: payload.lessonId,
            progress_seconds: Math.floor(payload.seconds),
            completed: payload.completed,
            last_watched_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,course_id,video_id' }
        );
        return saveError ? json({ error: 'Could not save progress.' }, 500) : json({ saved: true });
      }

      const { data: progress, error: progressError } = await viewer.client
        .from('video_progress')
        .select('progress_seconds, completed')
        .eq('user_id', viewer.user.id)
        .eq('course_id', payload.courseId)
        .eq('video_id', payload.lessonId)
        .maybeSingle();

      if (progressError) return json({ error: 'Could not load progress.' }, 500);

      return json({
        url: await signedEmbedUrl(config.libraryId, bunnyVideoId, config.embedTokenKey),
        progressSeconds: progress?.progress_seconds ?? 0,
        completed: progress?.completed ?? false,
      });
    }

    if (payload.action === 'getMaterialAccess') {
      if (typeof payload.materialId !== 'string') {
        return json({ error: 'Invalid material ID.' }, 400);
      }

      const { data: material, error: matError } = await viewer.client
        .from('course_materials')
        .select('*')
        .eq('id', payload.materialId)
        .maybeSingle();

      if (matError || !material) {
        return json({ error: 'Material not found.' }, 404);
      }

      // Check enrollment requirement
      if (material.is_enrolled_only && viewer.role !== 'admin') {
        const { data: enrollment, error: enrollError } = await viewer.client
          .from('course_enrollments')
          .select('id')
          .eq('user_id', viewer.user.id)
          .eq('course_id', material.course_id)
          .eq('status', 'active')
          .maybeSingle();

        if (enrollError || !enrollment) {
          return json({ error: 'Active enrollment is required to access this material.' }, 403);
        }
      }

      if (material.type === 'link' || material.external_url) {
        return json({ url: material.external_url });
      }

      if (material.file_path) {
        const { data: signedData, error: signError } = await viewer.client.storage
          .from('course-materials')
          .createSignedUrl(material.file_path, 300); // 5 minute signed URL

        if (signError || !signedData?.signedUrl) {
          return json({ error: 'Could not generate download link.' }, 500);
        }

        return json({ url: signedData.signedUrl });
      }

      return json({ error: 'Material content unavailable.' }, 404);
    }

    // --- ADMIN ONLY ACTIONS ---

    if (viewer.role !== 'admin') return json({ error: 'Admin access is required.' }, 403);

    if (payload.action === 'createUpload') {
      if (!config.configured) return json({ error: 'Bunny Stream is not configured.' }, 503);
      const title = (payload.title || 'Untitled Lesson Video').trim();

      // 1. Create video object in Bunny library
      const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos`, {
        method: 'POST',
        headers: {
          AccessKey: config.apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return json({ error: `Bunny video creation failed: ${errText}` }, 400);
      }

      const videoData = (await response.json()) as { guid: string };
      const videoId = videoData.guid;

      // 2. Compute TUS authorization signature: SHA256(LibraryId + ApiKey + Expiration + VideoId)
      const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours
      const rawSignatureStr = `${config.libraryId}${config.apiKey}${expirationTime}${videoId}`;
      const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawSignatureStr));
      const signature = Array.from(new Uint8Array(hashBytes), (b) => b.toString(16).padStart(2, '0')).join('');

      return json({
        videoId,
        libraryId: config.libraryId,
        expirationTime,
        signature,
        uploadEndpoint: 'https://video.bunnycdn.com/tusupload',
      });
    }

    if (payload.action === 'getVideoStatus') {
      if (!config.configured) return json({ error: 'Bunny Stream is not configured.' }, 503);
      if (typeof payload.videoId !== 'string' || !/^[a-f0-9-]{36}$/i.test(payload.videoId)) {
        return json({ error: 'Invalid video ID.' }, 400);
      }

      const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos/${payload.videoId}`, {
        headers: { AccessKey: config.apiKey, accept: 'application/json' },
      });

      if (!response.ok) {
        return json({ error: 'Video not found in Bunny library.' }, 404);
      }

      const video = (await response.json()) as {
        guid: string;
        title: string;
        status: number;
        encodeProgress: number;
        length: number;
        totalSize: number;
      };

      return json({
        guid: video.guid,
        title: video.title,
        status: video.status, // 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding, 4=Ready, 5=Failed
        encodeProgress: video.encodeProgress ?? 0,
        length: video.length ?? 0,
        totalSize: video.totalSize ?? 0,
      });
    }

    if (payload.action === 'getAdminPlayback') {
      if (!config.configured || !config.embedTokenKey) return json({ error: 'Secure playback is not configured.' }, 503);

      let videoId = payload.videoId;
      if (!videoId && payload.lessonId) {
        const { data: lesson } = await viewer.client
          .from('course_lessons')
          .select('bunny_video_id')
          .eq('id', payload.lessonId)
          .maybeSingle();
        videoId = lesson?.bunny_video_id ?? undefined;
      }

      if (typeof videoId !== 'string' || !/^[a-f0-9-]{36}$/i.test(videoId)) {
        return json({ error: 'Invalid Bunny video ID.' }, 400);
      }

      const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos/${videoId}`, {
        headers: { AccessKey: config.apiKey, accept: 'application/json' },
      });

      if (!response.ok) return json({ error: 'Video is unavailable in this library.' }, 404);
      const video = (await response.json()) as { status?: number };
      if (video.status !== 4) return json({ error: 'Video is still processing.' }, 409);
      return json({ url: await signedEmbedUrl(config.libraryId, videoId, config.embedTokenKey) });
    }

    if (payload.action === 'deleteVideo') {
      if (!config.configured) return json({ error: 'Bunny Stream is not configured.' }, 503);
      if (typeof payload.videoId !== 'string' || !/^[a-f0-9-]{36}$/i.test(payload.videoId)) {
        return json({ error: 'Invalid video ID.' }, 400);
      }
      const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos/${payload.videoId}`, {
        method: 'DELETE',
        headers: { AccessKey: config.apiKey, accept: 'application/json' },
      });
      if (!response.ok && response.status !== 404) {
        const errText = await response.text();
        return json({ error: `Could not delete video: ${errText}` }, 400);
      }
      return json({ success: true });
    }

    if (payload.action === 'getStatus') {
      return json({
        configured: config.configured,
        libraryId: config.libraryId || null,
        cdnHostname: config.cdnHostname || null,
        hasApiKey: Boolean(config.apiKey),
        hasEmbedTokenKey: Boolean(config.embedTokenKey),
      });
    }

    if (payload.action === 'listVideos') {
      if (!config.configured) return json({ error: 'Bunny Stream is not configured in function secrets.' }, 400);
      const page = payload.page ?? 1;
      const itemsPerPage = payload.itemsPerPage ?? 12;
      const response = await fetch(
        `https://video.bunnycdn.com/library/${config.libraryId}/videos?page=${page}&itemsPerPage=${itemsPerPage}`,
        {
          headers: {
            AccessKey: config.apiKey,
            accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        const message = await response.text();
        return json({ error: `Bunny API error: ${message}` }, 400);
      }

      const data = await response.json();
      return json({ videos: data.items ?? [], totalItems: data.totalItems ?? 0 });
    }

    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected Bunny Stream error.' }, 500);
  }
});
