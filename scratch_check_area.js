const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://edczgncvurbazmjcgmog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3pnbmN2dXJiYXptamNnbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTg5NDIsImV4cCI6MjEwMjI3NDk0Mn0.IWlPjfMbOOC-Xmj35ISn5BudlkpyPkk5IYJFjylU-1w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Try fetching with service role bypass — but we only have anon key
  // Let's try to sign in first to see the data
  
  // Try sign in with test credentials
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'test@test.com',
    password: 'test123456'
  });
  
  if (signInErr) {
    console.log('Sign in failed:', signInErr.message);
    // Try fetching anyway (RLS might allow select for owner)
  } else {
    console.log('Signed in as:', signIn.user?.email);
  }
  
  const { data, error } = await supabase
    .from('areas')
    .select('id, name, geometry, geojson, group_id')
    .limit(3);
  
  if (error) {
    console.log('Error:', JSON.stringify(error));
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No areas found (possibly RLS blocking anon access)');
    return;
  }
  
  data.forEach((a, i) => {
    console.log(`\n=== Area ${i + 1}: ${a.name} ===`);
    console.log('geometry type:', typeof a.geometry);
    console.log('geometry value:', JSON.stringify(a.geometry)?.substring(0, 200));
    console.log('geojson:', a.geojson);
  });
}

check();
