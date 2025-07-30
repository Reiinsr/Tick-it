-- Simple RLS policies to fix 403 error
-- First, drop all existing policies
DROP POLICY IF EXISTS "Allow users to view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow admins to view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow admins to update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow category admins to update department tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket viewing" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket creation" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket updates by admins" ON public.tickets;
DROP POLICY IF EXISTS "Allow ticket updates by category admins" ON public.tickets;

-- Temporarily disable RLS to test
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create very simple policies
-- Allow all authenticated users to view tickets
CREATE POLICY "Allow authenticated users to view tickets" ON public.tickets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create tickets
CREATE POLICY "Allow authenticated users to create tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update tickets
CREATE POLICY "Allow authenticated users to update tickets" ON public.tickets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.tickets TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 