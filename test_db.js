const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyCUD5zHL-FhLrIMOifiibetaJZnMe55JA0",
  authDomain: "crm-whitelab.firebaseapp.com",
  databaseURL: "https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crm-whitelab",
  storageBucket: "crm-whitelab.firebasestorage.app",
  messagingSenderId: "184530357114",
  appId: "1:184530357114:web:29c1050e223a18541c64c3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function main() {
  const workspacesSnap = await get(ref(db, 'workspaces'));
  if (workspacesSnap.exists()) {
    const workspaces = workspacesSnap.val();
    for (const [wsId, wsData] of Object.entries(workspaces)) {
      if (wsData.invoices) {
        console.log(`Workspace ${wsId} has ${Object.keys(wsData.invoices).length} invoices`);
        const latestInvoice = Object.values(wsData.invoices).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        console.log("Latest Invoice:", JSON.stringify(latestInvoice, null, 2));
      }
      if (wsData.payments) {
        console.log(`Workspace ${wsId} has ${Object.keys(wsData.payments).length} payments`);
        console.log("Payments:", JSON.stringify(wsData.payments, null, 2));
      } else {
        console.log(`Workspace ${wsId} has NO payments!`);
      }
    }
  } else {
    console.log("No workspaces found");
  }
  process.exit(0);
}
main();
