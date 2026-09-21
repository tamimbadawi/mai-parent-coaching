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

// Implementation of the new search logic
function applyNormalizedSearch(baseQuery, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return baseQuery;
  const rawTerm = searchTerm.trim();
  const orClauses = [
    `recipient_name.ilike.%${rawTerm}%`,
    `message_content.ilike.%${rawTerm}%`,
    `recipient_phone.ilike.%${rawTerm}%`,
  ];

  const digits = rawTerm.replace(/\D/g, '');
  if (digits.length >= 3) {
    orClauses.push(`recipient_phone.ilike.%${digits}%`);

    const withoutLeadingZero = digits.replace(/^0+/, '');
    if (withoutLeadingZero.length >= 4 && withoutLeadingZero !== digits) {
      orClauses.push(`recipient_phone.ilike.%${withoutLeadingZero}%`);
    }

    if (digits.length >= 7) {
      orClauses.push(`recipient_phone.ilike.%${digits.slice(-7)}%`);
    }
  }

  const uniqueClauses = Array.from(new Set(orClauses));
  return baseQuery.or(uniqueClauses.join(','));
}

async function runIssue2Verification() {
  console.log('=== [ISSUE 2 VERIFICATION] Phone Format Normalization Results ===\n');

  // Insert test messages for different country formats: Egypt, Saudi Arabia, and USA
  const testRows = [
    {
      recipient_phone: '+201150001234', // Egyptian number (starts with 011 in local format)
      recipient_name: 'Dr. Sarah Connor',
      message_type: 'manual',
      message_content: 'Egyptian client test message',
      status: 'sent',
    },
    {
      recipient_phone: '+966512345678', // Saudi number (starts with 05 in local format)
      recipient_name: 'Fatima Al-Mansoor',
      message_type: 'booking_confirmation',
      message_content: 'Saudi client confirmation',
      status: 'sent',
    },
  ];

  const createdIds = [];
  for (const r of testRows) {
    const { data, error } = await supabaseAdmin.from('whatsapp_messages').insert(r).select('id').single();
    if (error) {
      console.error('Insert failed:', error);
      process.exit(1);
    }
    createdIds.push(data.id);
  }

  console.log(`Inserted ${createdIds.length} multi-country test messages:`);
  console.log(`  1. Egypt (+201150001234, Dr. Sarah Connor)`);
  console.log(`  2. Saudi (+966512345678, Fatima Al-Mansoor)\n`);

  const testCases = [
    {
      label: 'Egyptian local format with leading zero (01150001234)',
      query: '01150001234',
      expectedId: createdIds[0],
    },
    {
      label: 'Egyptian formatted with spaces (+20 115 000 1234)',
      query: '+20 115 000 1234',
      expectedId: createdIds[0],
    },
    {
      label: 'Egyptian formatted with hyphens (011-5000-1234)',
      query: '011-5000-1234',
      expectedId: createdIds[0],
    },
    {
      label: 'Saudi local format with leading zero (0512345678)',
      query: '0512345678',
      expectedId: createdIds[1],
    },
    {
      label: 'Saudi formatted with spaces (+966 5 1234 5678)',
      query: '+966 5 1234 5678',
      expectedId: createdIds[1],
    },
    {
      label: 'Name search partial (Fatima)',
      query: 'Fatima',
      expectedId: createdIds[1],
    },
    {
      label: 'Content search partial (confirmation)',
      query: 'confirmation',
      expectedId: createdIds[1],
    },
  ];

  console.log('Running test cases comparing BEFORE (raw query) vs AFTER (normalized query):');
  console.log('-----------------------------------------------------------------------------');

  for (const tc of testCases) {
    // 1. BEFORE (raw un-normalized query)
    const rawTerm = `%${tc.query.trim()}%`;
    const beforeRes = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id')
      .or(`recipient_phone.ilike.${rawTerm},recipient_name.ilike.${rawTerm},message_content.ilike.${rawTerm}`);
    const beforeMatched = beforeRes.data?.some((m) => m.id === tc.expectedId);

    // 2. AFTER (normalized query)
    const afterQuery = applyNormalizedSearch(
      supabaseAdmin.from('whatsapp_messages').select('id'),
      tc.query
    );
    const afterRes = await afterQuery;
    const afterMatched = afterRes.data?.some((m) => m.id === tc.expectedId);

    console.log(`[${tc.label}]`);
    console.log(`  Query input : "${tc.query}"`);
    console.log(`  BEFORE fix  : ${beforeMatched ? '✅ MATCHED' : '❌ FAILED (0 matches)'}`);
    console.log(`  AFTER fix   : ${afterMatched ? '✅ MATCHED' : '❌ FAILED'}`);
    console.log('');
  }

  // Clean up
  await supabaseAdmin.from('whatsapp_messages').delete().in('id', createdIds);
  console.log('Cleaned up test messages.');
}

runIssue2Verification().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
