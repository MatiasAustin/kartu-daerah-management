"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function getShareToken(projectId: string, groupId?: string | null) {
  const supabase = await createClient();

  let query = supabase.from("public_shares")
    .select("token, is_active")
    .eq("project_id", projectId);

  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null);
  }

  const { data, error } = await query.single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned, which is fine
    return { error: error.message };
  }

  return { share: data };
}

export async function toggleShare(projectId: string, isActive: boolean, groupId?: string | null) {
  const supabase = await createClient();

  // Check if it exists
  const { share } = await getShareToken(projectId, groupId);

  if (share) {
    // Update existing
    let query = supabase.from("public_shares")
      .update({ is_active: isActive })
      .eq("project_id", projectId);
      
    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      query = query.is("group_id", null);
    }

    const { error } = await query;
    if (error) return { error: error.message };

  } else if (isActive) {
    // Create new token
    const token = generateToken();
    const { error } = await supabase.from("public_shares").insert({
      project_id: projectId,
      group_id: groupId || null,
      token: token,
      is_active: true
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
