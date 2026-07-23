import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';

let adminAuthInstance: Auth | null = null;

export function isAdminAvailable(): boolean {
  return true;
}

function getAdminApp() {
  if (getApps().length > 0) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || 'crm-whitelab';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@crm-whitelab.iam.gserviceaccount.com';
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!privateKey) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY environment variable is not set');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    const app = getAdminApp();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}
