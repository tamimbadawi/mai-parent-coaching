// Seeds extensive, realistic demo data for the family/household case system.
// Writes to the LIVE connected Supabase project (there is no separate staging project
// configured in this repo) -- every record is tagged so it can be found and removed
// later with scripts/remove-family-system-demo-data.js:
//   - profiles/auth users use the reserved DEMO_EMAIL_DOMAIN ('.test', IANA-reserved
//     for testing, never a real deliverable address)
//   - every household's family_name is prefixed with DEMO_TAG
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DEMO_EMAIL_DOMAIN = 'demo-family.test';
export const DEMO_TAG = '[DEMO] ';
const PASSWORD = 'DemoFamily2026!';

const iso = (dateStr, time = '09:00') => new Date(`${dateStr}T${time}:00+02:00`).toISOString();

const FAMILIES = [
  {
    email: `sarah.jenkins@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Sarah Jenkins',
    phone: '+201005551201',
    country: 'EG',
    city: 'Cairo',
    familyName: 'Jenkins',
    presenting_issue:
      'Frequent evening meltdowns and sensory dysregulation in a 3.5-year-old, peaking during the daycare-to-dinner transition window (5:30-6:30 PM). Mother reports feeling depleted and unsure whether her responses are helping or reinforcing the pattern.',
    working_plan:
      'Introduce a consistent somatic co-regulation ritual (the "3-second pause") before transitions, paired with a visual countdown card. Track meltdown frequency and duration daily for two weeks to establish a baseline before adjusting.',
    next_step: 'Review the two-week tracking log together and decide whether to extend the transition window or add a sensory tool (weighted lap pad) to the routine.',
    status: 'active',
    members: [
      { full_name: 'Sarah Jenkins', role: 'mother', birth_year: null, notes: 'Primary caregiver, works from home three days a week.' },
      { full_name: 'Leo Jenkins', role: 'child', birth_year: new Date().getFullYear() - 3, notes: 'High sensory sensitivity to noise and transitions. Loves trains.' },
    ],
    bookings: [
      { daysAgo: 14, status: 'completed', notes: 'Initial consultation — meltdown pattern intake.' },
      { daysAgo: 3, status: 'completed', notes: 'Follow-up on 3-second pause routine.' },
      { daysAgo: -7, status: 'confirmed', notes: 'Check-in on tracking log.' },
    ],
    sessionContent: {
      0: {
        post_session_notes:
          'First session with Sarah. Presenting concern: nightly meltdowns during the 5:30-6:30 window, described as "screaming, throwing himself on the floor, inconsolable for 10-20 minutes." Sarah\'s current response is to try to reason with Leo mid-meltdown, which appears to prolong it. Explained co-regulation vs. verbal reasoning during dysregulation — Leo\'s nervous system is not in a state to process language at that point. Sarah was visibly relieved to hear this isn\'t a discipline failure on her part.',
        handwritten_notes:
          "Leo - loud noises = trigger. Daycare pickup transition worst. Mom tired, feels guilty. Dad travels for work, home weekends only. No other caregivers involved.",
      },
      1: {
        post_session_notes:
          'Sarah implemented the 3-second pause four out of seven days. On days she used it consistently, meltdown duration dropped from ~15 minutes to ~6 minutes on average (her estimate, not a formal log yet). She noted Leo seems to "wait for the pause" now, like he expects it. Introduced a visual countdown card for the daycare pickup transition specifically, since that remains the hardest moment. Asked Sarah to start a simple frequency/duration log rather than relying on memory.',
        live_transcript:
          '[00:02] Mai (Coach): So tell me how the week went with the pause.\n[00:14] Parent: Better, honestly. Not perfect. There were two nights I just didn\'t have it in me.\n[00:29] Mai (Coach): That\'s completely normal — this is a practice, not a switch. What did you notice on the nights it worked?\n[01:10] Parent: He calmed down so much faster. Like, six minutes instead of twenty. I actually timed it once.\n[01:35] Mai (Coach): That\'s a huge data point. I want you to start logging that every night, even just a rough number.\n[02:02] Parent: Okay. What about pickup though? That\'s still the worst part of the day.\n[02:15] Mai (Coach): Let\'s add a visual card specifically for that transition...',
        handwritten_notes: 'Countdown card - laminate, keep in car. Log: date / trigger / duration / what helped.',
      },
    },
  },
  {
    email: `amina.farouk@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Amina Farouk',
    phone: '+201005551202',
    country: 'EG',
    city: 'Giza',
    familyName: 'Farouk',
    presenting_issue:
      'Bedtime negotiation routinely exceeding 45-60 minutes with 6-year-old Yousef, contributing to significant parental burnout. Both parents present in sessions; father travels frequently for work which disrupts routine consistency.',
    working_plan:
      'Establish a fixed, visual bedtime sequence (bath, book, one song, lights out) with a hard stop on negotiation after the sequence begins. Both parents to use identical scripting when father is home to avoid inconsistency.',
    next_step: 'Assess whether the fixed sequence is holding on the nights father is away vs. present, and address any splitting behavior between parents.',
    status: 'active',
    members: [
      { full_name: 'Amina Farouk', role: 'mother', birth_year: null, notes: 'Reports high stress, primary bedtime caregiver on weeknights.' },
      { full_name: 'Omar Farouk', role: 'father', birth_year: null, notes: 'Travels 2-3 nights per week for work.' },
      { full_name: 'Yousef Farouk', role: 'child', birth_year: new Date().getFullYear() - 6, notes: 'Strong-willed, responds well to visual schedules.' },
    ],
    bookings: [
      { daysAgo: 21, status: 'completed', notes: 'Joint session — bedtime routine intake.' },
      { daysAgo: 7, status: 'completed', notes: 'Reviewing fixed sequence adherence.' },
    ],
    sessionContent: {
      0: {
        post_session_notes:
          'Joint session with both parents. Bedtime currently starts around 8:00 PM and often doesn\'t end until 9:00-9:15 PM, with Yousef renegotiating every step ("one more book," "I need water," "stay until I\'m asleep"). Amina reports she is the one who eventually caves most nights. Omar is stricter but is only home 4-5 nights a week, which Yousef seems to have learned to navigate. Recommended a fixed visual sequence with both parents scripting identically.',
        live_transcript:
          "[00:05] Mai (Coach): Walk me through what a typical bedtime looks like, start to finish.\n[00:20] Parent: Bath around 7:45, then it just... unravels. He'll ask for water, then a different book, then he wants me to lie down with him.\n[00:48] Mai (Coach): And when Omar is home, is it different?\n[01:02] Parent (Omar): I try to be firmer but I'm not always sure what she's already agreed to, so I end up either overriding her or letting it slide.\n[01:30] Mai (Coach): That inconsistency is actually a big part of what's happening. Yousef isn't being manipulative — he's testing which parent, which night, gets him a different outcome. Let's build one sequence you both use, word for word.",
      },
      1: {
        post_session_notes:
          'Sequence held well on nights both parents were consistent — bedtime down to ~35 minutes on average. Broke down on the two nights Omar was traveling and Amina reverted to old patterns out of exhaustion. This is expected and not a failure; flagged that consistency will take longer to build on solo nights. Discussed a "tired pass" — Amina can shorten the story but not skip the sequence entirely.',
        handwritten_notes: 'Solo nights = hardest. Give Amina permission to shorten (not skip) sequence when alone. Revisit in 2 weeks.',
      },
    },
  },
  {
    email: `laila.nabil@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Laila Nabil',
    phone: '+201005551203',
    country: 'EG',
    city: 'Alexandria',
    familyName: 'Nabil',
    presenting_issue:
      'Morning school-refusal behavior in 8-year-old Nour, including stomachaches and crying before school drop-off, beginning roughly three weeks after starting third grade. No reported bullying; possible academic pressure around a new reading program.',
    working_plan: 'Not yet finalized — first session scheduled, intake only so far.',
    next_step: 'Complete intake session to map the timeline of when symptoms started relative to the reading program change.',
    status: 'active',
    members: [
      { full_name: 'Laila Nabil', role: 'mother', birth_year: null, notes: 'Single parent, works full-time.' },
      { full_name: 'Nour Nabil', role: 'child', birth_year: new Date().getFullYear() - 8, notes: 'Previously enjoyed school; change is recent and sudden.' },
    ],
    bookings: [{ daysAgo: -2, status: 'confirmed', notes: 'Initial intake — school anxiety.' }],
    sessionContent: {},
  },
  {
    email: `mona.hassan@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Mona Hassan',
    phone: '+201005551204',
    country: 'EG',
    city: 'Cairo',
    familyName: 'Hassan',
    presenting_issue:
      'Escalating sibling rivalry between Farida (5) and Adam (2) since Adam became mobile, including hitting and toy-grabbing multiple times daily. Parents disagree on how much to intervene versus let siblings work it out.',
    working_plan:
      'Coach both parents on a unified "narrate, don\'t referee" approach for low-stakes conflicts, reserving direct intervention for safety issues only. Build in dedicated one-on-one time with Farida to address possible attention-seeking driver.',
    next_step: 'Check whether dedicated one-on-one time has reduced the frequency of hitting incidents, and revisit the intervention threshold with both parents.',
    status: 'paused',
    members: [
      { full_name: 'Mona Hassan', role: 'mother', birth_year: null, notes: 'Primary daytime caregiver for both children.' },
      { full_name: 'Karim Hassan', role: 'father', birth_year: null, notes: 'More inclined to intervene immediately; working on tolerating low-stakes conflict.' },
      { full_name: 'Farida Hassan', role: 'child', birth_year: new Date().getFullYear() - 5, notes: 'Was previously an only child for 3 years; adjustment period is ongoing.' },
      { full_name: 'Adam Hassan', role: 'child', birth_year: new Date().getFullYear() - 2, notes: 'Recently mobile, drawn to Farida\'s toys specifically.' },
    ],
    bookings: [
      { daysAgo: 30, status: 'completed', notes: 'Joint intake — sibling conflict.' },
      { daysAgo: 16, status: 'completed', notes: 'Follow-up — one-on-one time results.' },
    ],
    sessionContent: {
      0: {
        post_session_notes:
          'Both parents present. Conflict pattern: Adam grabs/approaches Farida\'s toys, Farida reacts by hitting or shoving, one or both parents intervene immediately and inconsistently — sometimes punishing Farida, sometimes redirecting Adam. Neither parent feels aligned with the other\'s approach. Recommended a "narrate, don\'t referee" stance for non-safety conflicts, and 15 minutes of dedicated one-on-one time with Farida daily to address the attention shift since Adam\'s birth.',
        handwritten_notes: 'Karim - jumps in too fast. Mona - inconsistent between the two kids. Try: name feelings out loud, only step in if hitting.',
      },
      1: {
        post_session_notes:
          'Mona reports the one-on-one time (15 min/day, Farida picks the activity) has been the single biggest shift — hitting incidents down from "several times a day" to roughly 3-4 times per week. Karim still intervenes faster than the plan calls for but is aware of it and self-correcting more often. Given the meaningful improvement, and at the family\'s request, pausing regular sessions with the option to resume if needed.',
      },
    },
  },
];

