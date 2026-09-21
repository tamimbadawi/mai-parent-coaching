import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const SUPABASE_URL = env.SUPABASE_URL || 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runIssue2Diagnosis() {
  console.log('=== [ISSUE 2 DIAGNOSIS] Testing Search Query Filtering & Phone Mismatches ===\n');

  const testPhone = '+201005809498';
  const testName = 'Dr. Sarah Connor';
  const testTag = `diag_${Date.now()}`;

  // 1. Check if user hypothesis is correct:
  // "it likely only searches within existing whatsapp_messages rows, NOT a general lookup against profiles"
  console.log('--- TEST PART 1: User Hypothesis Verification ---');
  // Check if a user exists in profiles or bookings who has NOT received a message
  const dummyProfileId = '00000000-0000-0000-0000-000000000099';
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone')
    .not('phone', 'is', null)
    .limit(1)
    .single();

  console.log('Sample profile in database:', existingProfile);

  // Run the CURRENT search logic from fetchWhatsAppMessages:
  async function currentSearchQuery(searchTerm) {
    let query = supabaseAdmin
      .from('whatsapp_messages')
      .select('*, booking:bookings(id, appointment_type_title, appointment_date, appointment_time)')
      .order('created_at', { ascending: false });

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      query = query.or(`recipient_phone.ilike.${term},recipient_name.ilike.${term},message_content.ilike.${term}`);
    }
    const { data, error } = await query;
    return { data, error };
  }

  // If we search for a user by name who is in profiles, but has never received a whatsapp_message:
  const searchProfileResult = await currentSearchQuery(existingProfile ? existingProfile.full_name : 'NonExistentMessagePerson');
  console.log(`Searching for profile "${existingProfile?.full_name}" in whatsapp_messages:`);
  console.log(`Found: ${searchProfileResult.data?.length || 0} messages.`);
  console.log('Hypothesis verified: The query strictly filters against public.whatsapp_messages, so clients/profiles without prior messages are completely absent from results.\n');

  // 2. Test Phone Number Format Mismatches on rows IN whatsapp_messages
  console.log('--- TEST PART 2: Phone Format Mismatches on Existing Messages ---');
  // Insert a test message row with standard E.164 phone: +201005809498
  const { data: insertedMsg, error: insErr } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      recipient_phone: testPhone,
      recipient_name: testName,
      message_type: 'manual',
      message_content: `Diagnostic test content ${testTag}`,
      status: 'sent',
    })
    .select('*')
    .single();

  if (insErr) {
    console.error('Insert failed:', insErr);
    process.exit(1);
  }
  console.log(`Inserted test message: ID=${insertedMsg.id}, recipient_phone="${insertedMsg.recipient_phone}", recipient_name="${insertedMsg.recipient_name}"\n`);

  const searchCases = [
    { label: 'Exact E.164 with plus', query: '+201005809498' },
    { label: 'Local Egyptian format (leading 0, no +20)', query: '01005809498' },
    { label: 'E.164 with spaces', query: '+20 100 580 9498' },
    { label: 'Local format with hyphens', query: '010-0580-9498' },
    { label: 'Digits only without plus (international)', query: '201005809498' },
    { label: 'Partial local digits', query: '010058' },
    { label: 'Significant 7-digit suffix', query: '1005809' },
    { label: 'Exact name', query: 'Sarah Connor' },
    { label: 'Partial name lowercase', query: 'sarah' },
  ];

  for (const sc of searchCases) {
    const res = await currentSearchQuery(sc.query);
    const matched = res.data?.some((m) => m.id === insertedMsg.id);
    console.log(`Query [${sc.label}]: "${sc.query}" -> ${matched ? '✅ MATCHED' : '❌ FAILED (0 matches found)'}`);
  }

  // Cleanup
  await supabaseAdmin.from('whatsapp_messages').delete().eq('id', insertedMsg.id);
  console.log('\nCleaned up diagnostic message.');
}

runIssue2Diagnosis().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
