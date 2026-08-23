const fs = require('fs');

let code = fs.readFileSync('src/components/map/MapContainer.tsx', 'utf8');

// 1. Add magnetLogic BEFORE drawPenCanvas
const magnetLogic = `
  const getSnappedLngLat = (m: any, e: any, radius = 25): [number, number] => {
    let snappedLngLat = [e.lngLat.lng, e.lngLat.lat] as [number, number];
    if (!isMagnetModeRef.current) return snappedLngLat;
    
    const ptPx = e.point;
    const features = m.queryRenderedFeatures(
      [[ptPx.x - radius, ptPx.y - radius], [ptPx.x + radius, ptPx.y + radius]]
    );
    
    let closestDist = Infinity;
    let closestPt: [number, number] | null = null;
    
    for (const f of features) {
      if (f.layer.id.includes("edit") || f.layer.id.includes("areas") || f.layer.id.includes("ref")) continue;
      
      if (f.geometry?.type === "LineString" || f.geometry?.type === "MultiLineString" || f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon") {
        const coords = (f.geometry.type === "LineString") 
          ? f.geometry.coordinates 
          : (f.geometry.type === "Polygon" || f.geometry.type === "MultiLineString")
          ? f.geometry.coordinates.flat(1)
          : f.geometry.coordinates.flat(2);
          
        for (const c of coords) {
           if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number') {
             const cPx = m.project(c as [number, number]);
             const dist = Math.hypot(cPx.x - ptPx.x, cPx.y - ptPx.y);
             if (dist < closestDist && dist <= radius) {
                closestDist = dist;
                closestPt = c as [number, number];
             }
           }
        }
      }
    }
    return closestPt || snappedLngLat;
  };
`;

code = code.replace(
  '  const drawPenCanvas = useCallback(() => {',
  magnetLogic + '\n  const drawPenCanvas = useCallback(() => {'
);

fs.writeFileSync('src/components/map/MapContainer.tsx', code);
