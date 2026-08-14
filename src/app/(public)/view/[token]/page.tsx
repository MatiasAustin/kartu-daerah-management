import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MapContainer } from "@/components/map/MapContainer";

export default async function PublicViewPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();

  // Validate Token
  const { data: share } = await supabase
    .from("public_shares")
    .select("project_id, group_id, projects(name, description)")
    .eq("token", params.token)
    .eq("is_active", true)
    .single();

  if (!share) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Map Not Found</h1>
          <p className="text-slate-500">This map is no longer available or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Fetch Areas (Filtered if group_id is set)
  let areaQuery = supabase.from("areas").select("*, groups(name, color)").eq("project_id", share.project_id);
  if (share.group_id) {
    areaQuery = areaQuery.eq("group_id", share.group_id);
  }
  const { data: areas } = await areaQuery;

  // Fetch Groups
  let groupQuery = supabase.from("groups").select("*").eq("project_id", share.project_id);
  if (share.group_id) {
    groupQuery = groupQuery.eq("id", share.group_id);
  }
  const { data: groups } = await groupQuery;

  const projectName = (share.projects as any)?.name || "Project Map";

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Public Header */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center px-6 justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-slate-900">{projectName}</h1>
          {share.group_id && (
            <>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 font-medium">{groups?.[0]?.name}</span>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        {/* Simple Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Areas</h2>
            <p className="text-xs text-slate-500">Click an area on the map or select from the list below to view details.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {areas?.map((area) => (
              <div key={area.id} className="p-2 hover:bg-slate-50 rounded-md cursor-pointer border border-transparent transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (area.groups as any)?.color || "#ccc" }} />
                  <span className="font-medium text-sm text-slate-700">{area.area_number}</span>
                  <span className="text-sm text-slate-600 truncate">{area.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
           {/* Note: We reuse MapContainer, but we probably want to disable drawing for public views. 
               We'd need to pass a readOnly flag to MapContainer in a real app, but for now, 
               just not passing onAreaCreate effectively ignores draw events. */}
          <MapContainer areas={areas || []} />
        </div>
      </div>
    </div>
  );
}
