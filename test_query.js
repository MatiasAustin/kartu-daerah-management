require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from("group_managers")
    .select(`
      id,
      user_id,
      created_at,
      groups!inner(id, name, projects!inner(owner_id)),
      profiles:user_id(email, full_name)
    `);
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
