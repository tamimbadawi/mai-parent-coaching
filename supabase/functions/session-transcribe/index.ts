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

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const startTime = Date.now();
  let geminiFileResourceName: string | null = null;
  const apiKey = Deno.env.get('GEMINI_API_KEY');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey || !apiKey) {
      return json(
        { error: 'Server configuration error: Required environment variables are missing.', code: 'SERVER_MISCONFIGURED' },
        500
      );
    }

    // 1. Authenticate admin user
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;
    if (!token) {
      return json({ error: 'Unauthorized: Missing or invalid Authorization header.', code: 'AUTH_TOKEN_MISSING' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: 'Unauthorized: Invalid or expired session token.', code: 'AUTH_TOKEN_INVALID' }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden: Admin access required.', code: 'ADMIN_REQUIRED' }, 403);
    }

    // 2. Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formErr: any) {
      return json({ error: `Invalid multipart form data: ${formErr.message}`, code: 'INVALID_FORM_DATA' }, 400);
    }

    // Free-tier guardrail: refuse unless test_mode=true
    const testMode = formData.get('test_mode');
    if (testMode !== 'true') {
      return json(
        {
          error: 'Guardrail: session-transcribe is currently restricted to test_mode=true (non-client audio) during the Stage 4 testing phase.',
          code: 'TEST_MODE_REQUIRED',
        },
        403
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return json({ error: 'Missing or invalid "file" in multipart form data.', code: 'MISSING_FILE' }, 400);
    }

    const fileBytes = file.size;
    const fileName = file.name || 'session_audio.mp4';

    // Infer MIME type
    let mimeType = file.type || '';
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (fileName.endsWith('.mp4')) mimeType = 'video/mp4';
      else if (fileName.endsWith('.m4a')) mimeType = 'audio/mp4';
      else if (fileName.endsWith('.mp3')) mimeType = 'audio/mp3';
      else if (fileName.endsWith('.wav')) mimeType = 'audio/wav';
      else mimeType = 'video/mp4';
    }
    // Normalize m4a
    if (mimeType === 'audio/x-m4a' || mimeType === 'audio/m4a') {
      mimeType = 'audio/mp4';
    }

    const attendeesRaw = formData.get('attendees');
    let attendees: { name: string; role: string }[] = [];
    if (attendeesRaw) {
      try {
        attendees = typeof attendeesRaw === 'string' ? JSON.parse(attendeesRaw) : attendeesRaw;
      } catch {
        attendees = [];
      }
    }

    // 3. Upload file to Gemini Files API (Resumable protocol)
    const uploadStart = Date.now();
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(fileBytes),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: {
            display_name: fileName,
          },
        }),
      }
    );

    if (!initRes.ok) {
      const errDetail = await initRes.text().catch(() => '');
      return json(
        {
          error: `Gemini Files API upload initiation failed (${initRes.status}): ${errDetail}`,
          code: 'UPLOAD_INIT_FAILED',
        },
        502
      );
    }

    const uploadUrl = initRes.headers.get('x-goog-upload-url') || initRes.headers.get('upload-url');
    if (!uploadUrl) {
      return json(
        { error: 'Gemini Files API did not return a valid upload URL.', code: 'UPLOAD_URL_MISSING' },
        502
      );
    }

    // Upload bytes
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(fileBytes),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errDetail = await uploadRes.text().catch(() => '');
      return json(
        {
          error: `Gemini Files API upload failed (${uploadRes.status}): ${errDetail}`,
          code: 'UPLOAD_FAILED',
        },
        502
      );
    }

    const uploadJson = await uploadRes.json();
    const geminiFile = uploadJson?.file;
    if (!geminiFile?.name || !geminiFile?.uri) {
      return json(
        { error: `Gemini Files API returned invalid file metadata: ${JSON.stringify(uploadJson)}`, code: 'INVALID_FILE_RESPONSE' },
        502
      );
    }

    geminiFileResourceName = geminiFile.name;

    // 4. Poll until file state is ACTIVE
    let fileState = geminiFile.state;
    let pollCount = 0;
    while (fileState === 'PROCESSING') {
      pollCount++;
      if (pollCount > 60) {
        throw new Error('Gemini Files API: File processing timed out after 120 seconds.');
      }
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${geminiFile.name}?key=${apiKey}`
      );
      if (pollRes.ok) {
        const pollJson = await pollRes.json();
        fileState = pollJson.state;
        if (fileState === 'FAILED') {
          throw new Error(
            `Gemini Files API processing failed: ${pollJson.error?.message || 'Processing failed'}`
          );
        }
      }
    }

    const uploadSeconds = Number(((Date.now() - uploadStart) / 1000).toFixed(2));

    // 5. Construct transcription prompt
    const attendeeLines =
      attendees.length > 0
        ? attendees.map((a, i) => `${i + 1}. ${a.name} (${a.role})`).join('\n')
        : '1. Parent (mother)';

    const prompt = `أنت مساعد خبير وموثوق في التفريغ الحرفي للجلسات الاستشارية والنفسية باللغة العربية.

المشاركون في هذه الجلسة الصوتية/المرئية:
- الأخصائية / المدربة: "أ. مي" (speaker_role: "coach")
- أفراد الأسرة والحضور:
${attendeeLines}

المطلوب بدقة متناهية:
1. قم بتفريغ الحوار كلمة بكلمة (verbatim) باللغة المنطوقة ولهجة المتحدثين الأصلية (اللهجة العربية الدارجة المستخدمة في التسجيل).
2. لا تقم بالترجمة إطلاقاً ولا التلخيص ولا حذف أي عبارات أو تأليف أي كلام غير منطوق.
3. حدد المتحدث لكل جملة بدقة مستخدماً قائمة الحضور أعلاه، مع استخدام "أ. مي" للأخصائية مع دور "coach"، واسم الحاضر مع دوره المقابل (مثل "mother", "father", "child", إلخ).
4. اكتب التوقيت الزمني لكل عبارة بصيغة MM:SS محسوباً بدقة من بداية الملف (مثال: 00:15, 05:40, 58:20).
5. أجب حصراً بصيغة JSON تطابق الهيكل التالي تماماً دون أي علامات markdown أو كود إضافي:
{
  "version": 1,
  "language": "ar",
  "utterances": [
    {
      "t": "00:15",
      "speaker_label": "أ. مي",
      "speaker_role": "coach",
      "text": "..."
    }
  ]
}`;

    // 6. Call generateContent
    const geminiStart = Date.now();
    const preferredModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
    const candidateModels = [
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let generateData: any = null;
    let lastError = '';

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const requestPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  fileUri: geminiFile.uri,
                  mimeType: geminiFile.mimeType,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 32768,
          responseMimeType: 'application/json',
        },
      };

      try {
        const genRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!genRes.ok) {
          lastError = await genRes.text().catch(() => '');
          console.warn(`[session-transcribe] Model ${model} failed (${genRes.status}): ${lastError}`);
          continue;
        }

        generateData = await genRes.json();
        break;
      } catch (callErr: any) {
        lastError = callErr.message;
        console.warn(`[session-transcribe] Model ${model} fetch exception: ${callErr.message}`);
      }
    }

    if (!generateData) {
      return json(
        { error: `Gemini audio transcription failed across all candidate models: ${lastError}`, code: 'GEMINI_TRANSCRIBE_FAILED' },
        502
      );
    }

    const geminiSeconds = Number(((Date.now() - geminiStart) / 1000).toFixed(2));
    const totalSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

    const candidate = generateData?.candidates?.[0];
    const rawText = candidate?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    const usage = generateData?.usageMetadata || null;

    let parsed: any;
    try {
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      console.error('Failed to parse Gemini output as JSON:', rawText);
      parsed = {
        version: 1,
        language: 'ar',
        utterances: [],
        raw_text: rawText,
        parse_error: parseErr.message,
      };
    }

    return json({
      version: parsed.version || 1,
      language: parsed.language || 'ar',
      utterances: parsed.utterances || [],
      diagnostics: {
        upload_seconds: uploadSeconds,
        gemini_seconds: geminiSeconds,
        total_seconds: totalSeconds,
        file_bytes: fileBytes,
        usage,
      },
      upload_seconds: uploadSeconds,
      gemini_seconds: geminiSeconds,
      total_seconds: totalSeconds,
      file_bytes: fileBytes,
      usage,
    });
  } catch (error: any) {
    console.error('session-transcribe internal error:', error);
    return json({ error: error.message || 'Internal transcription error', code: 'INTERNAL_ERROR' }, 500);
  } finally {
    // 7. Clean up file from Gemini Files API
    if (geminiFileResourceName && apiKey) {
      try {
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${geminiFileResourceName}?key=${apiKey}`,
          { method: 'DELETE' }
        );
      } catch (delErr) {
        console.error('Failed to delete temporary Gemini file:', delErr);
      }
    }
  }
});
