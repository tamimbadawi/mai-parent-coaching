// Shared Gemini API client for Supabase Edge Functions.
// GEMINI_API_KEY lives only in Edge Function environment secrets — never import this
// file's approach into frontend code, and never expose the key via a VITE_ env var.

const DEFAULT_MODEL = 'gemini-3.6-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiCallOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'GeminiError';
  }
}

function getApiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new GeminiError('Gemini API key is not configured on the server.');
  return key;
}

async function callGenerateContent(parts: GeminiPart[], options: GeminiCallOptions = {}): Promise<string> {
  const model = options.model ?? Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL;
  const url = `${API_BASE}/models/${model}:generateContent?key=${getApiKey()}`;

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    },
  };
  if (options.systemInstruction) {
    body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Log full detail server-side only; never surface raw Gemini error bodies to callers.
    const detail = await response.text().catch(() => '');
    console.error('Gemini API error:', response.status, detail);
    throw new GeminiError('The AI service is temporarily unavailable. Please try again.', response.status);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => p.text ?? '').join('') ?? '';
  if (!text) {
    console.error('Gemini API returned no text content:', JSON.stringify(json).slice(0, 500));
    throw new GeminiError('The AI service returned an empty response. Please try again.');
  }
  return text;
}

/** Plain text-in, text-out call — the general-purpose entry point for any feature. */
export function generateText(prompt: string, options?: GeminiCallOptions): Promise<string> {
  return callGenerateContent([{ text: prompt }], options);
}

/** Vision call for OCR/image understanding (e.g. handwritten note transcription). */
export function generateFromImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  options?: GeminiCallOptions
): Promise<string> {
  return callGenerateContent(
    [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
    options
  );
}
