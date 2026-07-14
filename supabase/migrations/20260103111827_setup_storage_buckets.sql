-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('support', 'support', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for 'projects' bucket
-- Allow anyone to view objects (Public bucket)
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Projects Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'projects');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
CREATE POLICY "Projects Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'projects');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;
CREATE POLICY "Projects Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'projects' AND (auth.uid()::text = (storage.foldername(name))[1]));


-- Set up RLS for 'support' bucket
-- Allow public read (so admins can see it)
CREATE POLICY "Support Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'support');

-- Allow authenticated users to upload
CREATE POLICY "Support Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support');

-- Authenticated Delete
CREATE POLICY "Support Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'support' AND (auth.uid()::text = (storage.foldername(name))[1]));
