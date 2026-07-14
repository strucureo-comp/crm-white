const { createClient } = require('@supabase/supabase-js');

// Config from project .env
const SUPABASE_URL = 'https://jlelkhrhdiyjwzzzthxv.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZWxraHJoZGl5and6enp0aHh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNTg4MSwiZXhwIjoyMDgzMDExODgxfQ.zXiu97jxzvTtZJnemiIqRCPJxRBiPtcVYygAsmlNo3c';

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Error: Configuration missing.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createBuckets() {
    console.log('Checking buckets...');

    const bucketsToCreate = ['finance', 'projects'];

    for (const bucket of bucketsToCreate) {
        // Try to get the bucket first
        const { data: existingBucket, error: getError } = await supabase.storage.getBucket(bucket);

        if (existingBucket) {
            console.log(`Bucket '${bucket}' already exists.`);
            // Ensure it's public
            const { error: updateError } = await supabase.storage.updateBucket(bucket, {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/plain']
            });
            if (updateError) console.error(`Error updating bucket '${bucket}':`, updateError.message);
            else console.log(`Bucket '${bucket}' updated to public.`);
        } else {
            console.log(`Creating bucket '${bucket}'...`);
            const { data, error } = await supabase.storage.createBucket(bucket, {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/plain']
            });

            if (error) {
                console.error(`Failed to create bucket '${bucket}':`, error.message);
            } else {
                console.log(`Bucket '${bucket}' created successfully.`);
            }
        }
    }
}

createBuckets()
    .then(() => console.log('Done.'))
    .catch(err => console.error('Script error:', err));
