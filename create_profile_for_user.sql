-- Create profile for a specific user by email
-- Replace 'your-email@example.com' with the actual email address

-- First, find the user by email
SELECT 
    'User found:' as info,
    id as user_id,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Create profile for this user (replace the email above)
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    COALESCE(au.raw_user_meta_data->>'role', 'user')::app_role
FROM auth.users au
WHERE au.email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Verify the profile was created
SELECT 
    'Profile created:' as info,
    user_id,
    email,
    full_name,
    role
FROM public.profiles 
WHERE email = 'your-email@example.com'; 