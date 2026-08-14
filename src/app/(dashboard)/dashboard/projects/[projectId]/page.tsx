import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/dashboard/ProjectWorkspace";
import { redirect } from "next/navigation";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch Project details
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.projectId)
    .single();

  if (!project) {
    redirect("/dashboard/projects");
  }

  // Fetch Groups
  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .eq("project_id", params.projectId)
    .order("sort_order", { ascending: true });

  // Fetch Areas
  // PostGIS geometry is returned as GeoJSON directly if queried right, 
  // but by default Supabase PostGIS returns EWKB unless we use st_asgeojson.
  // Wait, Supabase returns GeoJSON automatically for geometry columns in PostgREST!
  const { data: areas } = await supabase
    .from("areas")
    .select("*, groups(color)")
    .eq("project_id", params.projectId);

  return (
    <div className="flex h-full w-full">
      <ProjectWorkspace project={project} initialGroups={groups || []} initialAreas={areas || []} />
    </div>
  );
}