async function seedFamily(family) {
  console.log(`\n--- Seeding ${family.full_name} (${family.familyName} family) ---`);

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: family.email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authErr) throw new Error(`auth.createUser(${family.email}): ${authErr.message}`);
  const userId = authUser.user.id;

  for (let i = 0; i < 15; i++) {
    const { data: prof } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (prof) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await admin
    .from('profiles')
    .update({
      full_name: family.full_name,
      phone: family.phone,
      country: family.country,
      city: family.city,
      role: 'student',
      approval_status: 'approved',
    })
    .eq('id', userId);
  console.log(`  Client account: ${family.email} (${userId})`);

  const bookingIds = [];
  for (const b of family.bookings) {
    const date = new Date();
    date.setDate(date.getDate() - b.daysAgo);
    const dateStr = date.toISOString().slice(0, 10);
    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .insert({
        user_id: userId,
        appointment_type_id: 'consult',
        appointment_type_title: 'Parent Coaching Session',
        appointment_date: dateStr,
        appointment_time: '17:00',
        parent_name: family.full_name,
        email: family.email,
        phone: family.phone,
        country: family.country === 'EG' ? 'Egypt' : family.country,
        child_name: family.members.find((m) => m.role === 'child')?.full_name ?? null,
        child_age: family.members.find((m) => m.role === 'child')
          ? String(new Date().getFullYear() - family.members.find((m) => m.role === 'child').birth_year)
          : null,
        notes: b.notes,
        status: b.status,
        time_zone: 'Africa/Cairo',
        starts_at: iso(dateStr, '17:00'),
        ends_at: iso(dateStr, '17:50'),
        reserved_until: iso(dateStr, '18:00'),
      })
      .select()
      .single();
    if (bookingErr) throw new Error(`booking insert: ${bookingErr.message}`);
    bookingIds.push(booking);
  }
  console.log(`  Bookings: ${bookingIds.length}`);

  const { data: household, error: hErr } = await admin
    .from('households')
    .insert({
      family_name: `${DEMO_TAG}The ${family.familyName} Family`,
      primary_contact_profile_id: userId,
      presenting_issue: family.presenting_issue,
      working_plan: family.working_plan,
      next_step: family.next_step,
      status: family.status,
    })
    .select()
    .single();
  if (hErr) throw new Error(`household insert: ${hErr.message}`);

  const memberRows = [];
  for (const m of family.members) {
    const { data: member, error: mErr } = await admin
      .from('household_members')
      .insert({ household_id: household.id, full_name: m.full_name, role: m.role, birth_year: m.birth_year, notes: m.notes })
      .select()
      .single();
    if (mErr) throw new Error(`member insert: ${mErr.message}`);
    memberRows.push(member);
  }
  console.log(`  Household + ${memberRows.length} members: ${household.family_name}`);

  let sessionCount = 0;
  for (let i = 0; i < bookingIds.length; i++) {
    const booking = bookingIds[i];
    if (booking.status === 'pending') continue; // no session yet for a not-yet-confirmed booking
    const { data: session, error: sErr } = await admin
      .from('case_sessions')
      .insert({
        household_id: household.id,
        booking_id: booking.id,
        session_date: iso(booking.appointment_date, booking.appointment_time),
        duration_minutes: 50,
        status: booking.status === 'completed' ? 'completed' : 'scheduled',
      })
      .select()
      .single();
    if (sErr) throw new Error(`session insert: ${sErr.message}`);
    sessionCount++;

    // Attendees: mother + any child always; father joins on the first session of two-parent families.
    const attendeeMembers = memberRows.filter((m) => m.role === 'mother' || m.role === 'child' || (m.role === 'father' && i === 0));
    if (attendeeMembers.length > 0) {
      await admin
        .from('session_attendees')
        .insert(attendeeMembers.map((m) => ({ session_id: session.id, household_member_id: m.id })));
    }

    const content = family.sessionContent[i];
    if (content) {
      const rows = Object.entries(content).map(([content_type, text]) => ({ session_id: session.id, content_type, content: text }));
      if (rows.length > 0) {
        const { error: cErr } = await admin.from('session_content').insert(rows);
        if (cErr) throw new Error(`session_content insert: ${cErr.message}`);
      }
    }
  }
  console.log(`  Case sessions: ${sessionCount} (with content + attendees where applicable)`);

  return { userId, householdId: household.id, bookingIds: bookingIds.map((b) => b.id) };
}

async function main() {
  console.log('================================================================');
  console.log('  SEEDING DEMO FAMILY-SYSTEM DATA (live project)');
  console.log(`  Tag: emails end in @${DEMO_EMAIL_DOMAIN}, households prefixed "${DEMO_TAG}"`);
  console.log('================================================================');

  const results = [];
  for (const family of FAMILIES) {
    results.push(await seedFamily(family));
  }

  console.log('\n================================================================');
  console.log(`  DONE — ${results.length} demo families seeded.`);
  console.log('  Remove any time with: node scripts/remove-family-system-demo-data.js');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});
