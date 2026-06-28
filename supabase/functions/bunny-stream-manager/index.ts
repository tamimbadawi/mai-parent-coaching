import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RequestPayload =
  | { action: 'getStatus' }
  | { action: 'listVideos'; page?: number; itemsPerPage?: number };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getConfig = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')?.trim() ?? '';
  const libraryId = Deno.env.get('BUNNY_STREAM_LIBRARY_ID')?.trim() ?? '';
  const apiKey = Deno.env.get('BUNNY_STREAM_API_KEY')?.trim() ?? '';
  const cdnHostname = Deno.env.get('BUNNY_STREAM_CDN_HOSTNAME')?.trim() ?? '';

  return {
    supabaseUrl,
    serviceRoleKey,
    libraryId,
    apiKey,
    cdnHostname,
    configured: Boolean(libraryId && apiKey),
  };
};

const ensureAdmin = async (config: ReturnType<typeof getConfig>, authHeader: string | null): Promise<Response | null> => {
  if (!config.supabaseUrl || !config.serviceRoleKey) {
    return json({ error: 'Missing service role configuration for admin validation.' }, 500);
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token.' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const client = createClient(config.supabaseUrl, config.serviceRoleKey);
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) {
    return json({ error: 'Unauthorized request.' }, 401);
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'student' | 'admin' }>();

  if (profileError || profile?.role !== 'admin') {
    return json({ error: 'Admin access is required.' }, 403);
  }

  return null;
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
    const authError = await ensureAdmin(config, request.headers.get('Authorization'));

    if (authError) {
      return authError;
    }

    if (payload.action === 'getStatus') {
      return json({
        configured: config.configured,
        libraryId: config.libraryId || null,
        cdnHostname: config.cdnHostname || null,
        hasApiKey: Boolean(config.apiKey),
      });
    }

    if (!config.configured) {
      return json({ error: 'Bunny Stream is not configured in function secrets.' }, 400);
    }

    if (payload.action === 'listVideos') {
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