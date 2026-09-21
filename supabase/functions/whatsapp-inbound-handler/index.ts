import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface InboundPayload {
  from: string;
  body: string;
  isOptOut?: boolean;
  isOptIn?: boolean;
  timestamp?: string;
  whatsappMessageId?: string | null;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
    const plainServiceKey = (Deno.env.get('SERVICE_ROLE_KEY') ?? '').trim();
    const serviceRoleKey = supabaseServiceKey || plainServiceKey;
    const serviceSecretKey = (Deno.env.get('WHATSAPP_API_SECRET_KEY') ?? '').trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfigured: missing Supabase credentials' }, 500);
    }

    // Authenticate: Must supply serviceRoleKey or WHATSAPP_API_SECRET_KEY
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('apikey')?.trim();
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader || null;

    const isAuthorized =
      Boolean(token) &&
      (token === supabaseServiceKey ||
        token === plainServiceKey ||
        (Boolean(serviceSecretKey) && token === serviceSecretKey));

    if (!isAuthorized) {
      return json({ error: 'Unauthorized: Invalid service secret token.' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = (await request.json()) as InboundPayload;
    const { from, body, isOptOut, isOptIn, timestamp, whatsappMessageId } = payload;

    if (!from || !body) {
      return json({ error: 'Missing required parameters: from and body.' }, 400);
    }

    const cleanPhone = from.trim();
    const phoneVariants = [
      cleanPhone,
      cleanPhone.replace(/^\+/, ''),
      cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
    ];

    let profileUpdated = false;

    // 1. If Opt-Out keyword, update matching profile
    if (isOptOut) {
      const { data: updatedProfiles } = await supabaseAdmin
        .from('profiles')
        .update({
          engagement_status: 'opted_out',
          updated_at: new Date().toISOString(),
        })
        .in('phone', phoneVariants)
        .select('id, full_name, engagement_status');

      if (updatedProfiles && updatedProfiles.length > 0) {
        profileUpdated = true;
      }
    } else if (isOptIn) {
      // 2. If Opt-In keyword, re-activate matching profile
      const { data: updatedProfiles } = await supabaseAdmin
        .from('profiles')
        .update({
          engagement_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .in('phone', phoneVariants)
        .select('id, full_name, engagement_status');

      if (updatedProfiles && updatedProfiles.length > 0) {
        profileUpdated = true;
      }
    }

    // 3. Log inbound message in whatsapp_messages for unified history
    const { data: insertedMsg, error: msgErr } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        recipient_phone: cleanPhone,
        message_type: 'inbound',
        message_content: body,
        status: 'sent', // marks successfully received & processed
        whatsapp_message_id: whatsappMessageId || null,
        sent_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      })
      .select('id')
      .single();

    if (msgErr) {
      console.warn('Failed to insert inbound record into whatsapp_messages:', msgErr.message);
    }

    return json({
      success: true,
      message_id: insertedMsg?.id || null,
      opted_out: Boolean(isOptOut),
      opted_in: Boolean(isOptIn),
      profile_updated: profileUpdated,
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Inbound handler failed' }, 500);
  }
});
