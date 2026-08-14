import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PublicWorkspace } from "@/components/public/PublicWorkspace";

export default async function PublicViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Validate Token
  const { data: share } = await supabase
    .from("public_shares")
    .select("project_id, group_id, projects(name, description)")
    .eq("token", token)
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
    <div className="flex flex-col h-[100dvh] w-full bg-white">
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
        <PublicWorkspace 
          project={share.projects} 
          groups={groups || []} 
          areas={areas || []} 
          isGroupShare={!!share.group_id} 
        />
      </div>
    </div>
  );
}
