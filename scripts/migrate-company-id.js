const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  });
}

const db = getDatabase();

const COLLECTIONS_TO_UPDATE = [
  'deals',
  'leads',
  'projects',
  'tasks',
  'invoices',
  'transactions',
  'quotes',
  'contacts',
  'activities',
  'support_requests',
  'meeting_requests',
  'calendar_events',
  'content_items',
  'campaigns',
  'social_posts',
  'email_campaigns',
  'automation_rules',
  'enquiries'
];

async function migrate() {
  console.log('🚀 Starting Data Migration for company_id...');
  
  let stats = {
    workspacesProcessed: 0,
    companiesCreated: 0,
    recordsUpdated: 0,
    recordsAlreadyOk: 0,
    usersUpdated: 0,
    usersAlreadyOk: 0
  };

  try {
    const workspacesSnap = await db.ref('workspaces').once('value');
    const workspaces = workspacesSnap.val() || {};

    // 1. Process all workspaces and their data
    for (const [wsId, wsData] of Object.entries(workspaces)) {
      stats.workspacesProcessed++;
      console.log(`\nProcessing Workspace: ${wsData.name || wsId}`);
      
      let defaultCompanyId = null;
      
      // Look for an existing company
      const companies = wsData.companies || {};
      const companyIds = Object.keys(companies);
      
      if (companyIds.length > 0) {
        defaultCompanyId = companyIds[0];
        console.log(`Found existing company: ${defaultCompanyId}`);
      } else {
        // Create a default company
        const newCompRef = db.ref(`workspaces/${wsId}/companies`).push();
        defaultCompanyId = newCompRef.key;
        
        await newCompRef.set({
          company_id: defaultCompanyId,
          workspace_id: wsId,
          name: `${wsData.name || 'Default'} Company`,
          legal_name: `${wsData.name || 'Default'} Company`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: wsData.owner_id || ''
        });
        stats.companiesCreated++;
        console.log(`Created new Default Company: ${defaultCompanyId}`);
      }

      // Update all collections in this workspace
      for (const collection of COLLECTIONS_TO_UPDATE) {
        if (wsData[collection]) {
          const updates = {};
          for (const [itemId, item] of Object.entries(wsData[collection])) {
            if (!item.company_id || item.company_id === '') {
              updates[`${itemId}/company_id`] = defaultCompanyId;
              stats.recordsUpdated++;
            } else {
              stats.recordsAlreadyOk++;
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await db.ref(`workspaces/${wsId}/${collection}`).update(updates);
            console.log(`Updated ${Object.keys(updates).length} records in '${collection}'`);
          }
        }
      }
      
      // Update workspace_members (we can just note them for the users pass)
    }

    // 2. Process all Users
    console.log('\nProcessing Users...');
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val() || {};
    const membersSnap = await db.ref('workspace_members').once('value');
    const members = membersSnap.val() || {};
    
    // Map userId -> workspaceId to figure out which company to put them in
    const userWorkspaceMap = {};
    for (const member of Object.values(members)) {
      if (!userWorkspaceMap[member.user_id]) {
        userWorkspaceMap[member.user_id] = member.workspace_id;
      }
    }
    
    const userUpdates = {};
    for (const [userId, user] of Object.entries(users)) {
      if (!user.company_id || user.company_id === '') {
        const wsId = userWorkspaceMap[userId];
        if (wsId) {
          // get the workspace's default company
          const wsCompSnap = await db.ref(`workspaces/${wsId}/companies`).once('value');
          const wsComps = wsCompSnap.val() || {};
          const firstCompId = Object.keys(wsComps)[0];
          
          if (firstCompId) {
            userUpdates[`${userId}/company_id`] = firstCompId;
            stats.usersUpdated++;
          }
        }
      } else {
        stats.usersAlreadyOk++;
      }
    }
    
    if (Object.keys(userUpdates).length > 0) {
      await db.ref('users').update(userUpdates);
      console.log(`Updated ${Object.keys(userUpdates).length} users`);
    }

    // 3. Final Verification
    console.log('\n🔍 Verifying Data...');
    let remainingNulls = 0;
    
    const verifyWsSnap = await db.ref('workspaces').once('value');
    for (const [wsId, wsData] of Object.entries(verifyWsSnap.val() || {})) {
      for (const collection of COLLECTIONS_TO_UPDATE) {
        if (wsData[collection]) {
          for (const item of Object.values(wsData[collection])) {
            if (!item.company_id || item.company_id === '') {
              remainingNulls++;
            }
          }
        }
      }
    }
    
    const verifyUserSnap = await db.ref('users').once('value');
    for (const user of Object.values(verifyUserSnap.val() || {})) {
      if (!user.company_id || user.company_id === '') {
        // Only count real users, not systemic ones
        if (user.email) remainingNulls++;
      }
    }

    console.log('\n=============================================');
    console.log('✅ MIGRATION COMPLETE');
    console.log('Workspaces processed:', stats.workspacesProcessed);
    console.log('New default companies created:', stats.companiesCreated);
    console.log('Business records updated:', stats.recordsUpdated);
    console.log('Business records already compliant:', stats.recordsAlreadyOk);
    console.log('Users updated:', stats.usersUpdated);
    console.log('Users already compliant:', stats.usersAlreadyOk);
    console.log('---------------------------------------------');
    console.log(`🚨 Records with NULL/Missing company_id: ${remainingNulls}`);
    console.log('=============================================');

    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
