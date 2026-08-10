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
  const usersSnap = await get(ref(db, 'users'));
  const users = usersSnap.val();
  const user = Object.values(users).find(u => u.email === 'aathishpirate@gmail.com' || u.full_name === 'Aathish S');
  console.log("Found user:", user.email, "company_id:", user.company_id);

  const wsSnap = await get(ref(db, 'workspaces'));
  const workspaces = wsSnap.val();
  console.log("Workspace IDs:", Object.keys(workspaces));
  
  const userWs = workspaces[user.company_id];
  if (userWs) {
     console.log("User's workspace name:", userWs.name);
     console.log("User's workspace owner:", userWs.owner_id);
  } else {
     console.log("User's workspace not found!");
  }
  process.exit(0);
}
main();
