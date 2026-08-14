"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createArea(
  projectId: string,
  groupId: string,
  data: any
): Promise<{ error: string } | { success: true; area: Record<string, any> | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // 1. Resolve Location Name (Reverse Geocoding)
  let resolvedName = data.name;
  if (!resolvedName && data.center_lng && data.center_lat) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${data.center_lat}&lon=${data.center_lng}&format=jsonv2`, {
        headers: { 'User-Agent': 'KartuDaerahApp/1.0' }
      });
      if (res.ok) {
        const geoData = await res.json();
        if (geoData?.address) {
          resolvedName = geoData.address.village || geoData.address.suburb || geoData.address.neighbourhood || geoData.address.town || geoData.address.city || "Unknown Area";
        }
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
  }
  if (!resolvedName) resolvedName = "New Area";

  // 2. Resolve Unique Name
  const { data: existingNames } = await supabase
    .from("areas")
    .select("name")
    .eq("project_id", projectId)
    .ilike("name", `${resolvedName}%`);

  if (existingNames && existingNames.length > 0) {
    const nameSet = new Set(existingNames.map(d => d.name));
    if (nameSet.has(resolvedName)) {
      let counter = 1;
      while (nameSet.has(`${resolvedName} ${counter}`)) counter++;
      resolvedName = `${resolvedName} ${counter}`;
    }
  }

  // 3. Auto-Numbering (Slot Recycling)
  let areaNumber = data.area_number;
  if (!areaNumber) {
    const { data: areasData } = await supabase
      .from("areas")
      .select("area_number")
      .eq("project_id", projectId);
      
    let missingNumber = 1;
    if (areasData) {
      const existingNums = areasData
        .map(a => {
          const match = a.area_number?.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => n > 0)
        .sort((a, b) => a - b);

      for (const num of existingNums) {
        if (num === missingNumber) missingNumber++;
        else if (num > missingNumber) break;
      }
    }
    areaNumber = String(missingNumber).padStart(3, '0');
  }

  // Expecting data.geometry to be a valid GeoJSON Polygon/MultiPolygon
  // We use PostGIS ST_GeomFromGeoJSON for insertion.
  const { data: created, error } = await supabase.from("areas").insert({
    project_id: projectId,
    group_id: groupId,
    area_number: areaNumber,
    name: resolvedName,
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
  if (data.group_id) updatePayload.group_id = data.group_id;

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
