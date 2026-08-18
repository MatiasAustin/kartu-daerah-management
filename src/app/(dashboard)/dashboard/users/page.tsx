import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteUserForm } from "./InviteUserForm";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch groups owned by the current user's projects
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, projects!inner(owner_id)")
    .eq("projects.owner_id", session.user.id);

  // Fetch existing group managers
  const { data: managers } = await supabase
    .from("group_managers")
    .select(`
      id,
      user_id,
      created_at,
      groups!inner(id, name, projects!inner(owner_id)),
      profiles:user_id(email, full_name)
    `)
    .eq("groups.projects.owner_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-2">Invite users and assign them as area managers.</p>
      </div>

      <InviteUserForm groups={groups || []} />

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
                </tr>
              </thead>
              <tbody>
                {managers.map((manager: any) => (
                  <tr key={manager.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {manager.profiles?.email || manager.user_id}
                      {manager.profiles?.full_name && (
                        <div className="text-xs text-slate-500 font-normal">{manager.profiles.full_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {manager.groups?.name || 'Unknown Group'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(manager.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
