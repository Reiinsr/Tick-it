-- Simple fix for profile creation issue
-- This addresses the foreign key constraint error

-- Ensure profiles table exists with correct structure
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::app_role
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

-- Create profiles for any existing users that don't have them
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    COALESCE(au.raw_user_meta_data->>'role', 'user')::app_role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Re-enable RLS on profiles with proper policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then create new ones
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Ensure tickets table has proper RLS policies
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then create new ones
DROP POLICY IF EXISTS "Allow users to view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow admins to view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow admins to update tickets" ON public.tickets;

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