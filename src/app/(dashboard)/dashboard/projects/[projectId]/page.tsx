import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/dashboard/ProjectWorkspace";
import { redirect } from "next/navigation";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch Project details
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/dashboard/projects");
  }

  // Fetch Groups
  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  // Fetch Areas using RPC to get geometry as proper GeoJSON
  // PostgREST returns PostGIS geometry as EWKB hex by default.
  // We call an RPC that uses ST_AsGeoJSON to return proper GeoJSON.
  let areas: any[] = [];
  const { data: rpcAreas, error: rpcError } = await supabase
    .rpc("get_areas_for_project", { p_project_id: projectId });

  if (!rpcError && rpcAreas) {
    // RPC succeeded — attach group color from groups array
    areas = rpcAreas.map((a: any) => ({
      ...a,
      groups: { color: a.group_color || "#ef4444" },
    }));
    console.log("[ServerDebug] Areas via RPC:", areas.length, "first geojson:", areas[0]?.geojson?.substring?.(0, 80));
  } else {
    // RPC not available yet — fallback to regular query
    console.log("[ServerDebug] RPC failed:", rpcError?.message, "— using fallback query");
    const { data: fallbackAreas, error: areasError } = await supabase
      .from("areas")
      .select("*, groups(color)")
      .eq("project_id", projectId);
    areas = fallbackAreas || [];
    if (areas.length > 0) {
      const first = areas[0];
      console.log("[ServerDebug] First area:", first.name);
      console.log("[ServerDebug] geometry type:", typeof first.geometry);
      console.log("[ServerDebug] geometry value:", JSON.stringify(first.geometry)?.substring(0, 200));
    } else {
      console.log("[ServerDebug] No areas. areasError:", areasError);
    }
  }

  return (
    <div className="flex h-full w-full">
      <ProjectWorkspace project={project} initialGroups={groups || []} initialAreas={areas || []} />
    </div>
  );
}
