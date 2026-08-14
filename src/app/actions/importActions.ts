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

  // Fetch all existing numbers to start slot filling
  const { data: areasData } = await supabase
    .from("areas")
    .select("area_number")
    .eq("project_id", projectId);

  const usedNumbers = new Set<number>();
  if (areasData) {
    areasData.forEach(a => {
      const match = a.area_number?.match(/\d+$/);
      if (match) usedNumbers.add(parseInt(match[0], 10));
    });
  }

  let colorIndex = 0;

  try {
    for (const group of parsedGroups) {
      
      // Calculate center of first valid feature for Reverse Geocoding
      let groupLocationName = "Imported Group";
      for (const feature of group.features) {
        let lng = null, lat = null;
        if (feature.geometry?.type === "Polygon") {
          const coords = feature.geometry.coordinates[0];
          if (coords && coords.length > 0) {
            let minX = 180, maxX = -180, minY = 90, maxY = -90;
            coords.forEach((coord: number[]) => {
              if (coord[0] < minX) minX = coord[0];
              if (coord[0] > maxX) maxX = coord[0];
              if (coord[1] < minY) minY = coord[1];
              if (coord[1] > maxY) maxY = coord[1];
            });
            lng = (minX + maxX) / 2; lat = (minY + maxY) / 2;
          }
        } else if (feature.geometry?.type === "Point") {
          lng = feature.geometry.coordinates[0]; lat = feature.geometry.coordinates[1];
        }

        if (lng && lat) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`, {
              headers: { 'User-Agent': 'KartuDaerahApp/1.0' }
            });
            if (res.ok) {
              const geoData = await res.json();
              if (geoData?.address) {
                groupLocationName = geoData.address.village || geoData.address.suburb || geoData.address.neighbourhood || geoData.address.town || geoData.address.city || "Unknown Area";
              }
            }
          } catch (e) {
            console.error("Geocoding failed", e);
          }
          break; // Only geocode the first valid feature to avoid rate limits
        }
      }

      // 1. Create a group for this folder
      const { data: createdGroup, error: groupError } = await supabase.from("groups").insert({
        project_id: projectId,
        name: groupLocationName,
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
        const name = `${groupLocationName} ${areaIndex}`;
        const description = feature.properties?.description || "";
        
        // Find next missing number
        let missingNumber = 1;
        while (usedNumbers.has(missingNumber)) {
          missingNumber++;
        }
        usedNumbers.add(missingNumber);
        
        const area_number = String(missingNumber).padStart(3, '0');

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
