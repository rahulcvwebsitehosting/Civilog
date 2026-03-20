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
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS identification_no TEXT,
ADD COLUMN IF NOT EXISTS roll_no TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS semester TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS is_hod BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Log (for email delivery tracking)
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id),
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for all tables to ensure functionality
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Grant Permissions
GRANT ALL ON public.profiles TO authenticated, anon, service_role;
GRANT ALL ON public.od_requests TO authenticated, anon, service_role;
GRANT ALL ON public.notifications TO authenticated, anon, service_role;
GRANT ALL ON public.notifications_log TO authenticated, anon, service_role;
GRANT ALL ON public.audit_logs TO authenticated, anon, service_role;

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION public.log_action()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    v_user_id := auth.uid();
    -- Try to get email from JWT
    v_user_email := auth.jwt() ->> 'email';
    
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, old_data, details)
        VALUES (v_user_id, v_user_email, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, old_data, new_data, details)
        VALUES (v_user_id, v_user_email, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, new_data, details)
        VALUES (v_user_id, v_user_email, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for Audit Logs
DROP TRIGGER IF EXISTS tr_log_od_actions ON od_requests;
CREATE TRIGGER tr_log_od_actions
AFTER INSERT OR UPDATE OR DELETE ON od_requests
FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS tr_log_profile_updates ON profiles;
CREATE TRIGGER tr_log_profile_updates
AFTER UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.log_action();

-- Sync Auth Users to Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Fix RLS infinite recursion on profiles table
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
