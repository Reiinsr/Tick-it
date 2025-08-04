-- Simple test script to verify role change functionality
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

-- Step 3: Test updating the first user's role to 'user'
UPDATE public.profiles 
SET role = 'user'::app_role 
WHERE user_id = (
    SELECT user_id 
    FROM public.profiles 
    ORDER BY created_at 
    LIMIT 1
)
RETURNING user_id, email, role;

-- Step 4: Show all profiles after the update
SELECT 
    'All profiles after update:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at;

-- Step 5: Test updating the same user back to 'admin'
UPDATE public.profiles 
SET role = 'admin'::app_role 
WHERE user_id = (
    SELECT user_id 
    FROM public.profiles 
    ORDER BY created_at 
    LIMIT 1
)
RETURNING user_id, email, role;

-- Step 6: Final verification
SELECT 
    'Final profiles:' as info,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles
ORDER BY created_at; 