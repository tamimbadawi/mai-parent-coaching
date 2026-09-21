/**
 * Frontend client helper for WhatsApp Administration.
 *
 * Communicates exclusively with the server-side Supabase Edge Function proxy
 * (`admin-whatsapp-manager`) using the current user's authenticated Supabase session.
 *
 * Microservice secrets and VM endpoints are NEVER accessed directly by browser code.
 */

import { supabase } from './supabase';

export type WhatsAppClientState =
  | 'INITIALIZING'
  | 'QR_READY'
  | 'AUTHENTICATED'
  | 'READY'
  | 'AUTH_FAILURE'
  | 'DISCONNECTED'
  | 'RESETTING'
  | 'ERROR';

export interface WhatsAppClientInfo {
  state: WhatsAppClientState;
  ready: boolean;
  authenticated: boolean;
  phone: string;
  clientName: string | null;
  hasQr: boolean;
  qrTimestamp: string | null;
  generation: number;
  lastError: string | null;
}

export interface WhatsAppQueueInfo {
  queueLength: number;
  isProcessing: boolean;
  isSending?: boolean;
  generation: number;
  totalProcessed: number;
  totalFailed: number;
  maxSize: number;
}

export interface WhatsAppStatusResponse {
  status: string;
  uptime?: number;
  client: WhatsAppClientInfo;
  queue: WhatsAppQueueInfo;
  timestamp?: string;
}

export interface WhatsAppQrResponse {
  status: 'ok' | 'unavailable';
  state: WhatsAppClientState;
  qr?: string; // base64 PNG data URL: "data:image/png;base64,..."
  timestamp?: string | null;
  ready?: boolean;
  message?: string;
}

export interface WhatsAppResetResponse {
  success: boolean;
  status: string;
  message: string;
}

export interface WhatsAppProxyResult<T> {
  data: T | null;
  error: string | null;
  code?: string;
  status: number;
}

/**
 * Invoke the server-side WhatsApp admin proxy Edge Function.
 */
