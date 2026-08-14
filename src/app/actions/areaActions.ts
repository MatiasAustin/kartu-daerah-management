"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createArea(projectId: string, groupId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Expecting data.geometry to be a valid GeoJSON Polygon/MultiPolygon
  // We use PostGIS ST_GeomFromGeoJSON for insertion.
  const { data: created, error } = await supabase.from("areas").insert({
    project_id: projectId,
    group_id: groupId,
    area_number: data.area_number,
    name: data.name,
    description: data.description,
    geometry: data.geometry,
    center_lng: data.center_lng,
    center_lat: data.center_lat,
    created_by: user.id
  }).select("id, project_id, group_id, area_number, name, description, center_lng, center_lat, created_by, created_at").single();

  if (error) {
    console.error("Error creating area:", error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true, area: created };
}

export async function updateArea(areaId: string, projectId: string, data: any) {
  const supabase = await createClient();
  
  const updatePayload: any = {};
  if (data.name) updatePayload.name = data.name;
  if (data.area_number) updatePayload.area_number = data.area_number;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.geometry) updatePayload.geometry = data.geometry;
  if (data.center_lng) updatePayload.center_lng = data.center_lng;
  if (data.center_lat) updatePayload.center_lat = data.center_lat;

  const { error } = await supabase
    .from("areas")
    .update(updatePayload)
    .eq("id", areaId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

export async function deleteArea(areaId: string, projectId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("areas")
    .delete()
    .eq("id", areaId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
