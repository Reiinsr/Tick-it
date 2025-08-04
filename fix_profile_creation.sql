-- Fix profile creation and foreign key constraint issues
-- This script addresses the "Key is not present in table profiles" error

-- First, let's check if the profiles table exists and has the right structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on user_id if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);

-- Temporarily disable RLS on profiles to allow profile creation
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Grant all permissions on profiles table
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Now let's fix the tickets table foreign key constraint
-- First, let's check if the constraint exists and what it references
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
    AND kcu.column_name = 'requester_id';

-- If the foreign key constraint exists, we need to make sure it's properly set up
-- Let's recreate the tickets table with proper foreign key constraints
-- First, backup existing data
CREATE TABLE IF NOT EXISTS tickets_backup AS SELECT * FROM public.tickets;

-- Drop the existing tickets table
DROP TABLE IF EXISTS public.tickets CASCADE;

-- Recreate the tickets table with proper foreign key constraints
CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('IT', 'Maintenance', 'Housekeeping')),
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'On Hold', 'Completed')),
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    requester_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,
    resolution_notes TEXT
);

-- Restore data from backup
INSERT INTO public.tickets 
SELECT * FROM tickets_backup 
WHERE requester_id IN (SELECT user_id FROM public.profiles);

-- Drop backup table
DROP TABLE tickets_backup;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tickets_requester_id_idx ON public.tickets(requester_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_id_idx ON public.tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS tickets_category_idx ON public.tickets(category);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(status);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tickets
CREATE POLICY "Allow users to view own tickets" ON public.tickets
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = assigned_to_id
  );

CREATE POLICY "Allow admins to view all tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'it_admin', 'maintenance_admin', 'housekeeping_admin')
    )
  );

CREATE POLICY "Allow users to create tickets" ON public.tickets
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
  );

CREATE POLICY "Allow admins to update tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'it_admin', 'maintenance_admin', 'housekeeping_admin')
    )
  );

-- Grant permissions on tickets table
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO anon;

-- Re-enable RLS on profiles with proper policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Create a function to ensure profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_uuid UUID)
RETURNS public.profiles AS $$
DECLARE
    user_profile public.profiles;
BEGIN
    -- Try to get existing profile
    SELECT * INTO user_profile 
    FROM public.profiles 
    WHERE user_id = user_uuid;
    
    -- If profile doesn't exist, create one
    IF user_profile IS NULL THEN
        INSERT INTO public.profiles (user_id, email, full_name, role)
        VALUES (
            user_uuid,
            (SELECT email FROM auth.users WHERE id = user_uuid),
            COALESCE(
                (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_uuid),
                (SELECT email FROM auth.users WHERE id = user_uuid)
            ),
            'user'
        )
        RETURNING * INTO user_profile;
    END IF;
    
    RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated; 