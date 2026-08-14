import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Plus, Globe } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NewProjectButton } from "@/components/dashboard/NewProjectButton";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch projects owned by user OR projects they have access to via groups
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // For Area Managers, they'll see projects where they manage a group.
  const { data: managedGroups } = await supabase
    .from("group_managers")
    .select("group_id, groups(project_id)")
    .eq("user_id", user.id);

  // Extract unique project IDs for managed groups
  const managerProjectIds = Array.from(new Set(
    (managedGroups || []).map(mg => (mg.groups as any)?.project_id).filter(Boolean)
  ));

  let managerProjects: any[] = [];
  if (managerProjectIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .in("id", managerProjectIds)
      .order("created_at", { ascending: false });
    managerProjects = data || [];
  }

  // Deduplicate
  const allProjectIds = new Set(ownedProjects?.map(p => p.id) || []);
  const projects = [...(ownedProjects || [])];
  
  for (const mp of managerProjects) {
    if (!allProjectIds.has(mp.id)) {
      projects.push(mp);
      allProjectIds.add(mp.id);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="text-slate-500">Manage your geographic projects and maps.</p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
            <FolderKanban className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No projects yet</h3>
          <p className="text-slate-500 max-w-sm text-center mb-4">
            Get started by creating a project to organize your areas and groups.
          </p>
          <NewProjectButton variant="empty_state" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:border-slate-400 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-indigo-500" />
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-500 mt-4">
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      {project.is_public ? "Public" : "Private"}
                    </div>
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
