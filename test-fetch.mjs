import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://edczgncvurbazmjcgmog.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3pnbmN2dXJiYXptamNnbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTg5NDIsImV4cCI6MjEwMjI3NDk0Mn0.IWlPjfMbOOC-Xmj35ISn5BudlkpyPkk5IYJFjylU-1w"
);

async function test() {
  console.log("Fetching projects...");
  const { data: projects, error: projectsError } = await supabase.from("projects").select("*");
  console.log("Projects:", projects, "Error:", projectsError);
  
  if (projects && projects.length > 0) {
    const projectId = projects[0].id;
    console.log(`Fetching areas for project ${projectId}...`);
    const { data: areas, error: areasError } = await supabase.from("areas").select("*, groups(color)").eq("project_id", projectId);
    console.log("Areas:", areas, "Error:", areasError);
  }
}

test();
