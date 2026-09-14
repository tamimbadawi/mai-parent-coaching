// Google Calendar API Integration Client for Supabase Edge Functions

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface FreeBusyRequest {
  timeMin: string; // ISO 8601
  timeMax: string; // ISO 8601
  timeZone?: string;
  items: Array<{ id: string }>;
}

export interface FreeBusyBlock {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

interface FreeBusyResponse {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars: Record<
    string,
    {
      busy: FreeBusyBlock[];
      errors?: Array<{ domain: string; reason: string }>;
    }
  >;
}

export interface CalendarEventPayload {
  calendarId?: string;
  summary: string;
  description: string;
  startDateTime: string; // ISO 8601 string e.g. 2026-10-15T10:00:00+03:00
  endDateTime: string;   // ISO 8601 string e.g. 2026-10-15T11:00:00+03:00
  timeZone?: string;
  clientName: string;
  clientEmail: string;
  coachEmail?: string;
}

export interface CreatedCalendarEvent {
  id: string;
  htmlLink: string;
  status: string;
  hangoutLink?: string;
}

/**
 * Exchange the stored refresh token for a fresh Google OAuth2 access token.
 */
export async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google Calendar credentials. Please configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in Supabase secrets.'
    );
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to refresh Google OAuth token:', response.status, errorText);
    throw new Error(`Google token refresh failed: ${response.statusText}`);
  }

  const data = (await response.json()) as TokenResponse;
  return data.access_token;
}

/**
 * Query the FreeBusy API for busy intervals in the coach's calendar.
 */
export async function getCalendarFreeBusy(
  timeMin: string,
  timeMax: string,
  timeZone = 'UTC',
  calendarId?: string
): Promise<FreeBusyBlock[]> {
  const targetCalendarId = calendarId || Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary';
  const accessToken = await getGoogleAccessToken();

  const body: FreeBusyRequest = {
    timeMin,
    timeMax,
    timeZone,
    items: [{ id: targetCalendarId }],
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar FreeBusy error:', response.status, errorText);
    throw new Error(`FreeBusy query failed: ${response.statusText}`);
  }

  const data = (await response.json()) as FreeBusyResponse;
  const calendarData = data.calendars?.[targetCalendarId];

  if (calendarData?.errors && calendarData.errors.length > 0) {
    console.warn('Calendar FreeBusy returned partial errors:', calendarData.errors);
  }

  return calendarData?.busy || [];
}

/**
 * Create a new event on Google Calendar with client invite and optional Google Meet link.
 */
export async function createCalendarEvent(
  payload: CalendarEventPayload
): Promise<CreatedCalendarEvent> {
  const targetCalendarId = payload.calendarId || Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary';
  const accessToken = await getGoogleAccessToken();

  const requestBody = {
    summary: payload.summary,
    description: payload.description,
    start: {
      dateTime: payload.startDateTime,
      timeZone: payload.timeZone || 'UTC',
    },
    end: {
      dateTime: payload.endDateTime,
      timeZone: payload.timeZone || 'UTC',
    },
    attendees: [
      {
        email: payload.clientEmail,
        displayName: payload.clientName,
      },
    ],
    conferenceData: {
      createRequest: {
        requestId: `meet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 30 },      // 30 mins before
      ],
    },
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    targetCalendarId
  )}/events?conferenceDataVersion=1&sendUpdates=all`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar event creation failed:', response.status, errorText);
    throw new Error(`Event creation failed: ${response.statusText} - ${errorText}`);
  }

  const event = await response.json();
  return {
    id: event.id,
    htmlLink: event.htmlLink,
    status: event.status,
    hangoutLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
  };
}
