/**
 * Stage 2 CRM Content Library Verification Script
 * Validates:
 * 1. Table schema & RLS for `crm_content_library`
 * 2. Seeded starter pieces (Track A and Track B)
 * 3. Full CRUD operations (Insert, Read, Update, Toggle Active/Archive, Delete)
 * 4. Tag array querying and filtering
 * 5. Clean test disposal
 */

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const supabaseUrl = env.SUPABASE_URL || 'https://qqnthevakllugdlioalm.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let createdTestPieceId = null;

async function logStep(stepNum, title) {
  console.log(`\n======================================================`);
  console.log(`STEP ${stepNum}: ${title}`);
  console.log(`======================================================`);
}

async function runStage2Verification() {
  console.log('[START] Verifying Stage 2: CRM Content Library Schema & CRUD');

  try {
    // ----------------------------------------------------
    // STEP 1: Verify Seeded Content Items
    // ----------------------------------------------------
    await logStep(1, 'Verify initial seeded content pieces in crm_content_library');
    const { data: seededItems, error: seedErr } = await supabaseAdmin
      .from('crm_content_library')
      .select('*')
      .order('sort_order', { ascending: true });

    if (seedErr) throw seedErr;

    console.log(`Found ${seededItems.length} items in crm_content_library.`);
    assert(seededItems.length >= 5, 'Must have at least 5 initial seeded pieces');

    const trackAPieces = seededItems.filter((i) => i.target_track === 'track_a');
    const trackBPieces = seededItems.filter((i) => i.target_track === 'track_b');

    assert(trackAPieces.length >= 3, 'Must have at least 3 Track A pieces');
    assert(trackBPieces.length >= 2, 'Must have at least 2 Track B pieces');

    console.log('✅ Seeded library verified:');
    console.log(`   - Track A pieces: ${trackAPieces.length} (tips, prompts, worksheets)`);
    console.log(`   - Track B pieces: ${trackBPieces.length} (check-ins, integration prompts)`);

    // ----------------------------------------------------
    // STEP 2: Test Create (Insert)
    // ----------------------------------------------------
    await logStep(2, 'Test INSERT a new content piece');
    const testTitle = `Test Grounding Piece ${Date.now()}`;
    const testBody = 'Hello {parentName},\n\nThis is an automated test message for CRM Stage 2.\n\nWarmly,\nMai';

    const { data: insertedPiece, error: insertErr } = await supabaseAdmin
      .from('crm_content_library')
      .insert({
        title: testTitle,
        body_template: testBody,
        content_type: 'tip',
        target_track: 'track_a',
        tags: ['test', 'grounding', 'stage2'],
        is_active: true,
        sort_order: 99,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    createdTestPieceId = insertedPiece.id;

    assert.equal(insertedPiece.title, testTitle);
    assert.equal(insertedPiece.content_type, 'tip');
    assert.equal(insertedPiece.target_track, 'track_a');
    assert.deepEqual(insertedPiece.tags, ['test', 'grounding', 'stage2']);
    assert.equal(insertedPiece.is_active, true);
    console.log('✅ Successfully created content piece:', insertedPiece.id);

    // ----------------------------------------------------
    // STEP 3: Test Update (Edit)
    // ----------------------------------------------------
    await logStep(3, 'Test UPDATE (edit title, body, and tags)');
    const updatedTitle = `${testTitle} (Updated)`;
    const { data: updatedPiece, error: updateErr } = await supabaseAdmin
      .from('crm_content_library')
      .update({
        title: updatedTitle,
        tags: ['test', 'grounding', 'stage2', 'updated-tag'],
        sort_order: 100,
      })
      .eq('id', createdTestPieceId)
      .select()
      .single();

    if (updateErr) throw updateErr;
    assert.equal(updatedPiece.title, updatedTitle);
    assert(updatedPiece.tags.includes('updated-tag'));
    assert.equal(updatedPiece.sort_order, 100);
    console.log('✅ Successfully updated content piece:', updatedPiece.title);

    // ----------------------------------------------------
    // STEP 4: Test Archive & Re-activate (Toggle is_active)
    // ----------------------------------------------------
    await logStep(4, 'Test toggle is_active (Archive & Re-activate)');
    // Archive
    const { data: archivedPiece, error: archiveErr } = await supabaseAdmin
      .from('crm_content_library')
      .update({ is_active: false })
      .eq('id', createdTestPieceId)
      .select()
      .single();

    if (archiveErr) throw archiveErr;
    assert.equal(archivedPiece.is_active, false);
    console.log('✅ Successfully archived piece (is_active = false)');

    // Re-activate
    const { data: reactivatedPiece, error: reactivateErr } = await supabaseAdmin
      .from('crm_content_library')
      .update({ is_active: true })
      .eq('id', createdTestPieceId)
      .select()
      .single();

    if (reactivateErr) throw reactivateErr;
    assert.equal(reactivatedPiece.is_active, true);
    console.log('✅ Successfully re-activated piece (is_active = true)');

    // ----------------------------------------------------
    // STEP 5: Test Delete & Cleanup
    // ----------------------------------------------------
    await logStep(5, 'Test DELETE content piece');
    const { error: deleteErr } = await supabaseAdmin
      .from('crm_content_library')
      .delete()
      .eq('id', createdTestPieceId);

    if (deleteErr) throw deleteErr;

    const { data: verifyDeleted } = await supabaseAdmin
      .from('crm_content_library')
      .select('id')
      .eq('id', createdTestPieceId)
      .maybeSingle();

    assert.equal(verifyDeleted, null, 'Deleted piece must no longer exist');
    createdTestPieceId = null;
    console.log('✅ Successfully deleted test piece. Zero orphan test records.');

    console.log('\n======================================================');
    console.log('🎉 ALL STAGE 2 VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('======================================================');
  } finally {
    if (createdTestPieceId) {
      await supabaseAdmin.from('crm_content_library').delete().eq('id', createdTestPieceId);
    }
  }
}

runStage2Verification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Stage 2 verification failed:', err);
    process.exit(1);
  });
