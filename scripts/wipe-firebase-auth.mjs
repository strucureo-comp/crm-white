/**
 * Delete all Firebase Auth users.
 *
 * Usage:
 *   node scripts/wipe-firebase-auth.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

const app = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

const auth = getAuth(app);

async function wipeAuth() {
  console.log('🗑️  Deleting all Firebase Auth users...');
  console.log(`   Project: ${serviceAccount.project_id}`);
  console.log('');

  let totalDeleted = 0;
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    nextPageToken = listResult.pageToken;

    if (listResult.users.length === 0) break;

    const uids = listResult.users.map((u) => u.uid);
    const batchResult = await auth.deleteUsers(uids);
    totalDeleted += batchResult.successCount;

    console.log(`   Deleted ${batchResult.successCount} users (${totalDeleted} total)`);

    if (batchResult.failureCount > 0) {
      batchResult.errors.forEach((err) => {
        console.error(`   ❌ Failed to delete ${err.index}: ${err.error.message}`);
      });
    }
  } while (nextPageToken);

  console.log('');
  console.log(`✅ Done. Deleted ${totalDeleted} auth users.`);
  process.exit(0);
}

wipeAuth().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
