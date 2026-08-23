const fs = require('fs');

let code = fs.readFileSync('src/components/map/MapContainer.tsx', 'utf8');

// 1. Add tool state and refs
code = code.replace(
  '    const editModeRef = useRef<"move" | "add" | "delete">("move");',
  '    const editModeRef = useRef<"move" | "add" | "delete">("move");\n    const isBrushingRef = useRef(false);'
);

// 3. Replace mousemove magnet logic with the function call
code = code.replace(
  /if \(isMagnetModeRef\.current\) \{\s*const ptPx = e\.point;[\s\S]*?if \(closestPt\) snappedLngLat = closestPt;\s*\}/,
  'snappedLngLat = getSnappedLngLat(m, e);'
);

// 4. Add blob event listeners
const blobListeners = `
      // 🖌️ Blob tool: mousedown
      m.on("mousedown", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current !== "blob") return;
        isBrushingRef.current = true;
        m.dragPan.disable();
        
        const lngLat = getSnappedLngLat(m, e);
        const pts = penPointsRef.current;
        const newPts = [...pts, lngLat];
        penPointsRef.current = newPts;
        setPenPoints([...newPts]);
        drawPenCanvas();
      });

      // 🖌️ Blob tool: mousemove
      m.on("mousemove", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current !== "blob" || !isBrushingRef.current) return;
        
        const lngLat = getSnappedLngLat(m, e, 35); // slightly larger radius for brushing
        const pts = penPointsRef.current;
        
        // Only add point if it's far enough from the last point to avoid lag
        if (pts.length > 0) {
          const lastPt = pts[pts.length - 1];
          const lastPx = m.project(lastPt as any);
          const currPx = m.project(lngLat as any);
          if (Math.hypot(lastPx.x - currPx.x, lastPx.y - currPx.y) < 15) return;
        }
        
        const newPts = [...pts, lngLat];
        penPointsRef.current = newPts;
        setPenPoints([...newPts]);
        drawPenCanvas();
      });

      // 🖌️ Blob tool: mouseup
      m.on("mouseup", () => {
        if (toolModeRef.current !== "blob") return;
        isBrushingRef.current = false;
        m.dragPan.enable();
      });
`;

code = code.replace(
  '        // 🖌️ Pen tool: map click',
  blobListeners + '\n        // 🖌️ Pen tool: map click'
);

// 5. Add UI Buttons
const uiButtons = `
          {/* Blob Tool */}
          <button
            title="Brush Tool (Arsir) - Click and drag to draw continuously"
            onClick={() => setToolMode(toolMode === "blob" ? "select" : "blob")}
            className={\`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              \${toolMode === "blob" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}\`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>
            </svg>
          </button>
`;

code = code.replace(
  '{/* Pen */}',
  uiButtons + '\n          {/* Pen */}'
);

const editToolbar = `
        {/* EDIT TOOLBAR (Shown only when an area is selected) */}
        {selectedAreaId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden z-20">
            <button
              title="Move Vertex"
              onClick={() => setEditMode("move")}
              className={\`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 \${editMode === "move" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}\`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M9 19l3 3 3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
              Move
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              title="Add Vertex"
              onClick={() => setEditMode("add")}
              className={\`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 \${editMode === "add" ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}\`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              title="Delete Vertex"
              onClick={() => setEditMode("delete")}
              className={\`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 \${editMode === "delete" ? "bg-red-100 text-red-700" : "text-slate-600 hover:bg-slate-50"}\`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
              Delete
            </button>
          </div>
        )}
`;

code = code.replace(
  '{/* Status bar */}',
  editToolbar + '\n        {/* Status bar */}'
);

const statusBarText = `
            {toolMode === "blob" ? (
              <span className="font-medium text-slate-800">Blob Tool: Click and drag to brush an area.</span>
            ) : toolMode === "pen" ? (
`;
code = code.replace(
  '{toolMode === "pen" ? (',
  statusBarText
);

// 6. Hook up the edit modes to the actual maplibre events!
code = code.replace(
  `m.on("mouseenter", "edit-handles", () => { m.getCanvas().style.cursor = "grab"; });`,
  `m.on("mouseenter", "edit-handles", () => {
    if (editModeRef.current === "move") m.getCanvas().style.cursor = "grab";
    else if (editModeRef.current === "delete") m.getCanvas().style.cursor = "pointer";
  });`
);

code = code.replace(
  `m.on("mouseenter", "edit-ring", () => { m.getCanvas().style.cursor = "crosshair"; });`,
  `m.on("mouseenter", "edit-ring", () => {
    if (editModeRef.current === "add") m.getCanvas().style.cursor = "crosshair";
  });`
);

const updateEditLayerLogic = `
        const updateLayers = (geom: any) => {
          if (!geom || !m.getSource("edit-verts")) return;
          const coords = geom.coordinates[0] as [number, number][];
          const verts = coords.slice(0, -1);
          const features: any[] = [
            { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { type: "ring" } },
            ...verts.map((c, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: { index: i } })),
          ];
          (m.getSource("edit-verts") as MapLibreTypes.GeoJSONSource)?.setData({ type: "FeatureCollection", features } as any);
        };
`;

const deleteLogic = `
      m.on("click", "edit-handles", (e: any) => {
        if (editModeRef.current !== "delete") return;
        e.preventDefault();
        if (!e.features?.length || !editGeometryRef.current) return;
        
        const idx = e.features[0].properties.index as number;
        const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
        
        if (coords.length <= 4) {
          alert("A polygon must have at least 3 anchor points.");
          return;
        }
        
        coords.splice(idx, 1);
        coords[coords.length - 1] = coords[0]; // ensure ring closure
        
        editGeometryRef.current.coordinates = [coords];
${updateEditLayerLogic}
        updateLayers(editGeometryRef.current);
        onAreaUpdateRef.current(editingAreaIdRef.current!, {
          geometry: editGeometryRef.current,
          geojson: { type: "Polygon", coordinates: [coords] }
        });
      });
`;

code = code.replace(
  `m.on("mousedown", "edit-handles", (e: any) => {`,
  deleteLogic + `\n      m.on("mousedown", "edit-handles", (e: any) => {
        if (editModeRef.current !== "move") return;`
);

const addLogic = `
      m.on("click", "edit-ring", (e: any) => {
        if (editModeRef.current !== "add") return;
        if (!editGeometryRef.current) return;
        const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
        const clickLngLat = [e.lngLat.lng, e.lngLat.lat] as [number, number];
        
        let bestIdx = -1;
        let minDist = Infinity;
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = m.project(coords[i] as any);
          const p2 = m.project(coords[i+1] as any);
          const pt = e.point;
          
          // distance from point to segment
          const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
          let t = ((pt.x - p1.x) * (p2.x - p1.x) + (pt.y - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
          const dist = Math.hypot(pt.x - proj.x, pt.y - proj.y);
          
          if (dist < minDist) {
            minDist = dist;
            bestIdx = i + 1;
          }
        }
        
        if (bestIdx !== -1) {
          coords.splice(bestIdx, 0, clickLngLat);
          editGeometryRef.current.coordinates = [coords];
${updateEditLayerLogic}
          updateLayers(editGeometryRef.current);
          onAreaUpdateRef.current(editingAreaIdRef.current!, {
            geometry: editGeometryRef.current,
            geojson: { type: "Polygon", coordinates: [coords] }
          });
        }
      });
`;

code = code.replace(
  `        // 🖌️ Map move: redraw canvas pen`,
  addLogic + `\n        // 🖌️ Map move: redraw canvas pen`
);

fs.writeFileSync('src/components/map/MapContainer.tsx', code);
