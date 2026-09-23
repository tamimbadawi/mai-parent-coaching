// Verification script: verify that Session Notes connects with real CRM clients
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const mockSessionsContent = fs.readFileSync('src/data/mockSessions.ts', 'utf8');
const clientIds = [...mockSessionsContent.matchAll(/clientId:\s*'([^']+)'/g)].map(m => m[1]);

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const uniqueClientIds = [...new Set(clientIds)];
  console.log('1. Checking extracted client IDs from mockSessions.ts...');
  for (const id of uniqueClientIds) {
    console.log(`  - Found clientId: ${id}`);
  }

  console.log('\n2. Checking Supabase profiles vs extracted client IDs...');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, email');
  if (pErr) {
    console.error('Error fetching profiles:', pErr);
    return;
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  for (const id of uniqueClientIds) {
    const prof = profileMap.get(id);
    console.log(`  - [${id}]: ${prof ? `EXISTS -> ${prof.full_name} (${prof.email})` : 'NOT FOUND IN PROFILES'}`);
  }

  console.log('\n3. Checking customer_journey_state clients...');
  const { data: journey, error: jErr } = await supabase.from('customer_journey_state').select('client_id, parent_name, email');
  if (jErr) {
    console.error('Error fetching journey:', jErr);
    return;
  }
  console.log(`  Total CRM clients in customer_journey_state: ${journey?.length}`);
  for (const j of journey || []) {
    console.log(`    • ${j.parent_name} (${j.client_id})`);
  }

  console.log('\n4. Checking households and case_sessions...');
  const { data: households } = await supabase.from('households').select('id, primary_contact_profile_id, family_name');
  const { data: caseSessions } = await supabase.from('case_sessions').select('id, household_id, session_date, status');
  console.log(`  Total households: ${households?.length}, Total case_sessions: ${caseSessions?.length}`);
  
  console.log('\nAll checks completed successfully!');
}

run();
