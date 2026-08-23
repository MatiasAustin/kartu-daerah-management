import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteUserForm } from "./InviteUserForm";
import { ManagerRow } from "./ManagerRow";
import { PublisherManager } from "./PublisherManager";

import { AdminManager } from "./AdminManager";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch projects owned by the current user
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("owner_id", session.user.id);

  const ownedProjectIds = ownedProjects?.map(p => p.id) || [];

  // Fetch projects where user is a co-owner/admin
  const { data: adminProjectsResult } = await supabase
    .from("project_admins")
    .select("projects(id, name)")
    .eq("user_id", session.user.id);

  const adminProjectsArray = adminProjectsResult?.map((p: any) => p.projects).filter(Boolean) || [];
  
  // Combine unique projects for Admin access
  const allAdminProjects = [...(ownedProjects || []), ...adminProjectsArray];
  const uniqueAdminProjectsMap = new Map(allAdminProjects.map(p => [p.id, p]));
  const adminProjects = Array.from(uniqueAdminProjectsMap.values());
  const adminProjectIds = adminProjects.map(p => p.id);

  // Fetch current admins for ALL admin projects
  const { data: adminsData } = adminProjectIds.length > 0 ? await supabase
    .from("project_admins")
    .select("id, project_id, user_id, projects(name)")
    .in("project_id", adminProjectIds) : { data: [] };
    
  let admins = adminsData || [];
  if (admins.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", admins.map(a => a.user_id));
    admins = admins.map(a => ({
      ...a,
      profiles: profiles?.find(p => p.id === a.user_id) || null
    }));
  }

/* moved */

  // Fetch projects where user is just an area manager
  const { data: managedGroupsResult } = await supabase
    .from("group_managers")
    .select("groups!inner(projects!inner(id, name))")
    .eq("user_id", session.user.id);

/* moved */
  const managerProjectsArray = managedGroupsResult?.map((g: any) => g.groups?.projects).filter(Boolean) || [];
  
/* moved */

  // Combine unique projects for Manager (View only) access
  const uniqueManagerProjectsMap = new Map(managerProjectsArray.map((p: any) => [p.id, p]));
  const managerProjects = Array.from(uniqueManagerProjectsMap.values());
  const managerProjectIds = managerProjects.map((p: any) => p.id).filter((id: string) => !adminProjectIds.includes(id));

  const allVisibleProjectIds = [...adminProjectIds, ...managerProjectIds];

  // Fetch groups for admin projects (used for inviting)
  const { data: adminGroups } = adminProjectIds.length > 0 ? await supabase
    .from("groups")
    .select("id, name, project_id, projects!inner(owner_id)")
    .in("project_id", adminProjectIds) : { data: [] };

  // Fetch existing group managers for all visible projects
  const { data: managersData, error: managersError } = allVisibleProjectIds.length > 0 ? await supabase
    .from("group_managers")
    .select(`
      id,
      user_id,
      created_at,
      groups!inner(id, name, project_id, projects!inner(owner_id, id))
    `)
    .in("groups.project_id", allVisibleProjectIds)
    .order("created_at", { ascending: false }) : { data: [], error: null };

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
      permissions: permissions?.find((p: any) => p.group_id === m.groups.id && p.user_id === m.user_id) || null,
      canEdit: adminProjectIds.includes(m.groups.projects.id)
    }));
  }

  // Fetch Publishers (Field Workers) ONLY for Admin projects
  let publishers: any[] = [];
  let areas: any[] = [];
  let activeAssignments: any[] = [];

  if (adminProjectIds.length > 0) {
    const { data: pubData } = await supabase
      .from("publishers")
      .select("*, projects(name)")
      .in("project_id", adminProjectIds)
      .order("created_at", { ascending: false });
    publishers = pubData || [];

    const { data: areaData } = await supabase
      .from("areas")
      .select("id, name, area_number, group_id, project_id")
      .in("project_id", adminProjectIds);
    areas = areaData || [];

    if (areas.length > 0) {
      const { data: assignmentData } = await supabase
        .from("area_assignments")
        .select("*")
        .eq("is_active", true)
        .in("area_id", areas.map(a => a.id));
      activeAssignments = assignmentData || [];
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-2">Invite users and assign them as area managers.</p>
      </div>

      {(ownedProjects && ownedProjects.length > 0) && (
        <AdminManager projects={ownedProjects} admins={admins} />
      )}

      {adminProjects.length > 0 && (
        <InviteUserForm projects={adminProjects} groups={adminGroups || []} />
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
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
                  <ManagerRow key={manager.id} manager={manager} canEdit={manager.canEdit} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adminProjects.length > 0 && (
        <PublisherManager 
          projects={adminProjects} 
          initialPublishers={publishers}
          initialAreas={areas}
          initialGroups={adminGroups || []}
          initialAssignments={activeAssignments}
        />
      )}
    </div>
  );
}
