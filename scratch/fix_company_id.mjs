const dbUrl = 'https://crm-whitelab-default-rtdb.asia-southeast1.firebasedatabase.app';

async function fixUser() {
  try {
    console.log('Fetching users...');
    const res = await fetch(`${dbUrl}/users.json`);
    const users = await res.json();
    
    let targetUserId = null;
    for (const [userId, userData] of Object.entries(users)) {
      if (userData.email === '3@outlook.com' || userData.company_id === '-OyuHjOXKqM7XZcr9Fxt') {
        targetUserId = userId;
        console.log(`Found ulti bulti! User ID: ${userId}`);
        break;
      }
    }
    
    if (targetUserId) {
      console.log('Updating company_id to match mama mannan (-OyuFRRJLWBdXtflnzJM)...');
      const patchRes = await fetch(`${dbUrl}/users/${targetUserId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: '-OyuFRRJLWBdXtflnzJM' })
      });
      
      const result = await patchRes.json();
      console.log('Update result:', result);
      console.log('Successfully updated!');
    } else {
      console.log('Could not find user ulti bulti in the database.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUser();
