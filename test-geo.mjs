import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://edczgncvurbazmjcgmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3pnbmN2dXJiYXptamNnbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTg5NDIsImV4cCI6MjEwMjI3NDk0Mn0.IWlPjfMbOOC-Xmj35ISn5BudlkpyPkk5IYJFjylU-1w'
);

function ewkbHexToGeoJSON(hex) {
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    const byteOrder = view.getUint8(offset++);
    const le = byteOrder === 1;
    const readUint32 = () => { const v = view.getUint32(offset, le); offset += 4; return v; };
    const readFloat64 = () => { const v = view.getFloat64(offset, le); offset += 8; return v; };
    let wkbType = readUint32();
    const hasZ = (wkbType & 0x80000000) !== 0;
    const hasM = (wkbType & 0x40000000) !== 0;
    const hasSRID = (wkbType & 0x20000000) !== 0;
    wkbType = wkbType & 0x0fffffff;
    if (hasSRID) readUint32();
    const readPoint = () => {
      const x = readFloat64(); const y = readFloat64();
      if (hasZ) readFloat64(); if (hasM) readFloat64();
      return [x, y];
    };
    const readRing = () => {
      const count = readUint32(); const pts = [];
      for (let i = 0; i < count; i++) pts.push(readPoint());
      return pts;
    };
    if (wkbType === 1) return { type: "Point", coordinates: readPoint() };
    else if (wkbType === 2) {
      const count = readUint32(); const pts = [];
      for (let i = 0; i < count; i++) pts.push(readPoint());
      return { type: "LineString", coordinates: pts };
    } else if (wkbType === 3) {
      const numRings = readUint32(); const rings = [];
      for (let i = 0; i < numRings; i++) rings.push(readRing());
      return { type: "Polygon", coordinates: rings };
    } else if (wkbType === 6) {
      const numGeoms = readUint32(); const polys = [];
      for (let i = 0; i < numGeoms; i++) {
        offset++; let subType = readUint32();
        if ((subType & 0x20000000) !== 0) readUint32();
        subType = subType & 0x0fffffff;
        const numRings = readUint32(); const rings = [];
        for (let j = 0; j < numRings; j++) rings.push(readRing());
        polys.push(rings);
      }
      return { type: "MultiPolygon", coordinates: polys };
    }
    return null;
  } catch(e) { 
    console.error(e);
    return null; 
  }
}

function resolveGeometry(area) {
  let geo = area.geojson ?? area.geometry;
  if (!geo) return null;
  if (typeof geo === "object" && geo !== null && geo.type) {
    if (geo.crs) { const { crs, ...rest } = geo; return rest; }
    return geo;
  }
  if (typeof geo === "string" && geo.trimStart().startsWith("{")) {
    try { 
      const parsed = JSON.parse(geo); 
      if (parsed.crs) { const { crs, ...rest } = parsed; return rest; }
      return parsed;
    } catch { return null; }
  }
  if (typeof geo === "string" && /^[0-9a-fA-F]+$/.test(geo)) return ewkbHexToGeoJSON(geo);
  return null;
}

async function main() {
  const { data, error } = await supabase.from('areas').select('*').limit(1);
  if (error) {
    console.error("Error fetching area:", error);
    return;
  }
  if (!data || data.length === 0) {
    console.log("No areas found");
    return;
  }
  const area = data[0];
  console.log("Area Name:", area.name);
  console.log("Geometry Type:", typeof area.geometry);
  const geo = resolveGeometry(area);
  console.log("Resolved Geometry:", JSON.stringify(geo).substring(0, 200));
}

main();
