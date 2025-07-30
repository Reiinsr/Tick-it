-- Check current RLS policies on tickets table
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
WHERE tablename = 'tickets';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tickets';

-- Check current user and authentication
SELECT 
    current_user,
    session_user,
    auth.uid() as current_auth_uid; 