async function invokeWhatsAppProxy<T>(
  action: 'status' | 'qr' | 'reset',
  confirm?: string
): Promise<WhatsAppProxyResult<T>> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData?.session?.access_token) {
      return {
        data: null,
        error: 'Authentication required. Please sign in again as an administrator.',
        code: 'AUTH_REQUIRED',
        status: 401,
      };
    }

    const token = sessionData.session.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        data: null,
        error: 'Frontend misconfiguration: Supabase project credentials are missing.',
        code: 'CONFIG_MISSING',
        status: 500,
      };
    }

    const functionUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/admin-whatsapp-manager`;

    const bodyPayload: Record<string, string> = { action };
    if (confirm) {
      bodyPayload.confirm = confirm;
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    const responseText = await response.text();
    let jsonBody: Record<string, unknown> = {};
    try {
      jsonBody = JSON.parse(responseText);
    } catch {
      jsonBody = { raw: responseText };
    }

    if (!response.ok) {
      const errorMessage =
        (typeof jsonBody.error === 'string' && jsonBody.error) ||
        (typeof jsonBody.message === 'string' && jsonBody.message) ||
        `Request failed with HTTP ${response.status}`;

      const errorCode = typeof jsonBody.code === 'string' ? jsonBody.code : undefined;

      return {
        data: null,
        error: errorMessage,
        code: errorCode,
        status: response.status,
      };
    }

    return {
      data: jsonBody as unknown as T,
      error: null,
      status: response.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network request failed';
    return {
      data: null,
      error: message,
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }
}

/**
 * Fetch live WhatsApp client status and operational queue metrics.
 */
export async function fetchWhatsAppStatus(): Promise<WhatsAppProxyResult<WhatsAppStatusResponse>> {
  return invokeWhatsAppProxy<WhatsAppStatusResponse>('status');
}

/**
 * Fetch current QR pairing code data URL.
 */
export async function fetchWhatsAppQr(): Promise<WhatsAppProxyResult<WhatsAppQrResponse>> {
  return invokeWhatsAppProxy<WhatsAppQrResponse>('qr');
}

/**
 * Trigger fail-closed session reset and unlink WhatsApp phone.
 * Requires explicit confirm: 'yes'.
 */
export async function resetWhatsAppSession(): Promise<WhatsAppProxyResult<WhatsAppResetResponse>> {
  return invokeWhatsAppProxy<WhatsAppResetResponse>('reset', 'yes');
}

export type WhatsAppMessageType =
  | 'onboarding'
  | 'booking_confirmation'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'follow_up'
  | 'manual';

export interface WhatsAppMessage {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_type: WhatsAppMessageType;
  message_content: string;
  related_booking_id: string | null;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
  whatsapp_message_id: string | null;
  created_at: string;
  booking?: {
    id: string;
    appointment_type_title: string;
    appointment_date: string;
    appointment_time: string;
  } | null;
}

export interface FetchMessagesFilter {
  status?: string;
  type?: string;
  search?: string;
  limit?: number;
}

/**
 * Fetch WhatsApp message history with filters.
 */
export async function fetchWhatsAppMessages(
  filter: FetchMessagesFilter = {}
): Promise<{ data: WhatsAppMessage[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('whatsapp_messages')
      .select('*, booking:bookings(id, appointment_type_title, appointment_date, appointment_time)')
      .order('created_at', { ascending: false });

    if (filter.status && filter.status !== 'all') {
      query = query.eq('status', filter.status);
    }

    if (filter.type && filter.type !== 'all') {
      query = query.eq('message_type', filter.type);
    }

    if (filter.search && filter.search.trim()) {
      const rawTerm = filter.search.trim();
      const orClauses: string[] = [
        `recipient_name.ilike.%${rawTerm}%`,
        `message_content.ilike.%${rawTerm}%`,
        `recipient_phone.ilike.%${rawTerm}%`,
      ];

      // Extract cleaned digits for phone searching across spaces, parentheses, hyphens, and country prefixes
      const digits = rawTerm.replace(/\D/g, '');
      if (digits.length >= 3) {
        orClauses.push(`recipient_phone.ilike.%${digits}%`);

        // If local format with leading zero (e.g. 011..., 05...), strip leading zeroes
        // to match international E.164 numbers (e.g. +2011..., +9665...)
        const withoutLeadingZero = digits.replace(/^0+/, '');
        if (withoutLeadingZero.length >= 4 && withoutLeadingZero !== digits) {
          orClauses.push(`recipient_phone.ilike.%${withoutLeadingZero}%`);
        }

        // Search significant 7+ digit suffix if available
        if (digits.length >= 7) {
          orClauses.push(`recipient_phone.ilike.%${digits.slice(-7)}%`);
        }
      }

      // Deduplicate clauses and combine with PostgREST OR
      const uniqueClauses = Array.from(new Set(orClauses));
      query = query.or(uniqueClauses.join(','));
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as unknown as WhatsAppMessage[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch WhatsApp messages',
    };
  }
}

/**
 * Dispatch a WhatsApp message through the central whatsapp-dispatcher Edge Function.
 */
export async function dispatchWhatsAppMessage(payload: {
  trigger: WhatsAppMessageType;
  recipient_phone?: string;
  recipient_name?: string | null;
  related_booking_id?: string | null;
  message_content?: string;
  params?: Record<string, string>;
}): Promise<{ data: any | null; error: string | null; skipped?: boolean }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const resData = await res.json().catch(() => null);

    if (!res.ok && res.status !== 202) {
      return {
        data: resData,
        error: resData?.error || `Dispatcher returned HTTP ${res.status}`,
      };
    }

    return {
      data: resData,
      error: null,
      skipped: !!resData?.skipped,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network failure calling dispatcher',
    };
  }
}

/**
 * Trigger scheduled reminder evaluations via whatsapp-scheduler Edge Function.
 */
export async function triggerWhatsAppScheduler(testPayload?: {
  test_trigger?: string;
  test_booking_id?: string;
}): Promise<{ data: any | null; error: string | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/whatsapp-scheduler`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload || {}),
    });

    const resData = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        data: resData,
        error: resData?.error || `Scheduler returned HTTP ${res.status}`,
      };
    }

    return { data: resData, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network failure calling scheduler',
    };
  }
}

export interface WhatsAppAutomationRule {
  id: string;
  trigger_type: 'onboarding' | 'booking_confirmation' | 'reminder_24h' | 'reminder_1h' | 'follow_up';
  title: string;
  description: string | null;
  template_content: string;
  is_enabled: boolean;
  available_variables: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all WhatsApp automation rules and templates.
 */
export async function fetchWhatsAppAutomationRules(): Promise<{
  data: WhatsAppAutomationRule[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_automation_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data as WhatsAppAutomationRule[]) || [], error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch automation rules',
    };
  }
}

/**
 * Update an automation rule's template content or enabled status.
 */
export async function updateWhatsAppAutomationRule(
  id: string,
  updates: { template_content?: string; is_enabled?: boolean }
): Promise<{ data: WhatsAppAutomationRule | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_automation_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as WhatsAppAutomationRule, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update automation rule',
    };
  }
}
