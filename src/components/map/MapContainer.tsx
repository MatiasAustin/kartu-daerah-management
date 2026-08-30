"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import type * as MapLibreTypes from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/lib/store/mapStore";
import { MapStyleToggle } from "./MapStyleToggle";
import { MapSearchBox } from "./MapSearchBox";

const CLEAN_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DETAILED_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

if (typeof window !== "undefined") {
  // Bypass Next.js dynamic route HTML resolution for relative worker chunks
  maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@6.3.0/dist/maplibre-gl-worker.mjs");
}

type ToolMode = "select" | "pen" | "blob";

// ─── EWKB decoder ────────────────────────────────────────────────────────────
// Supabase/PostgREST returns PostGIS geometry columns as EWKB hex strings by
// default. This lightweight decoder converts them back to GeoJSON so MapLibre
// can render them.
function ewkbHexToGeoJSON(hex: string): any | null {
  try {
    // Convert hex string to byte array
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }

    const view = new DataView(bytes.buffer);
    let offset = 0;

    const readGeometry = (): any | null => {
      if (offset >= bytes.length) return null;
      
      const byteOrder = view.getUint8(offset++);
      const le = byteOrder === 1; // 1 = little-endian

      const readUint32 = () => { const v = view.getUint32(offset, le); offset += 4; return v; };
      const readFloat64 = () => { const v = view.getFloat64(offset, le); offset += 8; return v; };

      let wkbType = readUint32();

      // EWKB flags
      const hasZ = (wkbType & 0x80000000) !== 0;
      const hasM = (wkbType & 0x40000000) !== 0;
      const hasSRID = (wkbType & 0x20000000) !== 0;
      wkbType = wkbType & 0x0fffffff;

      if (hasSRID) readUint32(); // skip SRID

      const readPoint = (): [number, number] => {
        const x = readFloat64();
        const y = readFloat64();
        if (hasZ) readFloat64();
        if (hasM) readFloat64();
        return [x, y];
      };

      const readRing = (): [number, number][] => {
        const count = readUint32();
        const pts: [number, number][] = [];
        for (let i = 0; i < count; i++) pts.push(readPoint());
        return pts;
      };

      if (wkbType === 1) {
        return { type: "Point", coordinates: readPoint() };
      } else if (wkbType === 2) {
        return { type: "LineString", coordinates: readRing() };
      } else if (wkbType === 3) {
        const numRings = readUint32();
        const rings = [];
        for (let i = 0; i < numRings; i++) rings.push(readRing());
        return { type: "Polygon", coordinates: rings };
      } else if (wkbType === 4) {
        const numGeoms = readUint32();
        const pts = [];
        for (let i = 0; i < numGeoms; i++) {
          const geom = readGeometry();
          if (geom && geom.type === "Point") pts.push(geom.coordinates);
        }
        return { type: "MultiPoint", coordinates: pts };
      } else if (wkbType === 5) {
        const numGeoms = readUint32();
        const lines = [];
        for (let i = 0; i < numGeoms; i++) {
          const geom = readGeometry();
          if (geom && geom.type === "LineString") lines.push(geom.coordinates);
        }
        return { type: "MultiLineString", coordinates: lines };
      } else if (wkbType === 6) {
        const numGeoms = readUint32();
        const polys = [];
        for (let i = 0; i < numGeoms; i++) {
          const geom = readGeometry();
          if (geom && geom.type === "Polygon") polys.push(geom.coordinates);
        }
        return { type: "MultiPolygon", coordinates: polys };
      } else if (wkbType === 7) {
        const numGeoms = readUint32();
        const geometries = [];
        for (let i = 0; i < numGeoms; i++) {
          const geom = readGeometry();
          if (geom) geometries.push(geom);
        }
        return { type: "GeometryCollection", geometries };
      }
      return null;
    };

    return readGeometry();
  } catch (e) {
    console.error("EWKB decode error:", e);
    return null;
  }
}

