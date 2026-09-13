#!/usr/bin/env node

/**
 * Mai Website - Vercel Deployment Assistant
 * A mini-program to quickly upload and deploy the latest design to Vercel.
 */

import { execSync, spawnSync } from 'child_process';
import readline from 'readline';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function header() {
  console.clear();
  log('====================================================', colors.cyan);
  log('   🚀 MAI WEBSITE - VERCEL DEPLOYMENT ASSISTANT   ', colors.bright + colors.magenta);
  log('====================================================', colors.cyan);
  console.log();
}

function runCommand(command, description) {
  if (description) {
    log(`⏳ ${description}...`, colors.yellow);
  }
  try {
    execSync(command, { stdio: 'inherit' });
    if (description) {
      log(`✅ ${description} completed successfully!\n`, colors.green);
    }
    return true;
  } catch (error) {
    log(`❌ Error during: ${description || command}`, colors.red);
    return false;
  }
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function quickDeploy(customMessage) {
  header();
  log('Starting Quick Deploy to Vercel via GitHub...', colors.bright + colors.blue);
  console.log();

  // 1. Build Verification
  log('Step 1/3: Verifying production build...', colors.yellow);
  const buildSuccess = runCommand('npm run build', 'Production Build');
  if (!buildSuccess) {
    log('⚠️ Build failed! Please fix the errors above before deploying.', colors.red);
    return;
  }

  // 2. Git Status Check & Commit
  log('Step 2/3: Staging and committing changes...', colors.yellow);
  let commitMsg = customMessage;
  if (!commitMsg) {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    commitMsg = `Update design & content (${timestamp})`;
  }

  runCommand('git add -A', 'Staging all modified and new files');
  
  // Commit changes (if any)
  try {
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
    log(`✅ Changes committed with message: "${commitMsg}"\n`, colors.green);
  } catch (e) {
    log('ℹ️ No new changes to commit (working tree clean or already committed).\n', colors.dim);
  }

  // 3. Git Push
  log('Step 3/3: Pushing updates to GitHub (Triggering Vercel deployment)...', colors.yellow);
  const pushSuccess = runCommand('git push origin main', 'GitHub Push');

  if (pushSuccess) {
    log('🎉 SUCCESS! Your latest design has been pushed to GitHub.', colors.bright + colors.green);
    log('⚡ Vercel is now building and deploying your changes automatically.', colors.cyan);
    log('🌐 Visit your Vercel Dashboard or live website in 1-2 minutes to see the updates!\n', colors.bright + colors.magenta);
  } else {
    log('⚠️ Failed to push to GitHub. Check your internet connection or repository permissions.', colors.red);
  }
}

async function directVercelDeploy() {
  header();
  log('Starting Direct Deployment with Vercel CLI...', colors.bright + colors.blue);
  console.log();

  log('Running: npx vercel --prod', colors.yellow);
  const deploySuccess = runCommand('npx vercel --prod', 'Vercel CLI Direct Deploy');

  if (deploySuccess) {
    log('\n🎉 Direct Vercel deployment complete! Your site is live.', colors.bright + colors.green);
  } else {
    log('\n⚠️ Direct deployment encountered an issue.', colors.red);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick') || args.includes('-q')) {
    await quickDeploy();
    return;
  }

  if (args.includes('--vercel')) {
    await directVercelDeploy();
    return;
  }

  while (true) {
    header();
    log('Select a deployment action:', colors.bright);
    console.log();
    log('  [1] 🚀 Quick Deploy (Recommended - Build + Git Push -> Vercel Auto Deploy)', colors.green);
    log('  [2] ⚡ Direct Vercel Deploy (Deploy immediately via Vercel CLI)', colors.cyan);
    log('  [3] 🔄 Full Deploy (Git Push + Direct Vercel CLI)', colors.magenta);
    log('  [4] 🧪 Test Local Production Build Only', colors.yellow);
    log('  [5] ❌ Exit', colors.dim);
    console.log();

    const choice = await prompt(`${colors.bright}Enter choice [1-5] (default 1): ${colors.reset}`);

    if (choice === '1' || choice === '') {
      const msg = await prompt(`Enter commit description (press Enter for auto timestamp): `);
      await quickDeploy(msg);
      await prompt('\nPress Enter to continue...');
    } else if (choice === '2') {
      await directVercelDeploy();
      await prompt('\nPress Enter to continue...');
    } else if (choice === '3') {
      const msg = await prompt(`Enter commit description (press Enter for auto timestamp): `);
      await quickDeploy(msg);
      await directVercelDeploy();
      await prompt('\nPress Enter to continue...');
    } else if (choice === '4') {
      header();
      runCommand('npm run build', 'Testing Production Build');
      await prompt('\nPress Enter to continue...');
    } else if (choice === '5') {
      log('\nGoodbye!', colors.cyan);
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
