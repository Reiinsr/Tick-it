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

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;

-- Create new policies that allow category admins to update their department's tickets
CREATE POLICY "Allow ticket viewing" ON public.tickets
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = assigned_to_id OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'it_admin', 'maintenance_admin', 'housekeeping_admin')
    )
  );

CREATE POLICY "Allow ticket creation" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Allow ticket updates by admins" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow ticket updates by category admins" ON public.tickets
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

-- Grant necessary permissions
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO anon; 