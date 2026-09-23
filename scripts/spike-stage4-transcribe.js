import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env
const env = fs
  .readFileSync('.env', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) acc[k.trim()] = v.join('=').trim();
    return acc;
  }, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase variables in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_FILES = [
  {
    name: 'test_session_10min.mp4',
    path: 'Mockup/test_session_10min.mp4',
    mimeType: 'video/mp4',
    outName: 'stage4_test_session_10min.json',
  },
  {
    name: 'test_session_60min_audio_only.m4a',
    path: 'Mockup/test_session_60min_audio_only.m4a',
    mimeType: 'audio/mp4',
    outName: 'stage4_test_session_60min_audio_only.json',
  },
  {
    name: 'test_session_60min.mp4',
    path: 'Mockup/test_session_60min.mp4',
    mimeType: 'video/mp4',
    outName: 'stage4_test_session_60min.json',
  },
];

async function runSpike() {
  console.log('========================================================================');
  console.log('  STAGE 4 SPIKE: Feasibility Test of session-transcribe Function');
  console.log('========================================================================\n');

  // Verify test files exist
  for (const tf of TEST_FILES) {
    if (!fs.existsSync(tf.path)) {
      console.error(`Error: Test file not found: ${tf.path}`);
      process.exit(1);
    }
    const stat = fs.statSync(tf.path);
    console.log(`Found ${tf.name} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  fs.mkdirSync('Mockup/output', { recursive: true });

  let adminUserId = null;
  const timestamp = Date.now();
  const adminEmail = `spike_stage4_${timestamp}@maiparentcoaching.com`;
  const password = 'TestSecurePass123!';

  const results = [];

  try {
    // 1. Create and sign in temporary admin
    console.log('\n1. Creating temporary admin user for Edge Function authorization...');
    const { data: adminAuth, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (adminAuthErr) throw adminAuthErr;
    adminUserId = adminAuth.user.id;

    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', adminUserId)
        .maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', approval_status: 'approved' })
      .eq('id', adminUserId);

    const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminSession, error: signErr } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password,
    });
    if (signErr) throw signErr;
    const token = adminSession.session.access_token;
    console.log('   ✅ Admin JWT acquired.');

    // 2. Run test on each file once
    for (let i = 0; i < TEST_FILES.length; i++) {
      const tf = TEST_FILES[i];
      console.log(`\n------------------------------------------------------------------------`);
      console.log(`[${i + 1}/3] Transcribing: ${tf.name}`);
      console.log(`------------------------------------------------------------------------`);

      const fileBuffer = fs.readFileSync(tf.path);
      const fileBlob = new Blob([fileBuffer], { type: tf.mimeType });
      const formData = new FormData();
      formData.append('file', fileBlob, tf.name);
      formData.append(
        'attendees',
        JSON.stringify([{ name: 'Parent', role: 'mother' }])
      );
      formData.append('test_mode', 'true');

      const fileStartTime = Date.now();
      let httpStatus = null;
      let responseBody = null;
      let errorMessage = null;

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/session-transcribe`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        httpStatus = response.status;
        const text = await response.text();
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = { raw_response: text };
        }

        if (!response.ok) {
          errorMessage = responseBody.error || text;
        }
      } catch (reqErr) {
        errorMessage = reqErr.message;
      }

      const clientElapsedSec = Number(((Date.now() - fileStartTime) / 1000).toFixed(2));

      // Save output to Mockup/output/
      const outPath = path.join('Mockup/output', tf.outName);
      fs.writeFileSync(outPath, JSON.stringify(responseBody || { error: errorMessage }, null, 2), 'utf8');
      console.log(`   Saved response to: ${outPath}`);

      // Evaluate results
      const isJsonValid = Boolean(
        responseBody &&
          Array.isArray(responseBody.utterances) &&
          !responseBody.parse_error
      );
      const utterances = responseBody?.utterances || [];
      const utteranceCount = utterances.length;
      const firstTimestamp = utterances[0]?.t || 'N/A';
      const lastTimestamp = utterances[utterances.length - 1]?.t || 'N/A';
      const distinctSpeakers = [
        ...new Set(utterances.map((u) => u.speaker_label).filter(Boolean)),
      ];
      const sampleLines = utterances.slice(0, 3).map((u) => `[${u.t}] ${u.speaker_label}: ${u.text}`);

      const record = {
        file: tf.name,
        http_status: httpStatus,
        error: errorMessage,
        total_seconds: responseBody?.diagnostics?.total_seconds ?? clientElapsedSec,
        upload_seconds: responseBody?.diagnostics?.upload_seconds ?? null,
        gemini_seconds: responseBody?.diagnostics?.gemini_seconds ?? null,
        valid_json: isJsonValid,
        utterance_count: utteranceCount,
        first_timestamp: firstTimestamp,
        last_timestamp: lastTimestamp,
        distinct_speakers: distinctSpeakers,
        sample_lines: sampleLines,
      };

      results.push(record);

      console.log(`   Status: HTTP ${httpStatus}`);
      console.log(`   Total time: ${record.total_seconds}s (Gemini: ${record.gemini_seconds}s, Upload: ${record.upload_seconds}s)`);
      console.log(`   Valid JSON: ${isJsonValid ? 'YES' : 'NO'}`);
      console.log(`   Utterances: ${utteranceCount}`);
      console.log(`   Time range: ${firstTimestamp} → ${lastTimestamp}`);
      console.log(`   Speakers: ${distinctSpeakers.join(', ') || 'None'}`);
      if (sampleLines.length > 0) {
        console.log(`   Sample lines:`);
        sampleLines.forEach((sl) => console.log(`     ${sl}`));
      }
      if (errorMessage) {
        console.log(`   ⚠️ Error: ${errorMessage}`);
      }
    }
  } finally {
    // Clean up temporary admin
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId).catch(() => {});
      console.log('\nCleaned up temporary admin user.');
    }
  }

  // Print Summary Table
  console.log('\n========================================================================');
  console.log('  STAGE 4 SPIKE REPORT SUMMARY');
  console.log('========================================================================\n');
  console.table(
    results.map((r) => ({
      File: r.file,
      Status: r.http_status,
      TotalSec: r.total_seconds,
      GeminiSec: r.gemini_seconds,
      ValidJSON: r.valid_json ? 'Yes' : 'No',
      Utterances: r.utterance_count,
      FirstTS: r.first_timestamp,
      LastTS: r.last_timestamp,
      Speakers: r.distinct_speakers.join(', '),
      Error: r.error ? r.error.slice(0, 40) : 'None',
    }))
  );

  return results;
}

runSpike().catch((err) => {
  console.error('Spike execution error:', err);
  process.exit(1);
});
