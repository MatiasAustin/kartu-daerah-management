"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPublisher(projectId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("publishers").insert({
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
