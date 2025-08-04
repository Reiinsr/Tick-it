-- Test script to verify role change functionality
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS policies
SELECT 
    'Current RLS policies on profiles:' as info,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Show all profiles
SELECT 
    'All profiles:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at;

-- Step 3: Test updating a role (replace with actual user_id)
-- This will help identify if the issue is with RLS policies
UPDATE public.profiles 
SET role = 'user'::app_role 
WHERE user_id = 'your-user-id-here'
RETURNING user_id, email, role;

-- Step 4: Check if the update worked
SELECT 
    'After update:' as info,
    user_id,
    email,
    role
FROM public.profiles 
WHERE user_id = 'your-user-id-here';

-- Step 5: Show current user context
SELECT 
    'Current user context:' as info,
    auth.uid() as current_user_id,
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) as current_user_role; 