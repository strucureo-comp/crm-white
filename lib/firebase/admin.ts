import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Database, getDatabase } from 'firebase-admin/database';

let adminAuthInstance: Auth | null = null;
let adminDbInstance: Database | null = null;

const DEFAULT_DATABASE_URL = 'https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app';

export function isAdminAvailable(): boolean {
  return true;
}

function getAdminApp() {
  if (getApps().length > 0) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'crm-whitelab';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@crm-whitelab.iam.gserviceaccount.com';
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!privateKey) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY environment variable is not set');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL,
  });
}

export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    const app = getAdminApp();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}

export function getAdminDatabase(): Database {
  if (!adminDbInstance) {
    const app = getAdminApp();
    adminDbInstance = getDatabase(app);
  }
  return adminDbInstance;
}
