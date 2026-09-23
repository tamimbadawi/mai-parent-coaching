import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('================================================================');
  console.log('  STAGE 0: Spike Arabic Audio Transcription via Gemini API');
  console.log('================================================================\n');

  const slicePath = path.resolve('Mockup/sample_slice_3min.mp3');
  if (!fs.existsSync(slicePath)) {
    console.error(`Slice not found at: ${slicePath}`);
    process.exit(1);
  }

  const audioBuffer = fs.readFileSync(slicePath);
  const audioBase64 = audioBuffer.toString('base64');
  console.log(`1. Loaded audio slice: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Base64 size: ${(audioBase64.length / 1024 / 1024).toFixed(2)} MB`);

  const timestamp = Date.now();
  const adminEmail = `spike_admin_${timestamp}@maiparentcoaching.com`;
  const password = 'TestSecurePass123!';
  let adminUserId = null;

  try {
    console.log('\n2. Authenticating admin user for Edge Function call...');
    const { data: adminAuth, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (adminAuthErr) throw adminAuthErr;
    adminUserId = adminAuth.user.id;

    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await supabaseAdmin.from('profiles').update({ role: 'admin', approval_status: 'approved' }).eq('id', adminUserId);

    const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: adminSession, error: signErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password });
    if (signErr) throw signErr;
    const token = adminSession.session.access_token;
    console.log('   ✅ Admin JWT acquired.');

    console.log('\n3. Calling gemini-generate with audio payload and Arabic speaker prompt...');
    const prompt = `أنت مساعد خبير في تفريغ الجلسات الصوتية باللغة العربية بدقة متناهية.
المشاركون في هذا المقطع هما شخصان:
1. المذيع / المحاور
2. د. هبة حريري (المتحدثة / الأخصائية)

المطلوب:
1. تفريغ الحوار الصوتي المرفق كلمة بكلمة، محافظاً على اللهجة المنطوقة ووضوح العبارات.
2. تحديد المتحدث لكل عبارة بدقة مع التوقيت التقريبي بالدقائق والثواني.
3. استخراج ملخص نفسي للنقاط التي تم تناولها.

أجب حصراً بصيغة JSON مطابقة للشكل التالي تماماً دون أي مقدمات أو علامات إضافية:
{
  "utterances": [
    { "t": "00:05", "speaker_label": "المحاور", "text": "..." },
    { "t": "00:18", "speaker_label": "د. هبة حريري", "text": "..." }
  ],
  "summary": "ملخص أهم الأفكار النفسية المطروحة...",
  "key_points": [
    "النقطة الأولى...",
    "النقطة الثانية..."
  ]
}`;

    const startTime = Date.now();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        imageBase64: audioBase64,
        imageMimeType: 'audio/mp3',
      }),
    });

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const body = await res.json();

    if (!res.ok) {
      console.error(`Edge function error (${res.status}):`, body);
      throw new Error(`gemini-generate returned status ${res.status}: ${JSON.stringify(body)}`);
    }

    console.log(`   ✅ Gemini responded in ${durationSec} seconds!`);
    console.log('\n4. Raw Output Preview:');
    console.log('----------------------------------------------------------------');
    const rawText = body.text || '';
    console.log(rawText.slice(0, 500) + '...\n');

    // Parse JSON
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    console.log('5. Parsed Structured Verification:');
    console.log(`   - Utterances detected: ${parsed.utterances?.length ?? 0}`);
    console.log(`   - Summary length: ${parsed.summary?.length ?? 0} chars`);
    console.log(`   - Key points: ${parsed.key_points?.length ?? 0}`);

    console.log('\nFirst 3 Utterances:');
    parsed.utterances?.slice(0, 3).forEach((u, idx) => {
      console.log(`   [${u.t}] ${u.speaker_label}: ${u.text}`);
    });

    // Save spike output locally in scratch/spike-result.json
    fs.mkdirSync('Mockup/output', { recursive: true });
    fs.writeFileSync('Mockup/output/spike_transcript_result.json', JSON.stringify(parsed, null, 2), 'utf8');
    console.log('\n   ✅ Full spike result saved to Mockup/output/spike_transcript_result.json');

    console.log('\n================================================================');
    console.log('  🎉 STAGE 0 SPIKE SUCCESSFUL: Gemini Arabic Audio Pipeline Verified');
    console.log('================================================================\n');
  } finally {
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId).catch(() => {});
    }
  }
}

run().catch((err) => {
  console.error('Spike failed:', err);
  process.exit(1);
});
