import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteUserForm } from "./InviteUserForm";
import { ManagerRow } from "./ManagerRow";
import { PublisherManager } from "./PublisherManager";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch projects owned by the current user
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("owner_id", session.user.id);

  // Fetch groups owned by the current user's projects
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, project_id, projects!inner(owner_id)")
    .eq("projects.owner_id", session.user.id);

  // Fetch existing group managers
  const { data: managersData, error: managersError } = await supabase
    .from("group_managers")
    .select(`
      id,
      user_id,
      created_at,
      groups!inner(id, name, projects!inner(owner_id))
    `)
    .eq("groups.projects.owner_id", session.user.id)
    .order("created_at", { ascending: false });

  if (managersError) {
    console.error("Error fetching managers:", managersError);
  }

  let managers = [];
  if (managersData && managersData.length > 0) {
    const userIds = managersData.map((m: any) => m.user_id);
    
    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    // Fetch permissions
    const { data: permissions } = await supabase
      .from("group_permissions")
      .select("*")
      .in("user_id", userIds);

    managers = managersData.map((m: any) => ({
      ...m,
      profiles: profiles?.find((p: any) => p.id === m.user_id) || null,
      permissions: permissions?.find((p: any) => p.group_id === m.groups.id && p.user_id === m.user_id) || null
    }));
  }

  // Fetch Publishers (Field Workers)
  const projectIds = projects?.map(p => p.id) || [];
  let publishers = [];
  if (projectIds.length > 0) {
    const { data: pubData } = await supabase
      .from("publishers")
      .select("*, projects(name)")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });
    publishers = pubData || [];
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-2">Invite users and assign them as area managers.</p>
      </div>

      <InviteUserForm projects={projects || []} groups={groups || []} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Current Managers</h3>
        </div>
        
        {(!managers || managers.length === 0) ? (
          <div className="p-8 text-center text-slate-500">
            No managers have been assigned yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Group (Area)</th>
                  <th className="px-6 py-3">Assigned Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((manager: any) => (
                  <ManagerRow key={manager.id} manager={manager} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PublisherManager projects={projects || []} initialPublishers={publishers} />
    </div>
  );
}