// Resolve geometry from an area object — handles GeoJSON objects, JSON strings,
// and raw EWKB hex strings returned by PostgREST for PostGIS geometry columns.
export function resolveGeometry(area: any): any | null {
  // 1. Try dedicated geojson field first
  let geo = area.geojson ?? area.geometry;
  if (!geo) return null;

  // 2. If it's already an object with a recognised GeoJSON type, use it directly
  if (typeof geo === "object" && geo !== null && geo.type) {
    if (geo.crs) {
      // Strip 'crs' as it is deprecated in RFC 7946 and can cause MapLibre to reject the feature
      const { crs, ...rest } = geo;
      return rest;
    }
    return geo;
  }

  // 3. JSON-encoded GeoJSON string: starts with '{'
  if (typeof geo === "string" && geo.trimStart().startsWith("{")) {
    try { 
      const parsed = JSON.parse(geo); 
      if (parsed.crs) {
        const { crs, ...rest } = parsed;
        return rest;
      }
      return parsed;
    } catch { return null; }
  }

  // 4. EWKB hex string: all hex characters (0-9, a-f, A-F)
  if (typeof geo === "string" && /^[0-9a-fA-F]+$/.test(geo)) {
    return ewkbHexToGeoJSON(geo);
  }

  return null;
}

interface MapContainerProps {
  areas: any[];
  references?: any[];
  onAreaCreate?: (feature: any) => void;
  onAreaUpdate?: (areaId: string, geometry: any) => void;
  onAreaDelete?: (featureId: string) => void;
  readOnly?: boolean;
}


