// Shared Gemini API client for Supabase Edge Functions.
// GEMINI_API_KEY lives only in Edge Function environment secrets — never import this
// file's approach into frontend code, and never expose the key via a VITE_ env var.

// Free-tier daily caps (RPD) differ sharply by model: the flash-lite models get ~500/day,
// while the flash/pro variants get ~20/day. A failed call used to cascade through all 5,
// burning the scarce 20/day quota on each -- keep the fallback list to the two models with
// real headroom so one busy request doesn't exhaust the whole project's daily quota.
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
];
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
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
  if (!key) throw new GeminiError('Synthesis API key is not configured on the server.');
  return key;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGenerateContent(parts: GeminiPart[], options: GeminiCallOptions = {}): Promise<string> {
  const preferredModel = options.model ?? Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL;
  const modelsToTry = [preferredModel, ...CANDIDATE_MODELS.filter((m) => m !== preferredModel)];

  let lastStatus = 500;
  const errorReports: string[] = [];

  for (const model of modelsToTry) {
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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        lastStatus = response.status;
        const detail = await response.text().catch(() => '');
        errorReports.push(`[${model} ${response.status}: ${detail.replace(/\s+/g, ' ').slice(0, 140)}]`);
        continue;
      }

      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => p.text ?? '').join('') ?? '';
      if (text) {
        return text;
      }
      errorReports.push(`[${model}: empty content]`);
    } catch (err: any) {
      if (err instanceof GeminiError) throw err;
      errorReports.push(`[${model} fetch failed: ${err.message}]`);
    }
  }

  console.error('All synthesis model attempts failed:', errorReports.join(' | '));
  throw new GeminiError(
    'The clinical synthesis service is temporarily busy. Please retry in a moment.',
    lastStatus
  );
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
