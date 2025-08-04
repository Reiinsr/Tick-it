-- Fix role change permissions for admins
-- This script addresses the issue where admins can't change user roles

-- Step 1: Check current RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Drop existing policies that might be blocking role updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Step 3: Create new policies that allow admins to update any profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Step 4: Ensure proper permissions are granted
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Step 5: Temporarily disable RLS to test role changes
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 6: Re-enable RLS with new policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Test role change functionality
-- This will show if the policies are working correctly
SELECT 
    'Current user:' as info,
    auth.uid() as user_id,
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) as current_role;

-- Step 8: Show all profiles for verification
SELECT 
    'All profiles:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at; 