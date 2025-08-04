-- Diagnostic script to identify role change issues
-- Run this in Supabase SQL Editor

-- Step 1: Check if the specific user exists
SELECT 
    'User check:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE user_id = '941fcc54-d2d2-4c0c-acb6-8352c3fb432e';

-- Step 2: Check current RLS policies
SELECT 
    'Current RLS policies:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 3: Check RLS status
SELECT 
    'RLS status:' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 4: Test the exact update that's failing
UPDATE public.profiles 
SET role = 'it_admin'::app_role 
WHERE user_id = '941fcc54-d2d2-4c0c-acb6-8352c3fb432e'
RETURNING user_id, email, role;

-- Step 5: Check if the update actually worked
SELECT 
    'After update check:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE user_id = '941fcc54-d2d2-4c0c-acb6-8352c3fb432e';

-- Step 6: Show all profiles for comparison
SELECT 
    'All profiles:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at; 