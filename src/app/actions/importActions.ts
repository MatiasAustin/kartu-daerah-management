"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Array of vibrant colors for new groups
const GROUP_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"];

export async function importKMLData(projectId: string, parsedGroups: { name: string; features: any[] }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let colorIndex = 0;

  try {
    for (const group of parsedGroups) {
      // 1. Create a group for this folder
      const { data: createdGroup, error: groupError } = await supabase.from("groups").insert({
        project_id: projectId,
        name: group.name,
        description: "Imported from KML",
        color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
      }).select().single();

      if (groupError) {
        console.error("Error creating group from KML:", groupError);
        continue; // Skip if group fails
      }

      colorIndex++;

      // 2. Insert areas
      let areaIndex = 1;
      for (const feature of group.features) {
        const name = feature.properties?.name || `Imported Area ${areaIndex}`;
        const description = feature.properties?.description || "";
        // Basic area number generation
        const area_number = `IMP-${String(areaIndex).padStart(3, '0')}`;

        // Calculate a rough center for the area if it's a polygon (or point)
        let center_lng = null;
        let center_lat = null;

        if (feature.geometry?.type === "Polygon") {
          const coords = feature.geometry.coordinates[0];
          if (coords && coords.length > 0) {
            // simple bounding box center
            let minX = 180, maxX = -180, minY = 90, maxY = -90;
            coords.forEach((coord: number[]) => {
              if (coord[0] < minX) minX = coord[0];
              if (coord[0] > maxX) maxX = coord[0];
              if (coord[1] < minY) minY = coord[1];
              if (coord[1] > maxY) maxY = coord[1];
            });
            center_lng = (minX + maxX) / 2;
            center_lat = (minY + maxY) / 2;
          }
        } else if (feature.geometry?.type === "Point") {
          center_lng = feature.geometry.coordinates[0];
          center_lat = feature.geometry.coordinates[1];
        }

        const { error: areaError } = await supabase.from("areas").insert({
          project_id: projectId,
          group_id: createdGroup.id,
          area_number,
          name,
          description,
          geometry: feature.geometry,
          center_lng,
          center_lat,
          created_by: user.id
        });

        if (areaError) {
          console.error("Error inserting area from KML:", areaError);
        }

        areaIndex++;
      }
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error during KML import:", error);
    return { error: error.message || "Failed to import KML" };
  }
}
