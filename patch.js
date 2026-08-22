const fs = require('fs');
let code = fs.readFileSync('src/components/map/MapContainer.tsx', 'utf8');

// 1. ToolMode
code = code.replace('type ToolMode = "select" | "pen";', 'type ToolMode = "select" | "pen" | "blob";');

// 2. Refs and States
code = code.replace(
  'const mousePosRef = useRef<[number, number] | null>(null);',
  'const mousePosRef = useRef<[number, number] | null>(null);\n  const isBrushingRef = useRef(false);'
);
code = code.replace(
  'const draggingVertexRef = useRef<number | null>(null);',
  'const draggingVertexRef = useRef<number | null>(null);\n  const [editMode, setEditMode] = useState<"move" | "add" | "delete">("move");\n  const editModeRef = useRef<"move" | "add" | "delete">("move");'
);
code = code.replace(
  'useEffect(() => { isMagnetModeRef.current = isMagnetMode; }, [isMagnetMode]);',
  'useEffect(() => { isMagnetModeRef.current = isMagnetMode; }, [isMagnetMode]);\n  useEffect(() => { editModeRef.current = editMode; }, [editMode]);'
);

// 3. Mouse events for blob tool
const oldMouseMove = `      // ── Pen tool: mousemove ───────────────────────────────────────────
      m.on("mousemove", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current !== "pen") return;`;

const newMouseMove = `      // ── Blob (Brush) tool events ──────────────────────────────────────
      m.on("mousedown", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current === "blob") {
          isBrushingRef.current = true;
          m.dragPan.disable(); // prevent panning while drawing
          const lngLat: [number, number] = mousePosRef.current || [e.lngLat.lng, e.lngLat.lat];
          const newPts: [number, number][] = [...penPointsRef.current, lngLat];
          penPointsRef.current = newPts;
          setPenPoints(newPts);
          drawPenCanvas();
        }
      });

      m.on("mouseup", () => {
        if (toolModeRef.current === "blob") {
          isBrushingRef.current = false;
          m.dragPan.enable();
        }
      });

      // ── Pen tool: mousemove ───────────────────────────────────────────
      m.on("mousemove", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current !== "pen" && toolModeRef.current !== "blob") return;`;
code = code.replace(oldMouseMove, newMouseMove);

const appendToMouseMove = `        mousePosRef.current = snappedLngLat;
        const pts = penPointsRef.current;

        if (pts.length >= 3) {`;
const newAppendToMouseMove = `        mousePosRef.current = snappedLngLat;
        const pts = penPointsRef.current;

        if (isBrushingRef.current && toolModeRef.current === "blob") {
          // Calculate distance from last point to avoid adding too many points
          const lastPt = pts[pts.length - 1];
          if (lastPt) {
            const p1 = m.project(lastPt);
            const p2 = m.project(snappedLngLat);
            if (Math.hypot(p1.x - p2.x, p1.y - p2.y) > 10) { // only add point if moved 10 pixels
              const newPts: [number, number][] = [...pts, snappedLngLat];
              penPointsRef.current = newPts;
              setPenPoints(newPts);
            }
          }
        }

        if (pts.length >= 3) {`;
code = code.replace(appendToMouseMove, newAppendToMouseMove);

// 4. Update Edit Vertices Events
const oldEditEvents = `      // ── Vertex drag ───────────────────────────────────────────────────
      m.on("mouseenter", "edit-handles", () => { m.getCanvas().style.cursor = "grab"; });
      m.on("mouseleave", "edit-handles", () => { m.getCanvas().style.cursor = ""; });

      m.on("contextmenu", "edit-handles", (e: any) => {
        e.preventDefault();
        if (!e.features?.length || !editGeometryRef.current) return;
        const idx = e.features[0].properties.index as number;
        const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
        
        if (coords.length <= 4) {
          alert("A polygon must have at least 3 anchor points.");
          return;
        }
        
        coords.splice(idx, 1);
        if (idx === 0) coords[coords.length - 1] = coords[0];
        
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
      });

      m.on("click", "edit-ring", (e: any) => {
        e.originalEvent.stopPropagation();
        if (!editGeometryRef.current) return;
        const pt = [e.lngLat.lng, e.lngLat.lat] as [number, number];
        const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
        
        let closestIdx = 0;
        let minDist = Infinity;
        const ptPx = m.project(pt);
        
        const distToSegmentSq = (p: {x:number, y:number}, v: {x:number, y:number}, w: {x:number, y:number}) => {
          const l2 = (w.x - v.x)**2 + (w.y - v.y)**2;
          if (l2 === 0) return (p.x - v.x)**2 + (p.y - v.y)**2;
          let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          return (p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2;
        };

        for (let i = 0; i < coords.length - 1; i++) {
          const v = m.project(coords[i]);
          const w = m.project(coords[i+1]);
          const d = distToSegmentSq(ptPx, v, w);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }
        
        coords.splice(closestIdx + 1, 0, pt);
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
      });

      m.on("mousedown", "edit-handles", (e: any) => {
        e.preventDefault();`;

