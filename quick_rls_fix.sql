-- Quick fix to test role changes by temporarily disabling RLS
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS status
SELECT 
    'Current RLS status:' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 2: Temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Test role change (this should work now)
UPDATE public.profiles 
SET role = 'user'::app_role 
WHERE user_id = (
    SELECT user_id 
    FROM public.profiles 
    ORDER BY created_at 
    LIMIT 1
)
RETURNING user_id, email, role;

-- Step 4: Change it back to admin
UPDATE public.profiles 
SET role = 'admin'::app_role 
WHERE user_id = (
    SELECT user_id 
    FROM public.profiles 
    ORDER BY created_at 
    LIMIT 1
)
RETURNING user_id, email, role;

-- Step 5: Show all profiles
SELECT 
    'All profiles after RLS disabled:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at;

-- Step 6: Re-enable RLS with proper policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Create new policies
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

-- Step 8: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon; 