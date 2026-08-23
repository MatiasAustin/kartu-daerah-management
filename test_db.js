const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://edczgncvurbazmjcgmog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3pnbmN2dXJiYXptamNnbW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY5ODk0MiwiZXhwIjoyMTAyMjc0OTQyfQ.0McJUar9LEK182OJ2Guj5WyqAKqnppietzJ97LRZOEU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const tias = users.users.find(u => u.email === 'tiasaustin32@gmail.com');
  console.log('Tias ID:', tias?.id);

  if (tias) {
    const { data: projects } = await supabase.from('projects').select('*').eq('owner_id', tias.id);
    console.log('Projects owned by tias:', projects);

    const { data: groups } = await supabase.from('groups').select('*, projects!inner(owner_id)').eq('projects.owner_id', tias.id);
    console.log('Groups for tias projects:', groups);

    const { data: managers } = await supabase.from('group_managers').select('*, groups!inner(projects!inner(owner_id))').eq('groups.projects.owner_id', tias.id);
    console.log('Group Managers:', managers);
  }
}

check();
