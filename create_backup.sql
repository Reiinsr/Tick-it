-- Create a complete backup of the database
-- Run this in Supabase SQL Editor and copy the results

-- Backup 1: Database schema
SELECT 
    '-- Database Schema Backup' as backup_section,
    '-- Generated on: ' || NOW() as timestamp;

-- Show all tables
SELECT 
    '-- Table: ' || table_name as table_info,
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' as create_statement
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show table structures
SELECT 
    '-- Table structure for ' || table_name as table_structure,
    '-- Columns:' as columns_header
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show column details
SELECT 
    '-- ' || table_name || '.' || column_name || ' - ' || data_type || 
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
    as column_info
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Backup 2: RLS Policies
SELECT 
    '-- RLS Policies' as policies_section,
    '-- Table: ' || tablename || ', Policy: ' || policyname || 
    ', Command: ' || cmd || ', Using: ' || COALESCE(qual, 'N/A') as policy_info
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Backup 3: Data from profiles table
SELECT 
    '-- Profiles Data' as data_section,
    'INSERT INTO public.profiles (user_id, email, full_name, role, created_at, updated_at) VALUES' as insert_statement,
    '(''' || user_id || ''', ''' || email || ''', ''' || full_name || ''', ''' || role || '''::app_role, ''' || created_at || ''', ''' || updated_at || ''');' as data_row
FROM public.profiles
ORDER BY created_at;

-- Backup 4: Data from tickets table (without priority column)
SELECT 
    '-- Tickets Data' as tickets_section,
    'INSERT INTO public.tickets (id, title, description, category, status, requester_id, assigned_to_id, date_created, date_updated, due_date, resolution_notes) VALUES' as insert_statement,
    '(''' || id || ''', ''' || title || ''', ''' || COALESCE(description, '') || ''', ''' || category || ''', ''' || status || ''', ''' || requester_id || ''', ' || 
    CASE WHEN assigned_to_id IS NULL THEN 'NULL' ELSE '''' || assigned_to_id || '''' END || ', ''' || date_created || ''', ''' || date_updated || ''', ' ||
    CASE WHEN due_date IS NULL THEN 'NULL' ELSE '''' || due_date || '''' END || ', ' ||
    CASE WHEN resolution_notes IS NULL THEN 'NULL' ELSE '''' || resolution_notes || '''' END || ');' as data_row
FROM public.tickets
ORDER BY date_created;

-- Backup 5: Data from admin_settings table (if exists)
SELECT 
    '-- Admin Settings Data' as settings_section,
    'INSERT INTO public.admin_settings (id, key, value, created_at, updated_at) VALUES' as insert_statement,
    '(''' || id || ''', ''' || key || ''', ''' || value || ''', ''' || created_at || ''', ''' || updated_at || ''');' as data_row
FROM public.admin_settings
ORDER BY created_at;

-- Backup 6: Functions and Triggers
SELECT 
    '-- Functions and Triggers' as functions_section,
    '-- Function: ' || routine_name || ' - ' || routine_type as function_info
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Backup 7: Summary
SELECT 
    '-- Database Backup Summary' as summary_section,
    '-- Total profiles: ' || (SELECT COUNT(*) FROM public.profiles) as profile_count,
    '-- Total tickets: ' || (SELECT COUNT(*) FROM public.tickets) as ticket_count,
    '-- Total admin settings: ' || (SELECT COUNT(*) FROM public.admin_settings) as settings_count,
    '-- Backup completed at: ' || NOW() as backup_time; 