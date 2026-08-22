"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPublisher(projectId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify ownership or admin
  const { data: project } = await supabase.from("projects").select("owner_id").eq("id", projectId).single();
  
  if (project?.owner_id !== user.id) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { data: adminCheck } = await adminClient.from("project_admins").select("id").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
    if (!adminCheck) {
      return { error: "Unauthorized" };
    }
  }

  // Use admin client to bypass RLS for inserts if needed, but if RLS allows admins, normal client is fine.
  // Since we don't know if RLS allows it perfectly yet (user needs to run the SQL), let's use adminClient to be safe
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  
  const { error } = await adminClient.from("publishers").insert({
    project_id: projectId,
    name: data.name,
    contact_info: data.contact_info || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}/publishers`);
  revalidatePath(`/dashboard/users`);
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function updatePublisher(publisherId: string, projectId: string, data: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("publishers")
    .update({
      name: data.name,
      contact_info: data.contact_info || null,
    })
    .eq("id", publisherId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}/publishers`);
  revalidatePath(`/dashboard/users`);
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function deletePublisher(publisherId: string, projectId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("publishers")
    .delete()
    .eq("id", publisherId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}/publishers`);
  revalidatePath(`/dashboard/users`);
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