export function MapContainer({
  areas,
  references = [],
  onAreaCreate,
  onAreaUpdate,
  onAreaDelete,
  readOnly = false,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const overlayCanvas = useRef<HTMLCanvasElement>(null); // ← Canvas overlay for pen tool
  const map = useRef<MapLibreTypes.Map | null>(null);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const { setMap, setSelectedAreaId, selectedAreaId, mapProvider, maptilerKey, maptilerStyle } = useMapStore();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);

  // ── Tool state ──────────────────────────────────────────────────────────────
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const toolModeRef = useRef<ToolMode>("select");
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const isMagnetModeRef = useRef(false);
  const [penPoints, setPenPoints] = useState<[number, number][]>([]);
  const penPointsRef = useRef<[number, number][]>([]);
  const mousePosRef = useRef<[number, number] | null>(null);
  const isBrushingRef = useRef(false);
  const [isNearStart, setIsNearStart] = useState(false);
  const isNearStartRef = useRef(false);

  // ── Style state ─────────────────────────────────────────────────────────────
  const [fillOpacity, setFillOpacity] = useState(0.25);
  const [lineWidth, setLineWidth] = useState(2);
  const fillOpacityRef = useRef(0.25);
  const lineWidthRef = useRef(2);

  // ── Vertex edit state ───────────────────────────────────────────────────────
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const editingAreaIdRef = useRef<string | null>(null);
  const editGeometryRef = useRef<any>(null);
  const draggingVertexRef = useRef<number | null>(null);
  const [editMode, setEditMode] = useState<"move" | "add" | "delete">("move");
  const editModeRef = useRef<"move" | "add" | "delete">("move");

  const onAreaCreateRef = useRef(onAreaCreate);
  const onAreaUpdateRef = useRef(onAreaUpdate);

  // ── Sync refs ───────────────────────────────────────────────────────────────
  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);

  useEffect(() => {
    if (!map.current) return;
    const canvas = map.current.getCanvas();
    if (toolMode === "pen") {
      canvas.style.cursor = "crosshair";
      map.current.dragPan.enable(); // Allow panning while using pen tool
    } else if (toolMode === "blob") {
      canvas.style.cursor = "crosshair";
      map.current.dragPan.disable(); // Blob needs drag to draw
    } else {
      canvas.style.cursor = "grab";
      map.current.dragPan.enable();
    }
  }, [toolMode, mapLoaded]);

  useEffect(() => { isMagnetModeRef.current = isMagnetMode; }, [isMagnetMode]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { onAreaUpdateRef.current = onAreaUpdate; }, [onAreaUpdate]);
  const areasRef = useRef(areas);

  useEffect(() => { onAreaCreateRef.current = onAreaCreate; }, [onAreaCreate]);
  useEffect(() => { onAreaUpdateRef.current = onAreaUpdate; }, [onAreaUpdate]);
  useEffect(() => { areasRef.current = areas; }, [areas]);
  useEffect(() => { toolModeRef.current = toolMode; }, [toolMode]);
  useEffect(() => { fillOpacityRef.current = fillOpacity; }, [fillOpacity]);
  useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CANVAS PEN DRAWING (bypasses MapLibre GL layer ordering completely)
  // ─────────────────────────────────────────────────────────────────────────────

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

  const drawPenCanvas = useCallback(() => {
    const canvas = overlayCanvas.current;
    const m = map.current;
    if (!canvas || !m) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = penPointsRef.current;
    const mousePos = mousePosRef.current;
    if (pts.length === 0 && !mousePos) return;

    // Project geographic coords → pixel coords
    const px = (lnglat: [number, number]) => {
      const p = m.project(lnglat as MapLibreTypes.LngLatLike);
      return { x: p.x, y: p.y };
    };

    const pixPts = pts.map(px);
    const pixMouse = mousePos ? px(mousePos) : null;

    // ── 1. Light polygon fill preview (when ≥3 points) ─────────────────
    if (pixPts.length >= 3 && pixMouse) {
      ctx.beginPath();
      ctx.moveTo(pixPts[0].x, pixPts[0].y);
      pixPts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pixMouse.x, pixMouse.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(99,102,241,0.12)";
      ctx.fill();
    }

    // ── 2. Committed path — solid indigo line through placed pts ────────
    if (pixPts.length >= 2) {
      // White halo
      ctx.beginPath();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 7;
      ctx.setLineDash([]);
      ctx.moveTo(pixPts[0].x, pixPts[0].y);
      pixPts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Solid indigo
      ctx.beginPath();
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 3;
      ctx.moveTo(pixPts[0].x, pixPts[0].y);
      pixPts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // ── 3. Rubber band — dashed orange from last point to mouse ─────────
    if (pixPts.length >= 1 && pixMouse) {
      const last = pixPts[pixPts.length - 1];
      const near = isNearStartRef.current && pixPts.length >= 3;

      // White halo
      ctx.beginPath();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 7;
      ctx.setLineDash([]);
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pixMouse.x, pixMouse.y);
      ctx.stroke();

      // Dashed rubber band (orange normally, green when near start)
      ctx.beginPath();
      ctx.strokeStyle = near ? "#10b981" : "#f97316";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pixMouse.x, pixMouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── 4. Closing segment preview (first pt → mouse when near start) ───
    if (pixPts.length >= 3 && pixMouse && isNearStartRef.current) {
      const first = pixPts[0];
      ctx.beginPath();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(pixMouse.x, pixMouse.y);
      ctx.lineTo(first.x, first.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── 5. Anchor dots ──────────────────────────────────────────────────
    pixPts.forEach((p, i) => {
      const isStart = i === 0;
      const r = isStart ? 9 : 6;
      const nearStart = isStart && isNearStartRef.current && pixPts.length >= 3;

      // White ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Colored dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = nearStart ? "#10b981" : isStart ? "#6366f1" : "#4f46e5";
      ctx.fill();

      // Pulse ring on start when hovering
      if (nearStart) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, []);

  const clearPenCanvas = useCallback(() => {
    const canvas = overlayCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ─── Close polygon ────────────────────────────────────────────────────────
  const closePen = useCallback(() => {
    const pts = penPointsRef.current;
    if (pts.length < 3) return;
    const geometry = { type: "Polygon", coordinates: [[...pts, pts[0]]] };
    onAreaCreateRef.current?.({ type: "Feature", geometry, properties: {} });
    penPointsRef.current = [];
    mousePosRef.current = null;
    setPenPoints([]);
    setIsNearStart(false);
    isNearStartRef.current = false;
    clearPenCanvas();
    setToolMode("select");
    toolModeRef.current = "select";
    if (map.current) map.current.getCanvas().style.cursor = "";
  }, [clearPenCanvas]);

  // ─── Edit source ──────────────────────────────────────────────────────────
  const setEditSource = useCallback((geom: any) => {
    if (!map.current || !geom) {
      (map.current?.getSource("edit-verts") as MapLibreTypes.GeoJSONSource)?.setData({ type: "FeatureCollection", features: [] } as any);
      return;
    }
    const coords = geom.coordinates[0] as [number, number][];
    const verts = coords.slice(0, -1);
    const features: any[] = [
      { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { type: "ring" } },
      ...verts.map((c, i) => ({
        type: "Feature", geometry: { type: "Point", coordinates: c }, properties: { index: i },
      })),
    ];
    (map.current.getSource("edit-verts") as MapLibreTypes.GeoJSONSource)?.setData({ type: "FeatureCollection", features } as any);
  }, []);

  // ─── Resize canvas to match map container ────────────────────────────────
  useEffect(() => {
    const canvas = overlayCanvas.current;
    const container = mapContainer.current;
    if (!canvas || !container) return;
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawPenCanvas(); // redraw after resize
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawPenCanvas]);

  // ─── Init Map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const initialStyle = mapProvider === "maptiler" && maptilerKey
      ? `https://api.maptiler.com/maps/${maptilerStyle}/style.json?key=${maptilerKey}`
      : mapStyle === "detailed" ? DETAILED_STYLE : CLEAN_STYLE;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: [106.8272, -6.1751],
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    } as any);
    map.current.addControl(geolocate, "top-right");

    const addAreaLayers = (m: maplibregl.Map) => {
      // ── Areas source + layers ─────────────────────────────────────────
      if (!m.getSource("areas-source")) {
        m.addSource("areas-source", { 
          type: "geojson", 
          data: { type: "FeatureCollection", features: [] },
          promoteId: "id"
        });
      }
      if (!m.getLayer("areas-fill")) {
        m.addLayer({ id: "areas-fill", type: "fill", source: "areas-source",
          paint: { 
            "fill-color": ["get", "color"], 
            "fill-opacity": [
              "case", ["boolean", ["feature-state", "selected"], false], Math.min(fillOpacityRef.current + 0.25, 1), fillOpacityRef.current
            ] 
          } 
        });
      }
      
      // Dynamic area-outline layers are created in the areas sync useEffect
      
      if (!m.getLayer("areas-label")) {
        m.addLayer({
          id: "areas-label", type: "symbol", source: "areas-source",
          layout: { "text-field": ["concat", ["get", "area_number"], " ", ["get", "name"]],
            "text-size": 11, "text-anchor": "center", "text-max-width": 8 },
          paint: { "text-color": "#1e293b", "text-halo-color": "#fff", "text-halo-width": 1.5 },
        });
      }

      // ── References source + layer ─────────────────────────────────────
      if (!m.getSource("references-source")) {
        m.addSource("references-source", { 
          type: "geojson", 
          data: { type: "FeatureCollection", features: [] }
        });
      }

      // Note: Reference layers are now maintained dynamically in a separate useEffect

      const showAreaPopup = (e: any) => {
        if (toolModeRef.current !== "select") return;
        if (!e.features?.length) return;
        
        const area = e.features[0];
        const areaId = area.id as string || area.properties.id;
        
        // Don't recreate if it's the exact same area popup already showing
        const existingPopup = document.querySelector(`.glassmorphism-popup[data-area-id="${areaId}"]`);
        if (existingPopup) return;

        // Close any existing popups automatically
        const popups = document.getElementsByClassName("mapboxgl-popup");
        for (let i = 0; i < popups.length; i++) popups[i].remove();
        
        const popups2 = document.getElementsByClassName("maplibregl-popup");
        for (let i = 0; i < popups2.length; i++) popups2[i].remove();

        const popupContent = document.createElement("div");
        popupContent.className = "p-1 font-sans min-w-[200px]";
        popupContent.innerHTML = `
          <div class="flex flex-col gap-2.5">
            <div>
              <h3 class="font-semibold text-slate-800 text-lg m-0 leading-tight">${area.properties.name || "Unknown Area"}</h3>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <span class="px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full w-fit">
                  ${area.properties.group_name || "No Group"}
                </span>
                ${area.properties.publisher_name ? `
                <span class="px-2.5 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full w-fit flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  ${area.properties.publisher_name}
                </span>` : ''}
              </div>
            </div>
            ${!readOnly ? `
            <button id="btn-style-${areaId}" class="mt-1 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm">
              Edit Style Line
            </button>
            ` : ''}
          </div>
        `;

        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: "glassmorphism-popup"
        })
          .setLngLat(e.lngLat)
          .setDOMContent(popupContent)
          .addTo(m);
          
        // Tag the popup element to avoid recreating it when hovering the same area
        popup.getElement().setAttribute("data-area-id", areaId);

        // Add event listener to the button
        const btn = popupContent.querySelector(`#btn-style-${areaId}`);
        if (btn) {
          btn.addEventListener("click", () => {
            // Close popup and open style modal
            popup.remove();
            window.dispatchEvent(new CustomEvent("open-area-style-modal", { detail: { areaId } }));
          });
        }
      };

      // ── Area selection click ──────────────────────────────────────────
      m.on("click", "areas-fill", (e) => {
        if (toolModeRef.current !== "select") return;
        if (e.features?.length) {
          const areaId = e.features[0].id as string || e.features[0].properties.id;
          setSelectedAreaId(areaId);
          showAreaPopup(e);
        }
      });
      
      // ── Area hover ────────────────────────────────────────────────────
      m.on("mouseenter", "areas-fill", (e) => {
        if (toolModeRef.current === "select") {
          m.getCanvas().style.cursor = "pointer";
          showAreaPopup(e);
        }
      });
      
      m.on("mouseleave", "areas-fill", () => {
        m.getCanvas().style.cursor = "";
      });

      // ── Edit vertex layers ────────────────────────────────────────────
      if (!m.getSource("edit-verts")) {
        m.addSource("edit-verts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }
      if (!m.getLayer("edit-ring")) {
        m.addLayer({ id: "edit-ring", type: "line", source: "edit-verts",
          filter: ["==", ["get", "type"], "ring"],
          paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [4, 2] } });
      }
      if (!m.getLayer("edit-handles")) {
        m.addLayer({ id: "edit-handles", type: "circle", source: "edit-verts",
          filter: ["!=", ["geometry-type"], "LineString"],
          paint: { "circle-radius": 7, "circle-color": "#f59e0b",
            "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
      }
    };

    map.current.on("load", () => {
      const m = map.current!;
      setMapLoaded(true);
      setMap(m);

      addAreaLayers(m);

      // ── Map move: redraw canvas pen ───────────────────────────────────
      m.on("move", () => {
        if (toolModeRef.current === "pen") drawPenCanvas();
      });

      // ── Pen tool: map click ───────────────────────────────────────────
      m.on("click", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current !== "pen") return;
        const lngLat: [number, number] = mousePosRef.current || [e.lngLat.lng, e.lngLat.lat];
        const pts = penPointsRef.current;

        // Snap-to-close
        if (pts.length >= 3) {
          const startPx = m.project(pts[0] as MapLibreTypes.LngLatLike);
          const clickPx = m.project(lngLat);
          if (Math.hypot(startPx.x - clickPx.x, startPx.y - clickPx.y) < 18) {
            closePen();
            return;
          }
        }
        const newPts: [number, number][] = [...pts, lngLat];
        penPointsRef.current = newPts;
        setPenPoints([...newPts]);
        drawPenCanvas();
      });

      // ── Pen tool: mousemove ───────────────────────────────────────────
      m.on("mousemove", (e: MapLibreTypes.MapMouseEvent) => {
        if (toolModeRef.current !== "pen") return;
        
        let snappedLngLat = [e.lngLat.lng, e.lngLat.lat] as [number, number];
        
        snappedLngLat = getSnappedLngLat(m, e);
        
        mousePosRef.current = snappedLngLat;
        const pts = penPointsRef.current;

        if (pts.length >= 3) {
          const startPx = m.project(pts[0] as MapLibreTypes.LngLatLike);
          const mPx = m.project(mousePosRef.current as MapLibreTypes.LngLatLike);
          const near = Math.hypot(startPx.x - mPx.x, startPx.y - mPx.y) < 18;
          if (near !== isNearStartRef.current) {
            isNearStartRef.current = near;
            setIsNearStart(near);
          }
        }
        drawPenCanvas();
      });

      // ── Right-click: undo last point ──────────────────────────────────
      m.on("contextmenu", (e: any) => {
        if (toolModeRef.current !== "pen") return;
        e.preventDefault();
        const pts = penPointsRef.current.slice(0, -1);
        penPointsRef.current = pts;
        setPenPoints([...pts]);
        drawPenCanvas();
      });

      // ── Vertex drag ───────────────────────────────────────────────────
      m.on("mouseenter", "edit-handles", () => {
    if (editModeRef.current === "move") m.getCanvas().style.cursor = "grab";
    else if (editModeRef.current === "delete") m.getCanvas().style.cursor = "pointer";
  });
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

        updateLayers(editGeometryRef.current);
        if (onAreaUpdateRef.current) onAreaUpdateRef.current(editingAreaIdRef.current!, {
          geometry: editGeometryRef.current,
          geojson: { type: "Polygon", coordinates: [coords] }
        });
      });

      
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

        updateLayers(editGeometryRef.current);
        if (onAreaUpdateRef.current) onAreaUpdateRef.current(editingAreaIdRef.current!, {
          geometry: editGeometryRef.current,
          geojson: { type: "Polygon", coordinates: [coords] }
        });
      });

            const onVertexDown = (e: any) => {
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
      m.on("touchstart", "edit-handles", onVertexDown);
    });

    map.current.on("style.load", () => {
      const m = map.current!;
      addAreaLayers(m);
      setStyleVersion(v => v + 1);
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle Style Changes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    const nextStyle = mapProvider === "maptiler" && maptilerKey
      ? `https://api.maptiler.com/maps/${maptilerStyle}/style.json?key=${maptilerKey}`
      : mapStyle === "detailed" ? DETAILED_STYLE : CLEAN_STYLE;
      
    map.current.setStyle(nextStyle);
  }, [mapStyle, mapLoaded, mapProvider, maptilerKey, maptilerStyle]);

  // ── Sync areas GeoJSON ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const validFeatures: any[] = [];
    console.log("[MapDebug] areas count:", areas.length);
    for (const a of areas) {
      console.log("[MapDebug] area:", a.name, {
        geometry_type: typeof a.geometry,
        geometry_value: JSON.stringify(a.geometry)?.substring(0, 120),
        geojson_type: typeof a.geojson,
        geojson_value: JSON.stringify(a.geojson)?.substring(0, 120),
        groups: a.groups,
      });
      const geo = resolveGeometry(a);
      if (geo) {
        // Only pick primitive properties to avoid passing complex/nested objects to MapLibre worker
        const safeProps = {
          id: a.id,
          name: a.name,
          area_number: a.area_number,
          color: a.color || a.groups?.color || a.group_color || "#ef4444",
          group_name: a.groups?.name || a.group_name || "No Group",
          stroke_weight: a.stroke_weight ?? a.groups?.stroke_weight ?? 2,
          dash_array: a.dash_array || a.groups?.dash_array || "solid",
          publisher_name: a.publisher_name || null,
        };

        if (geo.type === "GeometryCollection" && geo.geometries) {
          geo.geometries.forEach((g: any, i: number) => {
            validFeatures.push({
              type: "Feature",
              id: `${a.id}-${i}`,
              geometry: g,
              properties: safeProps,
            });
          });
        } else {
          validFeatures.push({
            type: "Feature",
            id: a.id,
            geometry: geo,
            properties: safeProps,
          });
        }
      }
    }
    console.log("[MapDebug] validFeatures:", validFeatures.length, validFeatures[0]);

    const source = map.current.getSource("areas-source") as MapLibreTypes.GeoJSONSource;
    if (source) {
      console.log("[MapDebug] Setting data to source!");
      source.setData({
        type: "FeatureCollection",
        features: validFeatures,
      } as any);
    } else {
      console.log("[MapDebug] SOURCE IS UNDEFINED! Cannot set data.");
    }

    // --- Dynamic Area Outlines based on dash_array ---
    const dashGroups = new Set(areas.map(a => a.dash_array || a.groups?.dash_array || "solid"));
    
    // First, remove old generated dash layers
    map.current.getStyle()?.layers?.forEach(layer => {
      if (layer.id.startsWith("areas-outline-")) {
        map.current?.removeLayer(layer.id);
      }
    });
    if (map.current.getLayer("areas-outline")) {
        map.current.removeLayer("areas-outline");
    }

    dashGroups.forEach(dash => {
      const layerId = dash === "solid" ? "areas-outline-solid" : `areas-outline-${dash.replace(/,/g, "-")}`;
      
      const paintProps: any = {
        "line-color": ["get", "color"],
        "line-width": ["get", "stroke_weight"]
      };
      
      if (dash !== "solid") {
         paintProps["line-dasharray"] = dash.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
      }

      if (!map.current?.getLayer(layerId)) {
        map.current?.addLayer({
          id: layerId,
          type: "line",
          source: "areas-source",
          filter: ["==", ["get", "dash_array"], dash],
          paint: paintProps
        }, "areas-label"); // Ensure it stays below labels
      }
    });

  }, [areas, mapLoaded, styleVersion]); // Sync data when style/layers are reloaded

  // ── Sync References Data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current || !references) return;

    const validFeatures: any[] = [];
    for (const ref of references) {
      let geo = resolveGeometry(ref); // uses the same geometry parser since it has .geometry
      if (geo) {
        // if it's GeometryCollection, extract them
        if (geo.type === "GeometryCollection" && geo.geometries) {
          geo.geometries.forEach((g: any, i: number) => {
            validFeatures.push({
              type: "Feature",
              id: `${ref.id}-${i}`,
              geometry: g,
              properties: { ...ref, geometry: undefined }
            });
          });
        } else {
          validFeatures.push({
            type: "Feature",
            id: ref.id,
            geometry: geo,
            properties: { ...ref, geometry: undefined }
          });
        }
      }
    }

    const source = map.current.getSource("references-source") as MapLibreTypes.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: validFeatures,
      } as any);
    }

    // First, remove old preset layers if they exist
    const oldPresets = ["ref-solid", "ref-dashed", "ref-long-dashed", "ref-dotted", "ref-dash-dot"];
    oldPresets.forEach(id => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
    });

    // Maintain a layer for each reference to support dynamic dash arrays
    references.forEach(ref => {
      const layerId = `ref-layer-${ref.id}`;
      
      let parsedDash: number[] | undefined;
      if (ref.dash_array && ref.dash_array.trim() !== "") {
        const parts = ref.dash_array.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
        if (parts.length > 0) parsedDash = parts;
      }

      if (!map.current?.getLayer(layerId)) {
        const paintProps: any = {
          "line-color": ref.color || "#000000",
          "line-width": ref.weight || 2,
        };
        if (parsedDash) paintProps["line-dasharray"] = parsedDash;

        map.current?.addLayer({
          id: layerId,
          type: "line",
          source: "references-source",
          filter: ["==", ["get", "id"], ref.id],
          paint: paintProps
        });
      } else {
        // Update properties if layer exists (for realtime preview)
        map.current.setPaintProperty(layerId, "line-color", ref.color || "#000000");
        map.current.setPaintProperty(layerId, "line-width", ref.weight || 2);
        if (parsedDash) {
          map.current.setPaintProperty(layerId, "line-dasharray", parsedDash);
        } else {
          // MapLibre requires setting to something valid or we need a trick
          map.current.setPaintProperty(layerId, "line-dasharray", [100000, 0]); 
        }
      }
    });

    // Cleanup layers for deleted references
    const currentRefIds = new Set(references.map(r => `ref-layer-${r.id}`));
    map.current.getStyle()?.layers?.forEach(layer => {
      if (layer.id.startsWith('ref-layer-') && !currentRefIds.has(layer.id)) {
        map.current?.removeLayer(layer.id);
      }
    });
  }, [references, mapLoaded, styleVersion]);

  // ── Sync fill/line style live ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (map.current.getLayer("areas-fill")) {
      map.current.setPaintProperty("areas-fill", "fill-opacity", [
        "case", ["boolean", ["feature-state", "selected"], false], Math.min(fillOpacity + 0.25, 1), fillOpacity,
      ]);
    }
    map.current.getStyle()?.layers?.forEach(layer => {
      if (layer.id.startsWith("areas-outline-")) {
        map.current?.setPaintProperty(layer.id, "line-width", [
          "case", ["boolean", ["feature-state", "selected"], false], ["+", ["get", "stroke_weight"], 2], ["get", "stroke_weight"],
        ]);
      }
    });
  }, [fillOpacity, lineWidth, mapLoaded]);

  // ── Sync selected feature state ───────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    areas.forEach(a => {
      map.current?.setFeatureState(
        { source: "areas-source", id: a.id }, { selected: a.id === selectedAreaId }
      );
    });
  }, [selectedAreaId, areas, mapLoaded]);

  // ── Tool mode: cursor + canvas clear ─────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = toolMode === "pen" ? "crosshair" : "";
    if (toolMode !== "pen") {
      penPointsRef.current = [];
      mousePosRef.current = null;
      setPenPoints([]);
      setIsNearStart(false);
      isNearStartRef.current = false;
      clearPenCanvas();
    }
  }, [toolMode, clearPenCanvas]);

  // ── Vertex editing helpers ────────────────────────────────────────────────
  const startEditVertices = useCallback((areaId: string) => {
    const area = areasRef.current.find(a => a.id === areaId);
    if (!area) return;
    const geo = resolveGeometry(area);
    if (!geo) return;
    editingAreaIdRef.current = areaId;
    editGeometryRef.current = geo;
    setEditingAreaId(areaId);
    setEditSource(geo);
  }, [setEditSource]);

  const stopEditVertices = useCallback(() => {
    editingAreaIdRef.current = null;
    editGeometryRef.current = null;
    setEditingAreaId(null);
    setEditSource(null);
  }, [setEditSource]);

  const saveEditVertices = useCallback(() => {
    if (editingAreaIdRef.current && editGeometryRef.current) {
      onAreaUpdateRef.current?.(editingAreaIdRef.current, editGeometryRef.current);
    }
    stopEditVertices();
  }, [stopEditVertices]);

  useEffect(() => {
    (window as any).__mapEditVertices = startEditVertices;
    (window as any).__mapStopEdit = stopEditVertices;
    return () => { delete (window as any).__mapEditVertices; delete (window as any).__mapStopEdit; };
  }, [startEditVertices, stopEditVertices]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      <MapSearchBox onConvert={onAreaCreate} />
      <MapStyleToggle />
      {/* Map GL canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Pen overlay canvas — sits on top of MapLibre, pointer-events none so clicks pass through */}
      <canvas
        ref={overlayCanvas}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
      />

      {/* ── Floating Toolbar ── */}
      {!readOnly && (
        <div className="absolute top-20 md:top-4 left-4 z-10 flex flex-col gap-1.5">
          {/* Select */}
          <button
            title="Select Tool"
            onClick={() => { setToolMode("select"); stopEditVertices(); }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border text-sm transition-all
              ${toolMode === "select" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 0 20 12.279 13.611 14.164 17.855 20.507 16.011 21.737 11.767 15.394 7 19z"/>
            </svg>
          </button>

          {/* Magnet Mode */}
          <button
            title="Magnet Mode (Snap to Roads) - Automatically snaps your pen to nearest roads/boundaries"
            onClick={() => setIsMagnetMode(!isMagnetMode)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all ${
              isMagnetMode ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/>
              <path d="m5 8 4 4"/><path d="m12 15 4 4"/>
            </svg>
          </button>

          
          {/* Blob Tool */}
          <button
            title="Brush Tool (Arsir) - Click and drag to draw continuously"
            onClick={() => setToolMode(toolMode === "blob" ? "select" : "blob")}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              ${toolMode === "blob" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>
          </button>

          {/* Pen */}
          <button
            title="Pen Tool — Click to add anchor points, click first point to close"
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
              <button
                title="Undo Last Point (or right-click)"
                onClick={() => {
                  const pts = penPointsRef.current.slice(0, -1);
                  penPointsRef.current = pts;
                  setPenPoints([...pts]);
                  drawPenCanvas();
                }}
                disabled={penPoints.length === 0}
                className="w-9 h-9 flex items-center justify-center rounded-lg shadow-md border bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-30 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
                </svg>
              </button>

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

          {/* Toggle Fill Settings */}
          {toolMode === "select" && !editingAreaId && (
            <button
              title={fillOpacity > 0 ? "Hide Area Fill" : "Show Area Fill"}
              onClick={() => setFillOpacity(fillOpacity > 0 ? 0 : 0.25)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all mt-0.5
                ${fillOpacity > 0 ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={fillOpacity > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 22h20L12 2z"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Editing Toolbar */}
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

      
        {/* EDIT TOOLBAR (Shown only when an area is selected) */}
        {selectedAreaId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden z-20">
            <button
              title="Move Vertex"
              onClick={() => setEditMode("move")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${editMode === "move" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M9 19l3 3 3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
              Move
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              title="Add Vertex"
              onClick={() => setEditMode("add")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${editMode === "add" ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              title="Delete Vertex"
              onClick={() => setEditMode("delete")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${editMode === "delete" ? "bg-red-100 text-red-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
              Delete
            </button>
          </div>
        )}

        
        {/* EDIT TOOLBAR (Shown only when an area is selected) */}
        {selectedAreaId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden z-20">
            <button
              title="Move Vertex"
              onClick={() => setEditMode("move")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${editMode === "move" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M9 19l3 3 3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
              Move
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              title="Add Vertex"
              onClick={() => setEditMode("add")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${editMode === "add" ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              title="Delete Vertex"
              onClick={() => setEditMode("delete")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${editMode === "delete" ? "bg-red-100 text-red-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
              Delete
            </button>
          </div>
        )}

        {/* Status bar */}
      {toolMode === "pen" && (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2.5 pointer-events-none select-none
          ${isNearStart && penPoints.length >= 3 ? "bg-emerald-600" : "bg-indigo-700"}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {penPoints.length === 0
            ? "Click anywhere on the map to place the first anchor point"
            : penPoints.length < 3
            ? `${penPoints.length} point${penPoints.length > 1 ? "s" : ""} — need at least 3 · Right-click to undo`
            : isNearStart
            ? "Click to close the polygon ✓"
            : `${penPoints.length} points · Click first point (indigo) to close · Right-click to undo`}
        </div>
      )}

      {editingAreaId && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2.5 pointer-events-none whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Drag handles to move • Click line to add • Right-click handle to delete
        </div>
      )}
    </div>
  );
}
