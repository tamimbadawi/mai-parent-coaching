import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type UserRole = 'student' | 'admin';

type CreateUserPayload = {
  action: 'createUser';
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
};

type UpdateUserPayload = {
  action: 'updateUser';
  userId: string;
  email: string;
  password?: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
};

type DeleteUserPayload = {
  action: 'deleteUser';
  userId: string;
};

type Payload = CreateUserPayload | UpdateUserPayload | DeleteUserPayload;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    // ── Step 1: check env vars ──────────────────────────────────────────────
    const supabaseUrl     = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey         = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader      = request.headers.get('Authorization');
    const token           = authHeader?.replace('Bearer ', '') ?? null;

    const diagnostics = {
      has_supabase_url:      !!supabaseUrl,
      has_service_role_key:  !!serviceRoleKey,
      has_anon_key:          !!anonKey,
      has_auth_header:       !!authHeader,
      has_token:             !!token,
      token_length:          token?.length ?? 0,
    };

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ step: 'env_check', error: 'Missing env vars', diagnostics }, 500);
    }

    // ── Step 2: try getUser with admin client ───────────────────────────────
    if (!token) {
      return json({ step: 'token_check', error: 'No token provided', diagnostics }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData.user) {
      return json({
        step: 'get_user',
        error: userError?.message ?? 'No user returned',
        diagnostics,
      }, 401);
    }

    const userId = userData.user.id;

    // ── Step 3: fetch profile ───────────────────────────────────────────────
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, role, approval_status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return json({ step: 'profile_fetch', error: profileError.message, userId, diagnostics }, 500);
    }

    if (!profile) {
      return json({ step: 'profile_fetch', error: 'No profile row found', userId, diagnostics }, 404);
    }

    if (profile.role !== 'admin') {
      return json({ step: 'role_check', error: 'Not an admin', profile, diagnostics }, 403);
    }

    // ── Step 4: all good — parse action and run it ─────────────────────────
    const payload = (await request.json()) as Payload;

    if (payload.action === 'createUser') {
      const cleanPhone = (payload.phone ?? '').replace(/\D/g, '');
      if (!payload.phone || cleanPhone.length < 7) {
        return json({ step: 'validate_phone', error: 'A valid working phone number is required (minimum 7 digits).' }, 400);
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: payload.approvalStatus === 'approved',
        user_metadata: { full_name: payload.fullName, phone: payload.phone, country: payload.country ?? null },
      });

      if (error || !data.user) {
        return json({ step: 'create_auth_user', error: error?.message ?? 'Unable to create user.' }, 400);
      }

      const profilePatch = {
        id: data.user.id,
        email: payload.email,
        full_name: payload.fullName ?? null,
        phone: payload.phone ?? null,
        country: payload.country ?? null,
        role: payload.role ?? 'student',
        approval_status: payload.approvalStatus ?? 'approved',
        approved_at: (payload.approvalStatus ?? 'approved') === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data: newProfile, error: profileInsertError } = await adminClient
        .from('profiles')
        .upsert(profilePatch, { onConflict: 'id' })
        .select('*')
        .single();

      if (profileInsertError) {
        return json({ step: 'upsert_profile', error: profileInsertError.message }, 400);
      }

      await adminClient
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('entity_id', data.user.id)
        .eq('type', 'new_user_registration')
        .is('read_at', null);

      if (newProfile?.phone && newProfile.approval_status === 'approved') {
        fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            trigger: 'onboarding',
            recipient_phone: newProfile.phone,
            recipient_name: newProfile.full_name,
          }),
        }).catch((err) => console.warn('Admin createUser onboarding dispatch notice:', err));
      }

      return json({ profile: newProfile });
    }

    if (payload.action === 'updateUser') {
      const metadataUpdates: Record<string, unknown> = {
        full_name: payload.fullName,
      };
      if (payload.phone !== undefined) metadataUpdates.phone = payload.phone;
      if (payload.country !== undefined) metadataUpdates.country = payload.country;

      const authUpdates: Record<string, unknown> = {
        email: payload.email,
        user_metadata: metadataUpdates,
      };
      if (payload.password?.trim()) authUpdates.password = payload.password;
      if (payload.approvalStatus === 'approved') authUpdates.email_confirm = true;

      const { error: authError } = await adminClient.auth.admin.updateUserById(payload.userId, authUpdates);
      if (authError) return json({ step: 'update_auth_user', error: authError.message }, 400);

      const profileUpdates: Record<string, unknown> = {
        full_name: payload.fullName ?? null,
        phone: payload.phone ?? null,
        role: payload.role ?? 'student',
        approval_status: payload.approvalStatus ?? 'pending',
        approved_at: payload.approvalStatus === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (payload.country !== undefined) {
        profileUpdates.country = payload.country;
      }

      const { data: updatedProfile, error: profileUpdateError } = await adminClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', payload.userId)
        .select('*')
        .single();

      if (profileUpdateError) return json({ step: 'update_profile', error: profileUpdateError.message }, 400);

      if (payload.approvalStatus !== 'pending') {
        await adminClient
          .from('admin_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('entity_id', payload.userId)
          .eq('type', 'new_user_registration')
          .is('read_at', null);
      }

      if (updatedProfile?.phone && updatedProfile.approval_status === 'approved') {
        fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            trigger: 'onboarding',
            recipient_phone: updatedProfile.phone,
            recipient_name: updatedProfile.full_name,
          }),
        }).catch((err) => console.warn('Admin updateUser onboarding dispatch notice:', err));
      }

      return json({ profile: updatedProfile });
    }

    if (payload.action === 'deleteUser') {
      const { error } = await adminClient.auth.admin.deleteUser(payload.userId);
      if (error) return json({ step: 'delete_user', error: error.message }, 400);

      await adminClient
        .from('admin_notifications')
        .delete()
        .eq('entity_id', payload.userId)
        .eq('entity_type', 'profile');

      return json({ success: true });
    }

    return json({ error: 'Unsupported action.' }, 400);

  } catch (err) {
    return json({ step: 'uncaught', error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
