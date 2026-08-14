"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "@/lib/store/mapStore";

type ToolMode = "select" | "pen";

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
      // Point
      return { type: "Point", coordinates: readPoint() };
    } else if (wkbType === 2) {
      // LineString
      const count = readUint32();
      const pts: [number, number][] = [];
      for (let i = 0; i < count; i++) pts.push(readPoint());
      return { type: "LineString", coordinates: pts };
    } else if (wkbType === 3) {
      // Polygon
      const numRings = readUint32();
      const rings: [number, number][][] = [];
      for (let i = 0; i < numRings; i++) rings.push(readRing());
      return { type: "Polygon", coordinates: rings };
    } else if (wkbType === 6) {
      // MultiPolygon
      const numGeoms = readUint32();
      const polys: [number, number][][][] = [];
      for (let i = 0; i < numGeoms; i++) {
        // Each geometry starts with its own byte order + type
        offset++; // byteOrder
        let subType = readUint32();
        const subHasSRID = (subType & 0x20000000) !== 0;
        if (subHasSRID) readUint32();
        subType = subType & 0x0fffffff;
        const numRings = readUint32();
        const rings: [number, number][][] = [];
        for (let j = 0; j < numRings; j++) rings.push(readRing());
        polys.push(rings);
      }
      return { type: "MultiPolygon", coordinates: polys };
    }
    return null;
  } catch {
    return null;
  }
}

// Resolve geometry from an area object — handles GeoJSON objects, JSON strings,
// and raw EWKB hex strings returned by PostgREST for PostGIS geometry columns.
function resolveGeometry(area: any): any | null {
  // 1. Try dedicated geojson field first
  let geo = area.geojson ?? area.geometry;
  if (!geo) return null;

  // 2. If it's already an object with a recognised GeoJSON type, use it directly
  if (typeof geo === "object" && geo !== null && geo.type) return geo;

  // 3. JSON-encoded GeoJSON string: starts with '{'
  if (typeof geo === "string" && geo.trimStart().startsWith("{")) {
    try { return JSON.parse(geo); } catch { return null; }
  }

  // 4. EWKB hex string: all hex characters (0-9, a-f, A-F)
  if (typeof geo === "string" && /^[0-9a-fA-F]+$/.test(geo)) {
    return ewkbHexToGeoJSON(geo);
  }

  return null;
}

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
  const overlayCanvas = useRef<HTMLCanvasElement>(null); // ← Canvas overlay for pen tool
  const map = useRef<maplibregl.Map | null>(null);
  const { setMap, setSelectedAreaId, selectedAreaId } = useMapStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  // ── Tool state ──────────────────────────────────────────────────────────────
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const toolModeRef = useRef<ToolMode>("select");
  const [penPoints, setPenPoints] = useState<[number, number][]>([]);
  const penPointsRef = useRef<[number, number][]>([]);
  const mousePosRef = useRef<[number, number] | null>(null);
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

  // ── Callback refs ───────────────────────────────────────────────────────────
  const onAreaCreateRef = useRef(onAreaCreate);
  const onAreaUpdateRef = useRef(onAreaUpdate);
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
      const p = m.project(lnglat as maplibregl.LngLatLike);
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
      (map.current?.getSource("edit-verts") as maplibregl.GeoJSONSource)?.setData({ type: "FeatureCollection", features: [] } as any);
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
    (map.current.getSource("edit-verts") as maplibregl.GeoJSONSource)?.setData({ type: "FeatureCollection", features } as any);
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

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: RASTER_STYLE,
      center: [106.8272, -6.1751],
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    } as any);
    map.current.addControl(geolocate, "top-right");

    map.current.on("load", () => {
      const m = map.current!;
      setMapLoaded(true);
      setMap(m);

      // Auto-trigger geolocation
      setTimeout(() => { try { geolocate.trigger(); } catch {} }, 1000);

      // ── Areas source + layers ─────────────────────────────────────────
      m.addSource("areas-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "areas-fill", type: "fill", source: "areas-source",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 } });
      m.addLayer({ id: "areas-outline", type: "line", source: "areas-source",
        paint: { "line-color": ["get", "color"], "line-width": 2 } });
      m.addLayer({
        id: "areas-label", type: "symbol", source: "areas-source",
        layout: { "text-field": ["concat", ["get", "area_number"], " ", ["get", "name"]],
          "text-size": 11, "text-anchor": "center", "text-max-width": 8 },
        paint: { "text-color": "#1e293b", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      });

      // ── Edit vertex layers ────────────────────────────────────────────
      m.addSource("edit-verts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "edit-ring", type: "line", source: "edit-verts",
        filter: ["==", ["get", "type"], "ring"],
        paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [4, 2] } });
      m.addLayer({ id: "edit-handles", type: "circle", source: "edit-verts",
        filter: ["!=", ["geometry-type"], "LineString"],
        paint: { "circle-radius": 7, "circle-color": "#f59e0b",
          "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });

      // ── Area selection click ──────────────────────────────────────────
      m.on("click", "areas-fill", (e) => {
        if (toolModeRef.current !== "select") return;
        if (e.features?.length) setSelectedAreaId(e.features[0].id as string);
      });
      m.on("mouseenter", "areas-fill", () => {
        if (toolModeRef.current === "select") m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "areas-fill", () => {
        if (toolModeRef.current === "select") m.getCanvas().style.cursor = "";
      });

      // ── Map move: redraw canvas pen ───────────────────────────────────
      m.on("move", () => {
        if (toolModeRef.current === "pen") drawPenCanvas();
      });

      // ── Pen tool: map click ───────────────────────────────────────────
      m.on("click", (e: maplibregl.MapMouseEvent) => {
        if (toolModeRef.current !== "pen") return;
        const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const pts = penPointsRef.current;

        // Snap-to-close
        if (pts.length >= 3) {
          const startPx = m.project(pts[0] as maplibregl.LngLatLike);
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
      m.on("mousemove", (e: maplibregl.MapMouseEvent) => {
        if (toolModeRef.current !== "pen") return;
        mousePosRef.current = [e.lngLat.lng, e.lngLat.lat];
        const pts = penPointsRef.current;

        if (pts.length >= 3) {
          const startPx = m.project(pts[0] as maplibregl.LngLatLike);
          const mPx = m.project(mousePosRef.current as maplibregl.LngLatLike);
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
    const validFeatures: any[] = [];
    for (const a of areas) {
      const geo = resolveGeometry(a);
      if (geo) {
        validFeatures.push({
          type: "Feature",
          id: a.id,
          geometry: geo,
          properties: { ...a, color: a.groups?.color || a.group_color || "#ef4444" },
        });
      }
    }

    (map.current.getSource("areas-source") as maplibregl.GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: validFeatures,
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

  useEffect(() => {
    (window as any).__mapEditVertices = startEditVertices;
    (window as any).__mapStopEdit = stopEditVertices;
    return () => { delete (window as any).__mapEditVertices; delete (window as any).__mapStopEdit; };
  }, [startEditVertices, stopEditVertices]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
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
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
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

          {/* Style Settings */}
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
                <div className="absolute left-11 top-0 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-20" style={{ width: 220 }}>
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Drag the yellow handles to reposition anchor points
        </div>
      )}
    </div>
  );
}
