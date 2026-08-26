const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapContainer.tsx', 'utf8');

const oldCodeRegex = /m\.on\("mousedown", "edit-handles", \(e: any\) => \{[\s\S]*?m\.on\("mouseup", onUp\);\s*\}\);/;

const newCode = `      const onVertexDown = (e: any) => {
        if (editModeRef.current !== "move") return;
        e.preventDefault();
        if (!e.features?.length) return;
        const idx = e.features[0].properties.index as number;
        draggingVertexRef.current = idx;
        m.getCanvas().style.cursor = "grabbing";
        m.dragPan.disable();

        const onMove = (mv: any) => {
          if (draggingVertexRef.current === null || !editGeometryRef.current) return;
          const lngLat = mv.lngLat;
          if (!lngLat) return;
          const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
          coords[draggingVertexRef.current] = [lngLat.lng, lngLat.lat];
          if (draggingVertexRef.current === 0) coords[coords.length - 1] = [lngLat.lng, lngLat.lat];
          const newGeom = { ...editGeometryRef.current, coordinates: [coords] };
          editGeometryRef.current = newGeom;
          (m.getSource("edit-verts") as MapLibreTypes.GeoJSONSource)?.setData({
            type: "FeatureCollection",
            features: [
              { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { type: "ring" } },
              ...coords.slice(0, -1).map((c: [number, number], i: number) => ({
                type: "Feature", geometry: { type: "Point", coordinates: c }, properties: { index: i },
              })),
            ],
          } as any);
        };

        const onUp = () => {
          m.off("mousemove", onMove);
          m.off("touchmove", onMove);
          m.off("mouseup", onUp);
          m.off("touchend", onUp);
          m.getCanvas().style.cursor = "grab";
          draggingVertexRef.current = null;
          m.dragPan.enable();
        };

        m.on("mousemove", onMove);
        m.on("touchmove", onMove);
        m.on("mouseup", onUp);
        m.on("touchend", onUp);
      };

      m.on("mousedown", "edit-handles", onVertexDown);
      m.on("touchstart", "edit-handles", onVertexDown);`;

if (oldCodeRegex.test(code)) {
    code = code.replace(oldCodeRegex, newCode);
    console.log("Regex replaced successfully.");
} else {
    console.log("Regex not found.");
}

code = code.replace(/useState\(0\.3\)/g, 'useState(0)');
code = code.replace(/useRef\(0\.3\)/g, 'useRef(0)');

fs.writeFileSync('src/components/map/MapContainer.tsx', code);
