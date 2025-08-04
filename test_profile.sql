-- Test script to check and create profile for current user
-- Run this in Supabase SQL Editor

-- Check if current user has a profile
SELECT 
    'Current user:' as info,
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Check if profile exists
SELECT 
    'Profile exists:' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) 
        THEN 'YES' 
        ELSE 'NO' 
    END as has_profile;

-- Create profile if it doesn't exist
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT 
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
        (SELECT email FROM auth.users WHERE id = auth.uid())
    ),
    'user'::app_role
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid());

-- Verify profile was created
SELECT 
    'Profile after creation:' as info,
    user_id,
    email,
    full_name,
    role
FROM public.profiles 
WHERE user_id = auth.uid(); 