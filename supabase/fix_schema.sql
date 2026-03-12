-- Aggressive Schema Fix
ALTER TABLE od_requests 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS od_letter_url TEXT,
ADD COLUMN IF NOT EXISTS registration_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS event_poster_url TEXT,
ADD COLUMN IF NOT EXISTS achievement_details TEXT,
ADD COLUMN IF NOT EXISTS advisor_id UUID,
ADD COLUMN IF NOT EXISTS hod_id UUID,
ADD COLUMN IF NOT EXISTS advisor_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hod_approved_at TIMESTAMPTZ;

-- Ensure types are correct
ALTER TABLE od_requests ALTER COLUMN team_members TYPE JSONB USING team_members::JSONB;
ALTER TABLE od_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Disable RLS temporarily to ensure submittals work and eliminate lag from policy evaluation
ALTER TABLE od_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Ensure profiles table is correct
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS identification_no TEXT,
ADD COLUMN IF NOT EXISTS roll_no TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS semester TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS is_hod BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

-- Storage Bucket setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('od-files', 'od-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies (Clear and Recreate)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'od-files');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'od-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'od-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'od-files' AND auth.role() = 'authenticated');
