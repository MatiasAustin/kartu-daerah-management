"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/lib/store/mapStore";

type ToolMode = "select" | "pen";

interface MapContainerProps {
  areas: any[];
  onAreaCreate?: (feature: any) => void;
  onAreaUpdate?: (areaId: string, geometry: any) => void;
  onAreaDelete?: (featureId: string) => void;
  readOnly?: boolean;
}

const RASTER_STYLE: any = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto", minzoom: 0, maxzoom: 22 }],
};

export function MapContainer({
  areas,
  onAreaCreate,
  onAreaUpdate,
  onAreaDelete,
  readOnly = false,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { setMap, setSelectedAreaId, selectedAreaId } = useMapStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  // ── Tool state ──────────────────────────────────────────────────────────────
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const toolModeRef = useRef<ToolMode>("select");
  const [penPoints, setPenPoints] = useState<[number, number][]>([]);
  const penPointsRef = useRef<[number, number][]>([]);
  const [isNearStart, setIsNearStart] = useState(false);
  const isNearStartRef = useRef(false);

  // ── Style state ─────────────────────────────────────────────────────────────
  const [fillOpacity, setFillOpacity] = useState(0.3);
  const [lineWidth, setLineWidth] = useState(2);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const fillOpacityRef = useRef(0.3);
  const lineWidthRef = useRef(2);

  // ── Vertex edit state ───────────────────────────────────────────────────────
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const editingAreaIdRef = useRef<string | null>(null);
  const editGeometryRef = useRef<any>(null);
  const draggingVertexRef = useRef<number | null>(null);

  // ── Callback refs (prevent stale closures in map events) ───────────────────
  const onAreaCreateRef = useRef(onAreaCreate);
  const onAreaUpdateRef = useRef(onAreaUpdate);
  const areasRef = useRef(areas);

  useEffect(() => { onAreaCreateRef.current = onAreaCreate; }, [onAreaCreate]);
  useEffect(() => { onAreaUpdateRef.current = onAreaUpdate; }, [onAreaUpdate]);
  useEffect(() => { areasRef.current = areas; }, [areas]);
  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);
  useEffect(() => { fillOpacityRef.current = fillOpacity; }, [fillOpacity]);
  useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);

  // ─── Map source helpers ──────────────────────────────────────────────────────
  const setPenSource = useCallback((pts: [number, number][], mousePos: [number, number] | null) => {
    if (!map.current) return;
    const allPts = mousePos ? [...pts, mousePos] : pts;

    // Preview line/polygon fill
    const previewFeatures: any[] = [];
    if (allPts.length >= 3) {
      previewFeatures.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[...allPts, allPts[0]]] },
        properties: {},
      });
    } else if (allPts.length === 2) {
      previewFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: allPts },
        properties: {},
      });
    }
    (map.current.getSource("pen-preview") as maplibregl.GeoJSONSource)?.setData({
      type: "FeatureCollection", features: previewFeatures,
    } as any);

    // Anchor dots
    const dotFeatures = pts.map((pt, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: pt },
      properties: { isStart: i === 0 },
    }));
    (map.current.getSource("pen-dots") as maplibregl.GeoJSONSource)?.setData({
      type: "FeatureCollection", features: dotFeatures,
    } as any);
  }, []);

  const setEditSource = useCallback((geom: any) => {
    if (!map.current || !geom) {
      (map.current?.getSource("edit-verts") as maplibregl.GeoJSONSource)?.setData({ type: "FeatureCollection", features: [] } as any);
      return;
    }
    const coords = geom.coordinates[0] as [number, number][];
    const verts = coords.slice(0, -1); // exclude closing duplicate
    const features: any[] = [
      { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { type: "ring" } },
      ...verts.map((c, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c },
        properties: { index: i },
      })),
    ];
    (map.current.getSource("edit-verts") as maplibregl.GeoJSONSource)?.setData({ type: "FeatureCollection", features } as any);
  }, []);

  const closePen = useCallback(() => {
    const pts = penPointsRef.current;
    if (pts.length < 3) return;
    const geometry = { type: "Polygon", coordinates: [[...pts, pts[0]]] };
    onAreaCreateRef.current?.({ type: "Feature", geometry, properties: {} });
    penPointsRef.current = [];
    setPenPoints([]);
    setIsNearStart(false);
    isNearStartRef.current = false;
    setPenSource([], null);
    setToolMode("select");
    toolModeRef.current = "select";
    if (map.current) map.current.getCanvas().style.cursor = "";
  }, [setPenSource]);

  // ─── Init Map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: RASTER_STYLE,
      center: [106.8272, -6.1751],
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    const geolocate = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true } as any);
    map.current.addControl(geolocate, "top-right");

    map.current.on("load", () => {
      const m = map.current!;
      setMapLoaded(true);
      setMap(m);

      // Auto-trigger geolocation immediately on load
      setTimeout(() => { try { geolocate.trigger(); } catch {} }, 1000);

      // ── Areas source + layers ──────────────────────────────────────────
      m.addSource("areas-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "areas-fill", type: "fill", source: "areas-source", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 } });
      m.addLayer({ id: "areas-outline", type: "line", source: "areas-source", paint: { "line-color": ["get", "color"], "line-width": 2 } });
      m.addLayer({
        id: "areas-label", type: "symbol", source: "areas-source",
        layout: { "text-field": ["concat", ["get", "area_number"], " ", ["get", "name"]], "text-size": 11, "text-anchor": "center", "text-max-width": 8 },
        paint: { "text-color": "#1e293b", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      });

      // ── Pen preview layers ─────────────────────────────────────────────
      // Line connecting placed points + mouse cursor
      m.addSource("pen-preview", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "pen-fill", type: "fill", source: "pen-preview", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#6366f1", "fill-opacity": 0.15 } });
      // Make line thick, solid, and always visible
      m.addLayer({ id: "pen-line", type: "line", source: "pen-preview", paint: { "line-color": "#6366f1", "line-width": 2.5, "line-opacity": 1 } });
      // White outline under line for contrast on any basemap
      m.addLayer({ id: "pen-line-outline", type: "line", source: "pen-preview", paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.5 }, layout: {} }, "pen-line");

      // Anchor dots
      m.addSource("pen-dots", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "pen-dots-layer", type: "circle", source: "pen-dots",
        paint: {
          "circle-radius": ["case", ["boolean", ["get", "isStart"], false], 9, 5],
          "circle-color": ["case", ["boolean", ["get", "isStart"], false], "#10b981", "#6366f1"],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });

      // ── Edit vertex layers ─────────────────────────────────────────────
      m.addSource("edit-verts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "edit-ring", type: "line", source: "edit-verts", filter: ["==", ["get", "type"], "ring"], paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [4, 2] } });
      m.addLayer({
        id: "edit-handles", type: "circle", source: "edit-verts",
        filter: ["!=", ["geometry-type"], "LineString"],
        paint: { "circle-radius": 7, "circle-color": "#f59e0b", "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
      });

      // ── Map click: pen tool or area select ────────────────────────────
      m.on("click", (e: maplibregl.MapMouseEvent) => {
        const mode = toolModeRef.current;

        if (mode === "pen") {
          const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          const pts = penPointsRef.current;

          // Snap-to-close
          if (pts.length >= 3) {
            const startPx = m.project(pts[0] as maplibregl.LngLatLike);
            const clickPx = m.project(lngLat);
            if (Math.hypot(startPx.x - clickPx.x, startPx.y - clickPx.y) < 16) {
              closePen();
              return;
            }
          }
          const newPts: [number, number][] = [...pts, lngLat];
          penPointsRef.current = newPts;
          setPenPoints([...newPts]);
          setPenSource(newPts, null);
          return;
        }

        // Select mode — handled by layer click below
      });

      m.on("click", "areas-fill", (e) => {
        if (toolModeRef.current !== "select") return;
        if (e.features?.length) setSelectedAreaId(e.features[0].id as string);
      });

      // ── Mousemove: pen preview ─────────────────────────────────────────
      m.on("mousemove", (e: maplibregl.MapMouseEvent) => {
        if (toolModeRef.current !== "pen") return;
        const mousePos: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const pts = penPointsRef.current;
        setPenSource(pts, mousePos);

        if (pts.length >= 3) {
          const startPx = m.project(pts[0] as maplibregl.LngLatLike);
          const mPx = m.project(mousePos);
          const near = Math.hypot(startPx.x - mPx.x, startPx.y - mPx.y) < 16;
          if (near !== isNearStartRef.current) {
            isNearStartRef.current = near;
            setIsNearStart(near);
          }
        }
      });

      // ── Right-click: undo last pen point ──────────────────────────────
      m.on("contextmenu", (e: any) => {
        if (toolModeRef.current !== "pen") return;
        e.preventDefault();
        const pts = penPointsRef.current.slice(0, -1);
        penPointsRef.current = pts;
        setPenPoints([...pts]);
        setPenSource(pts, null);
      });

      // ── Cursor changes ────────────────────────────────────────────────
      m.on("mouseenter", "areas-fill", () => {
        if (toolModeRef.current === "select") m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "areas-fill", () => {
        if (toolModeRef.current === "select") m.getCanvas().style.cursor = "";
      });

      // ── Vertex drag ────────────────────────────────────────────────────
      m.on("mouseenter", "edit-handles", () => { m.getCanvas().style.cursor = "grab"; });
      m.on("mouseleave", "edit-handles", () => { m.getCanvas().style.cursor = ""; });

      m.on("mousedown", "edit-handles", (e: any) => {
        e.preventDefault();
        if (!e.features?.length) return;
        const idx = e.features[0].properties.index as number;
        draggingVertexRef.current = idx;
        m.getCanvas().style.cursor = "grabbing";
        m.dragPan.disable();

        const onMove = (mv: maplibregl.MapMouseEvent) => {
          if (draggingVertexRef.current === null || !editGeometryRef.current) return;
          const coords = [...editGeometryRef.current.coordinates[0]] as [number, number][];
          coords[draggingVertexRef.current] = [mv.lngLat.lng, mv.lngLat.lat];
          // Keep polygon closed (first === last)
          if (draggingVertexRef.current === 0) coords[coords.length - 1] = [mv.lngLat.lng, mv.lngLat.lat];
          const newGeom = { ...editGeometryRef.current, coordinates: [coords] };
          editGeometryRef.current = newGeom;
          (m.getSource("edit-verts") as maplibregl.GeoJSONSource)?.setData({
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
          m.off("mousemove", onMove as any);
          m.off("mouseup", onUp);
          m.dragPan.enable();
          m.getCanvas().style.cursor = "grab";
          draggingVertexRef.current = null;
          if (editingAreaIdRef.current && editGeometryRef.current) {
            onAreaUpdateRef.current?.(editingAreaIdRef.current, editGeometryRef.current);
          }
        };

        m.on("mousemove", onMove as any);
        m.on("mouseup", onUp);
      });
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync areas GeoJSON ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    (map.current.getSource("areas-source") as maplibregl.GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: areas.filter(a => a.geometry).map(a => ({
        type: "Feature",
        id: a.id,
        geometry: a.geometry,
        properties: { ...a, color: a.groups?.color || "#ef4444" },
      })),
    } as any);
  }, [areas, mapLoaded]);

  // ── Sync fill/line style live ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (map.current.getLayer("areas-fill")) {
      map.current.setPaintProperty("areas-fill", "fill-opacity", [
        "case", ["boolean", ["feature-state", "selected"], false], Math.min(fillOpacity + 0.25, 1), fillOpacity,
      ]);
    }
    if (map.current.getLayer("areas-outline")) {
      map.current.setPaintProperty("areas-outline", "line-width", [
        "case", ["boolean", ["feature-state", "selected"], false], lineWidth + 2, lineWidth,
      ]);
    }
  }, [fillOpacity, lineWidth, mapLoaded]);

  // ── Sync selected feature state ───────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    areas.forEach(a => {
      map.current?.setFeatureState(
        { source: "areas-source", id: a.id },
        { selected: a.id === selectedAreaId }
      );
    });
  }, [selectedAreaId, areas, mapLoaded]);

  // ── Cursor on tool mode change ────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = toolMode === "pen" ? "crosshair" : "";
    if (toolMode !== "pen") {
      penPointsRef.current = [];
      setPenPoints([]);
      setIsNearStart(false);
      isNearStartRef.current = false;
      if (mapLoaded) setPenSource([], null);
    }
  }, [toolMode, mapLoaded, setPenSource]);

  // ── Vertex editing helpers ────────────────────────────────────────────────
  const startEditVertices = useCallback((areaId: string) => {
    const area = areasRef.current.find(a => a.id === areaId);
    if (!area?.geometry) return;
    editingAreaIdRef.current = areaId;
    editGeometryRef.current = area.geometry;
    setEditingAreaId(areaId);
    setEditSource(area.geometry);
  }, [setEditSource]);

  const stopEditVertices = useCallback(() => {
    editingAreaIdRef.current = null;
    editGeometryRef.current = null;
    setEditingAreaId(null);
    setEditSource(null);
  }, [setEditSource]);

  // Expose to ProjectWorkspace via window (lightweight bridge)
  useEffect(() => {
    (window as any).__mapEditVertices = startEditVertices;
    (window as any).__mapStopEdit = stopEditVertices;
    return () => { delete (window as any).__mapEditVertices; delete (window as any).__mapStopEdit; };
  }, [startEditVertices, stopEditVertices]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* ── Floating Toolbar ── */}
      {!readOnly && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">

          {/* Select */}
          <button
            title="Select Tool (V)"
            onClick={() => { setToolMode("select"); stopEditVertices(); }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border text-sm transition-all
              ${toolMode === "select" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 0 20 12.279 13.611 14.164 17.855 20.507 16.011 21.737 11.767 15.394 7 19z"/>
            </svg>
          </button>

          {/* Pen */}
          <button
            title="Pen Tool — Click to add points, right-click to undo, click first point to close"
            onClick={() => setToolMode(toolMode === "pen" ? "select" : "pen")}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              ${toolMode === "pen" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
            </svg>
          </button>

          {/* Pen sub-actions */}
          {toolMode === "pen" && (
            <>
              {/* Undo last point */}
              <button
                title="Undo Last Point (or right-click)"
                onClick={() => {
                  const pts = penPointsRef.current.slice(0, -1);
                  penPointsRef.current = pts;
                  setPenPoints([...pts]);
                  setPenSource(pts, null);
                }}
                disabled={penPoints.length === 0}
                className="w-9 h-9 flex items-center justify-center rounded-lg shadow-md border bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
                </svg>
              </button>

              {/* Close polygon */}
              <button
                title="Close Polygon"
                onClick={closePen}
                disabled={penPoints.length < 3}
                className="w-9 h-9 flex items-center justify-center rounded-lg shadow-md border bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 disabled:opacity-30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            </>
          )}

          {/* Style Settings (only in select mode) */}
          {toolMode === "select" && !editingAreaId && (
            <div className="relative mt-0.5">
              <button
                title="Style Settings"
                onClick={() => setShowStylePanel(p => !p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
                  ${showStylePanel ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 1.85 11.07 10 10 0 0 1-8.92 5.5 10 10 0 0 1-8.92-5.5 10 10 0 0 1 1.85-11.07"/>
                </svg>
              </button>

              {showStylePanel && (
                <div className="absolute left-11 top-0 w-58 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-20" style={{ width: 224 }}>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Style Settings</h4>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                      <span>Fill Opacity</span>
                      <span className="font-mono text-indigo-600">{Math.round(fillOpacity * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={0.9} step={0.05} value={fillOpacity}
                      onChange={e => setFillOpacity(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                      <span>Border Weight</span>
                      <span className="font-mono text-indigo-600">{lineWidth}px</span>
                    </div>
                    <input type="range" min={1} max={8} step={0.5} value={lineWidth}
                      onChange={e => setLineWidth(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
                    Area colors are set per Group in the sidebar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Status bar ── */}
      {toolMode === "pen" && (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2.5 pointer-events-none select-none transition-colors
          ${isNearStart && penPoints.length >= 3 ? "bg-emerald-600" : "bg-indigo-700"}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {penPoints.length === 0
            ? "Click anywhere on the map to place the first anchor point"
            : penPoints.length < 3
            ? `${penPoints.length} point${penPoints.length > 1 ? "s" : ""} placed — need at least 3 · Right-click to undo`
            : isNearStart
            ? "Click to close the polygon ✓"
            : `${penPoints.length} points · Click the first point (green dot) to close · Right-click to undo`}
        </div>
      )}

      {editingAreaId && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Drag the yellow handles to reposition anchor points · Changes save automatically
        </div>
      )}
    </div>
  );
}
