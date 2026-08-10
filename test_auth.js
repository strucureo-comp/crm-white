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
  if (usersSnap.exists()) {
    const users = usersSnap.val();
    for (const [uid, uData] of Object.entries(users)) {
      if (uData.email === 'aathishpirate@gmail.com' || uData.full_name === 'Aathish S') {
         console.log("User:", uid, uData.email, "company_id:", uData.company_id);
      }
    }
  }
  process.exit(0);
}
main();
