"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAvailableReferenceAreas(currentProjectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Fetch projects (where owner or manager)
  // For simplicity, just fetch all projects the user has access to
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name")
    .neq("id", currentProjectId);

  if (projectsError) return { error: projectsError.message };

  if (!projects || projects.length === 0) return { data: [] };

  const projectIds = projects.map(p => p.id);

  // Fetch areas for these projects
  const { data: areas, error: areasError } = await supabase
    .from("areas")
    .select("id, name, project_id")
    .in("project_id", projectIds);

  if (areasError) return { error: areasError.message };

  // Group by project
  const result = projects.map(p => ({
    ...p,
    areas: (areas || []).filter(a => a.project_id === p.id)
  })).filter(p => p.areas.length > 0);

  return { data: result };
}
