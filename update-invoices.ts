// @ts-nocheck
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";
import * as dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function main() {
  const workspacesSnap = await get(ref(db, "workspaces"));
  if (!workspacesSnap.exists()) return;
  const workspaces = workspacesSnap.val();
  
  for (const companyId of Object.keys(workspaces)) {
    const invoicesRef = ref(db, `workspaces/${companyId}/invoices`);
    const invSnap = await get(invoicesRef);
    if (!invSnap.exists()) continue;
    const invoices = invSnap.val();
    
    for (const [invId, inv] of Object.entries<any>(invoices)) {
      if (!inv.payment_method || !inv.payment_terms) {
        console.log(`Updating invoice ${invId}`);
        await update(ref(db, `workspaces/${companyId}/invoices/${invId}`), {
          payment_method: inv.payment_method || 'bank_transfer',
          payment_terms: inv.payment_terms || 'net_30',
          amount_paid: inv.amount_paid || 0,
        });
      }
    }
  }
  console.log("Done");
  process.exit(0);
}

main();
