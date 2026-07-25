/**
 * Nuclear Option: Wipe all Firebase Realtime Database data.
 *
 * Usage:
 *   node scripts/wipe-firebase-db.mjs
 *
 * Prerequisites:
 *   npm install firebase
 *
 * OR use Firebase CLI (simpler):
 *   firebase database:data:remove / --project crm-whitelab
 *
 * OR use curl (if DB rules allow unauthenticated writes):
 *   curl -X DELETE "https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app/.json"
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCUD5zHL-FhLrIMOifiibetaJZnMe55JA0',
  authDomain: 'crm-whitelab.firebaseapp.com',
  databaseURL: 'https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'crm-whitelab',
  storageBucket: 'crm-whitelab.firebasestorage.app',
  messagingSenderId: '184530357114',
  appId: '1:184530357114:web:29c1050e223a18541c64c3',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function wipeDatabase() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from Firebase Realtime Database.');
  console.log('   Project: crm-whitelab');
  console.log('   URL: https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app');
  console.log('');

  // Simple confirmation
  const answer = process.argv.includes('--confirm');
  if (!answer) {
    console.log('To confirm, run again with --confirm flag:');
    console.log('  node scripts/wipe-firebase-db.mjs --confirm');
    process.exit(0);
  }

  console.log('🗑️  Deleting all data...');

  try {
    await remove(ref(db, '/'));
    console.log('✅ All data deleted successfully.');
  } catch (error) {
    console.error('❌ Failed to delete data:', error.message);
    console.log('');
    console.log('If permission denied, you may need to:');
    console.log('1. Temporarily set database rules to allow writes:');
    console.log('   { "rules": { ".read": true, ".write": true } }');
    console.log('2. Run this script again');
    console.log('3. Restore the original rules');
    process.exit(1);
  }

  process.exit(0);
}

wipeDatabase();
