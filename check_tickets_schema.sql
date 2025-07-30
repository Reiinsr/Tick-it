-- Check tickets table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'tickets' 
AND table_schema = 'public'; 