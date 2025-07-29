// Test script to verify database changes
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseChanges() {
  console.log('Testing database changes...\n');

  // Test 1: Check if new role types are available
  console.log('1. Testing role types...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('role')
      .limit(5);
    
    if (error) {
      console.log('❌ Error fetching profiles:', error.message);
    } else {
      console.log('✅ Profiles fetched successfully');
      console.log('Available roles:', [...new Set(profiles.map(p => p.role))]);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Check admin_settings table access
  console.log('\n2. Testing admin_settings access...');
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error accessing admin_settings:', error.message);
    } else {
      console.log('✅ admin_settings table accessible');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Check tickets table with role-based filtering
  console.log('\n3. Testing tickets table...');
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:requester_id (id, full_name, email),
        assigned_to:assigned_to_id (id, full_name, email)
      `)
      .limit(5);
    
    if (error) {
      console.log('❌ Error fetching tickets:', error.message);
    } else {
      console.log('✅ Tickets fetched successfully');
      console.log('Sample ticket categories:', [...new Set(data.map(t => t.category))]);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ Database tests completed!');
}

// Run the test
testDatabaseChanges(); 