require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  });
}

const db = admin.database();
const auth = admin.auth();

async function seedMultiTenancy() {
  console.log('🌱 Starting Multi-Tenancy Seed...');

  try {
    // 1. Setup Company A (Alice)
    console.log('Creating User A (Alice)...');
    let alice;
    try {
      alice = await auth.getUserByEmail('alice@companya.com');
      await auth.deleteUser(alice.uid); // Clean up if exists
    } catch(e) {}
    
    alice = await auth.createUser({
      email: 'alice@companya.com',
      password: 'password123',
      displayName: 'Alice Admin',
    });

    const workspaceARef = db.ref('workspaces').push();
    const wsAId = workspaceARef.key;
    await workspaceARef.set({
      id: wsAId,
      workspace_id: wsAId,
      name: "Company A Workspace",
      slug: "company-a-workspace",
      owner_id: alice.uid,
      setup_completed: true,
      setup_step: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const companyARef = db.ref(`workspaces/${wsAId}/companies`).push();
    const compAId = companyARef.key;
    await companyARef.set({
      company_id: compAId,
      workspace_id: wsAId,
      name: "Company A LLC",
      legal_name: "Company A LLC",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: alice.uid
    });

    await db.ref(`users/${alice.uid}`).set({
      id: alice.uid,
      user_id: alice.uid,
      company_id: compAId,
      email: alice.email,
      full_name: 'Alice Admin',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Create a Deal in Company A
    await db.ref(`workspaces/${wsAId}/deals`).push().set({
      title: 'Top Secret Deal for Company A',
      value: 1000000,
      status: 'open',
      company_id: compAId,
      workspace_id: wsAId,
      created_by: alice.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    await db.ref('workspace_members').push().set({
      workspace_id: wsAId,
      user_id: alice.uid,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });

    console.log('✅ Company A (Alice) created successfully!');

    // 2. Setup Company B (Bob)
    console.log('Creating User B (Bob)...');
    let bob;
    try {
      bob = await auth.getUserByEmail('bob@companyb.com');
      await auth.deleteUser(bob.uid); // Clean up if exists
    } catch(e) {}
    
    bob = await auth.createUser({
      email: 'bob@companyb.com',
      password: 'password123',
      displayName: 'Bob Admin',
    });

    const workspaceBRef = db.ref('workspaces').push();
    const wsBId = workspaceBRef.key;
    await workspaceBRef.set({
      id: wsBId,
      workspace_id: wsBId,
      name: "Company B Workspace",
      slug: "company-b-workspace",
      owner_id: bob.uid,
      setup_completed: true,
      setup_step: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const companyBRef = db.ref(`workspaces/${wsBId}/companies`).push();
    const compBId = companyBRef.key;
    await companyBRef.set({
      company_id: compBId,
      workspace_id: wsBId,
      name: "Company B Corp",
      legal_name: "Company B Corp",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: bob.uid
    });

    await db.ref(`users/${bob.uid}`).set({
      id: bob.uid,
      user_id: bob.uid,
      company_id: compBId,
      email: bob.email,
      full_name: 'Bob Admin',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Create a Deal in Company B
    await db.ref(`workspaces/${wsBId}/deals`).push().set({
      title: 'Confidential Deal for Company B',
      value: 500,
      status: 'open',
      company_id: compBId,
      workspace_id: wsBId,
      created_by: bob.uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    await db.ref('workspace_members').push().set({
      workspace_id: wsBId,
      user_id: bob.uid,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });

    console.log('✅ Company B (Bob) created successfully!');
    
    console.log('\\n🎉 Multi-Tenancy Seed Complete!');
    console.log('====================================');
    console.log('TEST ACCOUNTS:');
    console.log('User 1: alice@companya.com / password123');
    console.log('User 2: bob@companyb.com / password123');
    console.log('====================================');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedMultiTenancy();
