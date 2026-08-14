"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGroup(projectId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("groups").insert({
    project_id: projectId,
    name: data.name,
    description: data.description,
    color: data.color || "#ef4444",
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function updateGroup(groupId: string, projectId: string, data: any) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("groups")
    .update({
      name: data.name,
      description: data.description,
      color: data.color,
    })
    .eq("id", groupId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function deleteGroup(groupId: string, projectId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

// Manager assignment actions
export async function addGroupManager(groupId: string, email: string, projectId: string) {
  const supabase = await createClient();

  // Find user by email from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError || !profile) {
    return { error: "User with this email not found." };
  }

  // Add to group_managers
  const { error: managerError } = await supabase.from("group_managers").insert({
    group_id: groupId,
    user_id: profile.id,
  });

  if (managerError) {
    // Usually code 23505 is unique violation
    if (managerError.code === "23505") return { error: "User is already a manager of this group." };
    return { error: managerError.message };
  }

  // Give default permissions
  await supabase.from("group_permissions").insert({
    group_id: groupId,
    user_id: profile.id,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true,
    can_manage_group: false,
    can_share: false,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function removeGroupManager(groupId: string, userId: string, projectId: string) {
  const supabase = await createClient();
  
  // RLS cascading or manual deletion
  await supabase.from("group_permissions").delete().eq("group_id", groupId).eq("user_id", userId);
  const { error } = await supabase.from("group_managers").delete().eq("group_id", groupId).eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
