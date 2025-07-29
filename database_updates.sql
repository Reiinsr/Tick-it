-- Update the app_role enum to include new role types
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'it_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'maintenance_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'housekeeping_admin';

-- Add a public read policy for admin_settings table (to fix the sign-out issue)
CREATE POLICY "Allow public read" ON public.admin_settings FOR SELECT USING (true);

-- Optional: Add an index on tickets table for better performance with role-based filtering
CREATE INDEX IF NOT EXISTS idx_tickets_requester_id ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_date_created ON tickets(date_created); 