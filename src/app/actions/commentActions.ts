"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function getAreaComments(areaId: string) {
  const supabase = await createAdminClient();
  
  const { data, error } = await supabase
    .from("area_comments")
    .select("*, publishers(name)")
    .eq("area_id", areaId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return { error: error.message };
  }
  
  return { data };
}

export async function postAreaComment(areaId: string, publisherId: string | null, content: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("area_comments")
    .insert({
      area_id: areaId,
      publisher_id: publisherId,
      content,
    });

  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}