const newEditEvents = `      // ── Vertex drag ───────────────────────────────────────────────────
      m.on("mouseenter", "edit-handles", () => {
        if (editModeRef.current === "move") m.getCanvas().style.cursor = "grab";
        else if (editModeRef.current === "delete") m.getCanvas().style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22red%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><line x1=%225%22 y1=%2212%22 x2=%2219%22 y2=%2212%22></line></svg>') 12 12, pointer";
      });
      m.on("mouseleave", "edit-handles", () => { m.getCanvas().style.cursor = ""; });

      const deleteVertex = (e: any) => {
        if (editModeRef.current !== "delete" && e.type !== "contextmenu") return;
        e.preventDefault();
        if (!e.features?.length || !editGeometryRef.current) return;
        const idx = e.features[0].properties.index as number;
        const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
        
        if (coords.length <= 4) {
          alert("A polygon must have at least 3 anchor points.");
          return;
        }
        
        coords.splice(idx, 1);
        if (idx === 0) coords[coords.length - 1] = coords[0];
        
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

      m.on("click", "edit-handles", (e: any) => deleteVertex(e));
      m.on("contextmenu", "edit-handles", (e: any) => deleteVertex(e));

      m.on("mouseenter", "edit-ring", () => {
        if (editModeRef.current === "add") m.getCanvas().style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22green%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><line x1=%2212%22 y1=%225%22 x2=%2212%22 y2=%2219%22></line><line x1=%225%22 y1=%2212%22 x2=%2219%22 y2=%2212%22></line></svg>') 12 12, crosshair";
      });
      m.on("mouseleave", "edit-ring", () => { m.getCanvas().style.cursor = ""; });

      m.on("click", "edit-ring", (e: any) => {
        e.originalEvent.stopPropagation();
        if (editModeRef.current !== "add") return;
        if (!editGeometryRef.current) return;
        const pt = [e.lngLat.lng, e.lngLat.lat] as [number, number];
        const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
        
        let closestIdx = 0;
        let minDist = Infinity;
        const ptPx = m.project(pt);
        
        const distToSegmentSq = (p: {x:number, y:number}, v: {x:number, y:number}, w: {x:number, y:number}) => {
          const l2 = (w.x - v.x)**2 + (w.y - v.y)**2;
          if (l2 === 0) return (p.x - v.x)**2 + (p.y - v.y)**2;
          let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          return (p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2;
        };

        for (let i = 0; i < coords.length - 1; i++) {
          const v = m.project(coords[i]);
          const w = m.project(coords[i+1]);
          const d = distToSegmentSq(ptPx, v, w);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }
        
        coords.splice(closestIdx + 1, 0, pt);
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
      });

      m.on("mousedown", "edit-handles", (e: any) => {
        if (editModeRef.current !== "move") return;
        e.preventDefault();`;
code = code.replace(oldEditEvents, newEditEvents);

// 5. Update JSX buttons
const penBtn = `          {/* Pen */}
          <button
            title="Pen Tool — Click to add anchor points, click first point to close"
            onClick={() => setToolMode(toolMode === "pen" ? "select" : "pen")}
            className={\`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              \${toolMode === "pen" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}\`}
          >`;

const blobBtn = `          {/* Brush / Freehand Tool */}
          <button
            title="Brush Tool (Arsir) — Click and drag to freehand draw (snaps if Magnet is ON)"
            onClick={() => setToolMode(toolMode === "blob" ? "select" : "blob")}
            className={\`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              \${toolMode === "blob" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}\`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          </button>

          {/* Pen */}
          <button
            title="Pen Tool — Click to add anchor points, click first point to close"
            onClick={() => setToolMode(toolMode === "pen" ? "select" : "pen")}
            className={\`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              \${toolMode === "pen" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}\`}
          >`;
code = code.replace(penBtn, blobBtn);

code = code.replace('{/* Pen sub-actions */}\n          {toolMode === "pen" && (', '{/* Pen & Brush sub-actions */}\n          {(toolMode === "pen" || toolMode === "blob") && (');

// 6. Replace Status Bar & Toolbar 
const oldBars = `      {/* Editing Toolbar */}
      {editingAreaId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white p-2 rounded-lg shadow-lg border border-slate-200">
          <button
            onClick={saveEditVertices}
            className="px-4 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors shadow-sm"
          >
            Save Anchors
          </button>
          <button
            onClick={stopEditVertices}
            className="px-4 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status bar */}
      {toolMode === "pen" && (`;

const newBars = `      {/* Editing Toolbar */}
      {editingAreaId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-white p-2 rounded-lg shadow-lg border border-slate-200">
          <div className="flex bg-slate-100 rounded-md p-0.5 mr-2">
            <button
              onClick={() => setEditMode("move")}
              title="Move Anchors"
              className={\`p-1.5 rounded \${editMode === "move" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}\`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M9 19l3 3 3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
            </button>
            <button
              onClick={() => setEditMode("add")}
              title="Add Anchors (+)"
              className={\`p-1.5 rounded \${editMode === "add" ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"}\`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button
              onClick={() => setEditMode("delete")}
              title="Delete Anchors (-)"
              className={\`p-1.5 rounded \${editMode === "delete" ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"}\`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <button
            onClick={saveEditVertices}
            className="px-4 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors shadow-sm"
          >
            Save
          </button>
          <button
            onClick={stopEditVertices}
            className="px-4 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status bar */}
      {(toolMode === "pen" || toolMode === "blob") && (`;

code = code.replace(oldBars, newBars);

// Fix status bar text
const oldStatusText = `          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {penPoints.length === 0`;
const newStatusText = `          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {toolMode === "blob"
            ? (penPoints.length === 0 ? "Click and hold to brush the area (Arsir)" : "Release click to pause, drag again to continue. Click first point to close.")
            : (penPoints.length === 0`;
code = code.replace(oldStatusText, newStatusText);
code = code.replace('? `${penPoints.length} points • Click first point (indigo) to close • Right-click to undo`}', '? `${penPoints.length} points • Click first point (indigo) to close • Right-click to undo`)}');

fs.writeFileSync('src/components/map/MapContainer.tsx', code);
