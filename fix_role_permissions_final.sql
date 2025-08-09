-- Final fix for role change permissions
-- This will resolve the empty array issue when changing roles

-- Step 1: Temporarily disable RLS to test
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Test role change without RLS
UPDATE public.profiles 
SET role = 'housekeeping_admin'::app_role 
WHERE user_id = 'ad8aed98-64ef-414b-8de7-1544707dd92f'
RETURNING user_id, email, role;

-- Step 3: Verify the change worked
SELECT 
    'After RLS disabled:' as info,
    user_id,
    email,
    full_name,
    role
FROM public.profiles 
WHERE user_id = 'ad8aed98-64ef-414b-8de7-1544707dd92f';

-- Step 4: Re-enable RLS with correct policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Step 6: Create new policies that work correctly
-- Policy 1: Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 3: Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 4: Allow admins to update any profile
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 5: Allow profile creation
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Step 7: Grant all necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Step 8: Test role change with RLS enabled
UPDATE public.profiles 
SET role = 'user'::app_role 
WHERE user_id = 'ad8aed98-64ef-414b-8de7-1544707dd92f'
RETURNING user_id, email, role;

-- Step 9: Final verification
SELECT 
    'Final test:' as info,
    user_id,
    email,
    full_name,
    role
FROM public.profiles 
WHERE user_id = 'ad8aed98-64ef-414b-8de7-1544707dd92f';

-- Step 10: Show all profiles
SELECT 
    'All profiles:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at; 