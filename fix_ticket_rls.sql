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

-- Fix RLS policies for tickets table to allow proper access
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow ticket viewing" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket creation" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket updates by admins" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket updates by category admins" ON public.tickets;

-- Create comprehensive policies that work for all roles
-- Policy 1: Allow users to view their own tickets
CREATE POLICY "Allow users to view own tickets" ON public.tickets
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = assigned_to_id
  );

-- Policy 2: Allow admins to view all tickets
CREATE POLICY "Allow admins to view all tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'it_admin', 'maintenance_admin', 'housekeeping_admin')
    )
  );

-- Policy 3: Allow users to create tickets
CREATE POLICY "Allow users to create tickets" ON public.tickets
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
  );

-- Policy 4: Allow admins to update any ticket
CREATE POLICY "Allow admins to update tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 5: Allow category admins to update tickets in their department
CREATE POLICY "Allow category admins to update department tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND 
      (
        (role = 'it_admin' AND category = 'IT') OR
        (role = 'maintenance_admin' AND category = 'Maintenance') OR
        (role = 'housekeeping_admin' AND category = 'Housekeeping')
      )
    )
  );

-- Enable RLS if not already enabled
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO anon; 