-- Fix RLS Policies for Storage because we are using Firebase Auth (so Supabase sees everyone as 'anon')

-- 1. Drop old policies
DROP POLICY IF EXISTS "Projects Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Projects Authenticated Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Support Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Support Authenticated Delete Access" ON storage.objects;

-- 2. Create new policies that allow 'anon' (unauthenticated) access
-- We still keep them restricted by bucket_id

-- Projects Bucket
CREATE POLICY "Projects Anon Upload Access"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'projects');

CREATE POLICY "Projects Anon Delete Access"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'projects');


-- Support Bucket
CREATE POLICY "Support Anon Upload Access"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'support');

CREATE POLICY "Support Anon Delete Access"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'support');
