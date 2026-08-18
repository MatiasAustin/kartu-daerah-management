"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignAreaToPublisher(areaId: string, publisherId: string | null, projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 1. Mark existing active assignment as inactive
  await supabase
    .from("area_assignments")
    .update({ is_active: false, unassigned_at: new Date().toISOString() })
    .eq("area_id", areaId)
    .eq("is_active", true);

  // 2. If assigning a new publisher, insert a new record
  if (publisherId) {
    const { error } = await supabase
      .from("area_assignments")
      .insert({
        area_id: areaId,
        publisher_id: publisherId,
        assigned_by: user.id,
      });

    if (error) {
      console.error("[assignArea] Supabase error:", error);
      return { error: error.message };
    }
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
