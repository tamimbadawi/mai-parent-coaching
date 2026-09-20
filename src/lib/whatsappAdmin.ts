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
