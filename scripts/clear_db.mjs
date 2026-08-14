import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin SDK
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'crm-whitelab';
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@crm-whitelab.iam.gserviceaccount.com';
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '';

// Handle escaped newlines and surrounding quotes
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, '\n');

const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app';

console.log('Initializing Firebase Admin for project:', projectId);
console.log('Database URL:', databaseURL);

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  databaseURL,
});

const auth = getAuth(app);
const db = getDatabase(app);

async function clearAuth() {
  console.log('\n--- 1. Clearing Firebase Auth Users ---');
  let totalDeleted = 0;
  let pageToken;

  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);
    const uids = listUsersResult.users.map(userRecord => userRecord.uid);

    if (uids.length > 0) {
      console.log(`Found ${uids.length} users:`, listUsersResult.users.map(u => `${u.email || 'No email'} (${u.uid})`).join(', '));
      const deleteResult = await auth.deleteUsers(uids);
      totalDeleted += deleteResult.successCount;
      console.log(`Successfully deleted ${deleteResult.successCount} users (failures: ${deleteResult.failureCount})`);
    } else {
      console.log('No users found in Firebase Auth.');
    }

    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  console.log(`Total Auth users deleted: ${totalDeleted}`);
}

async function clearDatabase() {
  console.log('\n--- 2. Clearing Firebase Realtime Database ---');
  const rootRef = db.ref('/');
  
  const snapshot = await rootRef.once('value');
  const data = snapshot.val();

  if (data) {
    const keys = Object.keys(data);
    console.log(`Found ${keys.length} root nodes:`, keys.join(', '));
    await rootRef.remove();
    console.log('Successfully cleared all database nodes at root ("/").');
  } else {
    console.log('Database is already empty.');
  }
}

async function main() {
  try {
    await clearAuth();
    await clearDatabase();
    console.log('\n✅ Database and Auth cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing database / auth:', error);
    process.exit(1);
  }
}

main();
