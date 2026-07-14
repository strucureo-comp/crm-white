import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCUD5zHL-FhLrIMOifiibetaJZnMe55JA0',
  authDomain: 'crm-whitelab.firebaseapp.com',
  databaseURL: 'https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'crm-whitelab',
  storageBucket: 'crm-whitelab.firebasestorage.app',
  messagingSenderId: '184530357114',
  appId: '1:184530357114:web:29c1050e223a18541c64c3',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
