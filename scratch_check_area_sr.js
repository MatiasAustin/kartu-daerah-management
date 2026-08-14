const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://edczgncvurbazmjcgmog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3pnbmN2dXJiYXptamNnbW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY5ODk0MiwiZXhwIjoyMTAyMjc0OTQyfQ.0McJUar9LEK182OJ2Guj5WyqAKqnppietzJ97LRZOEU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('areas').select('*');
  console.log(error ? error : JSON.stringify(data, null, 2));
}
check();
