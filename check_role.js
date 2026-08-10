require('dotenv').config({ path: '.env' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const projectId = process.env.FIREBASE_PROJECT_ID || 'crm-whitelab';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, '\n');
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  databaseURL: databaseURL
});

async function main() {
  const db = getDatabase(app);
  const usersSnap = await db.ref('users').once('value');
  const users = usersSnap.val() || {};
  
  for (const [uid, user] of Object.entries(users)) {
    console.log(`User ${uid} role: ${user.role}`);
  }
  process.exit(0);
}

main().catch(console.error);
