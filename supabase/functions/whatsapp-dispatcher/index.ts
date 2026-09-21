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

export type MessageType =
  | 'onboarding'
  | 'booking_confirmation'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'follow_up'
  | 'manual';

interface DispatchPayload {
  trigger: MessageType;
  recipient_phone?: string;
  recipient_name?: string | null;
  related_booking_id?: string | null;
  message_content?: string;
  params?: Record<string, string>;
}

// Canonical Templates (matching services/whatsapp-bot/src/templates.js)
function renderTemplate(type: MessageType, params: Record<string, string>): string {
  const parentName = params.parentName || 'Parent';
  const appointmentType = params.appointmentType || 'Coaching Session';
  const date = params.date || '';
  const time = params.time || '';
  const tz = params.timezone ? ` (${params.timezone})` : '';
  const meetingLink = params.meetingLink || 'https://meet.google.com';

  switch (type) {
    case 'onboarding':
      return `Hello ${parentName},\n\nWelcome to Mai's Parent Coaching. I am truly glad you are here. My focus is to offer you a calm, evidence-based, and compassionate space for your family's parenting journey.\n\nFeel free to reply to this number whenever you need guidance or have a question.\n\nWarmly,\nMai`;

    case 'booking_confirmation':
      return `Dear ${parentName},\n\nYour coaching session for *${appointmentType}* has been confirmed.\n\n🗓 *Date:* ${date}\n⏰ *Time:* ${time}${tz}\n🔗 *Meeting Link:* ${meetingLink}\n\nPlease take a few moments before our call to be in a quiet, comfortable space. If you need to reschedule or have questions beforehand, simply reply to this message.\n\nLooking forward to speaking with you,\nMai`;

    case 'reminder_24h':
      return `Hi ${parentName},\n\nThis is a gentle reminder that your session for *${appointmentType}* is scheduled for tomorrow at *${time}${tz}*.\n\n🔗 *Meeting Link:* ${meetingLink}\n\nTake a deep breath and give yourself credit for showing up for yourself and your family. See you tomorrow!\n\nWarm regards,\nMai`;

    case 'reminder_1h':
      return `Hi ${parentName},\n\nOur session (*${appointmentType}*) starts in approximately 1 hour.\n\nGrab a warm drink, make yourself comfortable, and click here when ready to join:\n🔗 ${meetingLink}\n\nSee you shortly,\nMai`;

    case 'follow_up':
      return `Dear ${parentName},\n\nThank you for sharing your time and vulnerability during our session. Remember that meaningful change happens one small, patient moment at a time.\n\nWishing you a grounded and calm day ahead.\n\nWith care,\nMai`;

    case 'manual':
      return params.text || '';

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
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

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfigured: Supabase credentials missing.', code: 'SERVER_MISCONFIGURED' }, 500);
    }

    // Verify caller authentication
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('apikey')?.trim();
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;

    const isServiceRole =
      (token && (token === supabaseServiceKey || token === plainServiceKey)) ||
      (apiKeyHeader && (apiKeyHeader === supabaseServiceKey || apiKeyHeader === plainServiceKey));

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!isServiceRole) {
      if (!token) {
        return json({ error: 'Unauthorized: Missing Authorization header.', code: 'AUTH_TOKEN_MISSING' }, 401);
      }

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData?.user) {
        return json({ error: 'Unauthorized: Invalid token.', code: 'AUTH_TOKEN_INVALID' }, 401);
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        return json({ error: 'Forbidden: Admin or service role privileges required.', code: 'ADMIN_REQUIRED' }, 403);
      }
    }

    // Parse payload
    const payload = (await request.json()) as DispatchPayload;
    const { trigger, related_booking_id } = payload;

    const validTriggers: MessageType[] = [
      'onboarding',
      'booking_confirmation',
      'reminder_24h',
      'reminder_1h',
      'follow_up',
      'manual',
    ];

    if (!trigger || !validTriggers.includes(trigger)) {
      return json({ error: `Invalid trigger type. Allowed: ${validTriggers.join(', ')}`, code: 'INVALID_TRIGGER' }, 400);
    }

    // 1. Automatic 5-minute stale pending sweep
    try {
      await supabaseAdmin.rpc('sweep_stale_whatsapp_messages', { timeout_minutes: 5 });
    } catch (err: any) {
      console.warn('sweep_stale_whatsapp_messages warning:', err?.message);
    }

    let recipientPhone = payload.recipient_phone?.trim() || '';
    let recipientName = payload.recipient_name?.trim() || null;
    let messageContent = payload.message_content || '';
    const templateParams: Record<string, string> = { ...payload.params };

    // If related to a booking, load booking details from DB
    if (related_booking_id) {
      const { data: booking, error: bErr } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', related_booking_id)
        .single();

      if (bErr || !booking) {
        return json({ error: 'Related booking not found.', code: 'BOOKING_NOT_FOUND' }, 404);
      }

      recipientPhone = recipientPhone || booking.phone || '';
      recipientName = recipientName || booking.parent_name || null;
      templateParams.parentName = templateParams.parentName || booking.parent_name;
      templateParams.appointmentType = templateParams.appointmentType || booking.appointment_type_title;
      templateParams.date = templateParams.date || booking.appointment_date;
      templateParams.time = templateParams.time || booking.appointment_time;
      templateParams.timezone = templateParams.timezone || booking.time_zone;
      templateParams.meetingLink = templateParams.meetingLink || booking.google_meet_url || 'https://meet.google.com';
    }

    if (!recipientPhone) {
      return json({ error: 'Recipient phone number is required.', code: 'RECIPIENT_PHONE_REQUIRED' }, 400);
    }

    // Format phone: digits only, ensure leading +
    const cleanDigits = recipientPhone.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      return json({ error: 'Invalid phone number (minimum 7 digits required).', code: 'INVALID_PHONE' }, 400);
    }
    const cleanPhone = `+${cleanDigits}`;

    // Check Automation Rules from DB for enabled status and custom template
    if (trigger !== 'manual') {
      try {
        const { data: rule } = await supabaseAdmin
          .from('whatsapp_automation_rules')
          .select('is_enabled, template_content')
          .eq('trigger_type', trigger)
          .maybeSingle();

        if (rule) {
          // If the admin disabled this automated trigger, skip dispatch cleanly
          if (!rule.is_enabled) {
            console.log(`[DISPATCHER] Automated trigger "${trigger}" is disabled by admin rule. Skipping.`);
            return json({
              success: true,
              skipped: true,
              reason: 'TRIGGER_DISABLED_BY_ADMIN',
              message: `Automated trigger "${trigger}" is currently disabled in Automation Rules.`,
              trigger,
            });
          }

          // If a template is defined in the database and not pre-rendered, interpolate it
          if (rule.template_content && !messageContent) {
            templateParams.parentName = templateParams.parentName || recipientName || 'Parent';
            templateParams.appointmentType = templateParams.appointmentType || 'Coaching Session';
            templateParams.date = templateParams.date || '';
            templateParams.time = templateParams.time || '';
            templateParams.timezone = templateParams.timezone ? ` (${templateParams.timezone})` : '';
            templateParams.meetingLink = templateParams.meetingLink || 'https://meet.google.com';

            let rendered = rule.template_content;
            for (const [k, v] of Object.entries(templateParams)) {
              rendered = rendered.replaceAll(`{${k}}`, v || '');
            }
            messageContent = rendered;
          }
        }
      } catch (err: any) {
        console.warn('Failed to evaluate automation rule, falling back to canonical template:', err?.message);
      }
    }

    // Render message content with canonical fallback if not pre-rendered
    if (!messageContent) {
      if (trigger === 'manual') {
        return json({ error: 'Manual message requires message_content.', code: 'CONTENT_REQUIRED' }, 400);
      }
      templateParams.parentName = templateParams.parentName || recipientName || 'Parent';
      messageContent = renderTemplate(trigger, templateParams);
    }

    // 2. Duplicate Prevention Check (App-level check)
    // Avoid re-sending if already sent or currently pending within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    if (related_booking_id && trigger !== 'manual') {
      const { data: existingBookingMsg } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id, status, created_at')
        .eq('related_booking_id', related_booking_id)
        .eq('message_type', trigger)
        .or(`status.eq.sent,and(status.eq.pending,created_at.gte.${fiveMinutesAgo})`)
        .limit(1)
        .maybeSingle();

      if (existingBookingMsg) {
        return json({
          success: true,
          skipped: true,
          reason: `DUPLICATE_${trigger.toUpperCase()}_PREVENTED`,
          message: `A ${trigger} message has already been processed for booking ${related_booking_id}.`,
          existingMessageId: existingBookingMsg.id,
          existingStatus: existingBookingMsg.status,
        });
      }
    } else if (trigger === 'onboarding') {
      const { data: existingOnboardingMsg } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id, status, created_at')
        .eq('recipient_phone', cleanPhone)
        .eq('message_type', 'onboarding')
        .or(`status.eq.sent,and(status.eq.pending,created_at.gte.${fiveMinutesAgo})`)
        .limit(1)
        .maybeSingle();

      if (existingOnboardingMsg) {
        return json({
          success: true,
          skipped: true,
          reason: 'DUPLICATE_ONBOARDING_PREVENTED',
          message: `An onboarding message has already been processed for ${cleanPhone}.`,
          existingMessageId: existingOnboardingMsg.id,
          existingStatus: existingOnboardingMsg.status,
        });
      }
    }

    // 3. Stage 1 Persistence: Insert row as 'pending'
    const { data: messageRecord, error: insertErr } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        recipient_phone: cleanPhone,
        recipient_name: recipientName,
        message_type: trigger,
        message_content: messageContent,
        related_booking_id: related_booking_id || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      // If DB partial unique index rejects, it was a duplicate race condition
      if (insertErr.code === '23505') {
        return json({
          success: true,
          skipped: true,
          reason: 'DUPLICATE_RACE_PREVENTED',
          message: 'Concurrent duplicate detected by database constraint.',
        });
      }
      return json({ error: `Failed to record message history: ${insertErr.message}`, code: 'DB_INSERT_FAILED' }, 500);
    }

    const messageRowId = messageRecord.id;

    // 4. Dispatch to WhatsApp microservice
    const serviceUrl = Deno.env.get('WHATSAPP_SERVICE_URL');
    const serviceSecret = Deno.env.get('WHATSAPP_API_SECRET_KEY');

    if (!serviceUrl || !serviceSecret) {
      await supabaseAdmin
        .from('whatsapp_messages')
        .update({
          status: 'failed',
          error_message: 'WHATSAPP_SERVICE_URL or WHATSAPP_API_SECRET_KEY is not configured.',
        })
        .eq('id', messageRowId);

      return json({
        success: false,
        messageId: messageRowId,
        status: 'failed',
        error: 'WhatsApp service credentials missing on server.',
        code: 'WHATSAPP_NOT_CONFIGURED',
      }, 503);
    }

    const cleanServiceUrl = serviceUrl.replace(/\/+$/, '');
    const sendEndpoint = `${cleanServiceUrl}/send-message`;

    try {
      const upstreamRes = await fetch(sendEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanPhone,
          text: messageContent,
        }),
      });

      const responseText = await upstreamRes.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = null;
      }

      // Microservice returns 200 (confirmed sent) or 202 (submitted)
      if (upstreamRes.ok || upstreamRes.status === 202) {
        const whatsappMsgId = responseJson?.messageId || responseJson?.jobId || null;

        await supabaseAdmin
          .from('whatsapp_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            whatsapp_message_id: whatsappMsgId,
          })
          .eq('id', messageRowId);

        return json({
          success: true,
          messageId: messageRowId,
          status: 'sent',
          whatsappMessageId: whatsappMsgId,
          deliveryConfirmed: responseJson?.deliveryConfirmed ?? true,
        });
      } else {
        const errorReason = responseJson?.error || responseJson?.message || `Upstream returned HTTP ${upstreamRes.status}`;

        await supabaseAdmin
          .from('whatsapp_messages')
          .update({
            status: 'failed',
            error_message: errorReason,
          })
          .eq('id', messageRowId);

        return json({
          success: false,
          messageId: messageRowId,
          status: 'failed',
          error: errorReason,
          code: responseJson?.code || 'SEND_FAILED',
        }, upstreamRes.status >= 400 && upstreamRes.status < 600 ? upstreamRes.status : 502);
      }
    } catch (networkErr: any) {
      const errMsg = networkErr?.message || 'Network dispatch failed';
      await supabaseAdmin
        .from('whatsapp_messages')
        .update({
          status: 'failed',
          error_message: errMsg,
        })
        .eq('id', messageRowId);

      return json({
        success: false,
        messageId: messageRowId,
        status: 'failed',
        error: errMsg,
        code: 'NETWORK_ERROR',
      }, 502);
    }
  } catch (err: any) {
    return json({ error: err?.message || 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
  }
});
