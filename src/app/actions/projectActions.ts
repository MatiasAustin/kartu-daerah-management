"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) return { error: "Project name is required" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Generate a simple unique slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  const slug = `${baseSlug}-${uniqueSuffix}`;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      description,
      slug,
      owner_id: user.id,
      is_public: false
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/projects");
  return { success: true, project: data };
}
