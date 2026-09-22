// Removes every record created by scripts/seed-family-system-demo-data.js, and nothing else.
// Matches strictly on the same tags used at seed time:
//   - profiles/auth users whose email ends in '@demo-family.test'
//   - households whose family_name starts with '[DEMO] '
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DEMO_EMAIL_DOMAIN, DEMO_TAG } from './seed-family-system-demo-data.js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('================================================================');
  console.log('  REMOVING DEMO FAMILY-SYSTEM DATA');
  console.log(`  Matching: emails ending in @${DEMO_EMAIL_DOMAIN}, households prefixed "${DEMO_TAG}"`);
  console.log('================================================================\n');

  const { data: households, error: hErr } = await admin
    .from('households')
    .select('id, family_name, primary_contact_profile_id')
    .like('family_name', `${DEMO_TAG}%`);
  if (hErr) throw hErr;

  console.log(`Found ${households.length} demo households.`);
  for (const h of households) {
    // Cascades to household_members, case_sessions, session_attendees, session_content.
    const { error } = await admin.from('households').delete().eq('id', h.id);
    console.log(`  Deleted household "${h.family_name}": ${error ? error.message : 'ok'}`);
  }

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, email')
    .like('email', `%@${DEMO_EMAIL_DOMAIN}`);
  if (pErr) throw pErr;

  console.log(`\nFound ${profiles.length} demo client accounts.`);
  for (const p of profiles) {
    const { error: bookingErr } = await admin.from('bookings').delete().eq('user_id', p.id);
    if (bookingErr) console.log(`  Bookings delete for ${p.email}: ${bookingErr.message}`);
    const { error: userErr } = await admin.auth.admin.deleteUser(p.id);
    console.log(`  Deleted client ${p.email}: ${userErr ? userErr.message : 'ok'}`);
  }

  console.log('\n================================================================');
  console.log('  DONE — all demo data removed.');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ Cleanup failed:', err);
  process.exit(1);
});
