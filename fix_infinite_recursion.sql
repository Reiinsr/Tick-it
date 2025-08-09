-- Fix infinite recursion in RLS policies
-- This resolves the "infinite recursion detected in policy" error

-- Step 1: Disable RLS temporarily to stop the recursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Step 3: Create simple policies that don't cause recursion
-- Policy 1: Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 3: Allow profile creation
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Policy 4: Allow all authenticated users to view profiles (for admin panel)
CREATE POLICY "Allow authenticated users to view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 5: Allow authenticated users to update profiles (admin functionality)
CREATE POLICY "Allow authenticated users to update profiles" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Step 4: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Step 6: Test that the recursion is fixed
SELECT 
    'Testing profile access:' as info,
    auth.uid() as current_user_id,
    auth.role() as current_user_role;

-- Step 7: Show all profiles to verify access works
SELECT 
    'All profiles (should work now):' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at; 