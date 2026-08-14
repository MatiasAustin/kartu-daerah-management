const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://edczgncvurbazmjcgmog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3pnbmN2dXJiYXptamNnbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTg5NDIsImV4cCI6MjEwMjI3NDk0Mn0.IWlPjfMbOOC-Xmj35ISn5BudlkpyPkk5IYJFjylU-1w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('areas').select('*').limit(1);
  console.log(error ? error : JSON.stringify(data, null, 2));
}
check();
