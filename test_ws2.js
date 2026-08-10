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
  const wsSnap = await get(ref(db, 'workspaces/-Oz1oUw2yKMRrRUymxq6'));
  console.log(Object.keys(wsSnap.val() || {}));
  process.exit(0);
}
main();
