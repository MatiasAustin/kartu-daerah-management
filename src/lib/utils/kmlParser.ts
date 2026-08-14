import { kml } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";

export interface ParsedGroup {
  name: string;
  features: any[];
}

export function parseKML(kmlString: string): ParsedGroup[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(kmlString, "text/xml");
  const geojson = kml(xml);

  // KML parsing with togeojson maps KML folders to geojson features by preserving the structure in properties.
  // We can group features by their `folder` property, or just default to a "Default Import" group.

  const groupsMap: Record<string, any[]> = {};
  
  if (geojson && geojson.features) {
    geojson.features.forEach((feature) => {
      const folderName = feature.properties?.folder || "Imported Area";
      if (!groupsMap[folderName]) {
        groupsMap[folderName] = [];
      }
      groupsMap[folderName].push(feature);
    });
  }

  return Object.keys(groupsMap).map((name) => ({
    name,
    features: groupsMap[name],
  }));
}
