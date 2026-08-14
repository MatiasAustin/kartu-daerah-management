"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useMapStore } from "@/lib/store/mapStore";

interface MapContainerProps {
  areas: any[];
  activeGroupId?: string | null;
  onAreaCreate?: (feature: any) => void;
  onAreaUpdate?: (feature: any) => void;
  onAreaDelete?: (featureId: string) => void;
  readOnly?: boolean;
}

const RASTER_STYLE = {
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
  layers: [
    {
      id: "carto",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
} as any;

// Draw mode type
type DrawMode = "idle" | "draw_polygon" | "simple_select" | "direct_select";

export function MapContainer({
  areas,
  activeGroupId,
  onAreaCreate,
  onAreaUpdate,
  onAreaDelete,
  readOnly = false,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const { setMap, setSelectedAreaId, selectedAreaId } = useMapStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Toolbar state
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [fillOpacity, setFillOpacity] = useState(0.3);
  const [lineWidth, setLineWidth] = useState(2);
  const [showStylePanel, setShowStylePanel] = useState(false);

  // ─── Init Map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: RASTER_STYLE,
      center: [106.8272, -6.1751],
      zoom: 11,
    });

    // Navigation + Geolocate
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      } as any),
      "top-right"
    );

    // Draw control (hidden native buttons — we render our own toolbar)
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: "simple_select",
    });
    map.current.addControl(draw.current as any, "top-left");

    map.current.on("load", () => {
      setMapLoaded(true);
      if (map.current) setMap(map.current);

      // Wire draw events after load
      map.current!.on("draw.create" as any, (e: any) => {
        if (onAreaCreate) onAreaCreate(e.features[0]);
        // Return to select mode after drawing
        draw.current?.changeMode("simple_select");
        setDrawMode("idle");
      });
      map.current!.on("draw.update" as any, (e: any) => {
        if (onAreaUpdate) onAreaUpdate(e.features[0]);
      });
      map.current!.on("draw.delete" as any, (e: any) => {
        if (onAreaDelete && e.features?.[0]) onAreaDelete(e.features[0].id);
      });
      map.current!.on("draw.modechange" as any, (e: any) => {
        setDrawMode(e.mode as DrawMode);
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync Areas GeoJSON ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const sourceId = "areas-source";
    const geojson = {
      type: "FeatureCollection",
      features: areas
        .filter((a) => a.geometry)
        .map((area) => ({
          type: "Feature",
          id: area.id,
          geometry: area.geometry,
          properties: {
            ...area,
            color: area.groups?.color || "#ef4444",
            lineWidth: area.line_width ?? lineWidth,
          },
        })),
    };

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson as any);
    } else {
      map.current.addSource(sourceId, { type: "geojson", data: geojson as any });

      // Fill layer
      map.current.addLayer({
        id: "areas-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            Math.min(fillOpacity + 0.25, 1),
            fillOpacity,
          ],
        },
      });

      // Outline layer
      map.current.addLayer({
        id: "areas-outline",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            lineWidth + 2,
            lineWidth,
          ],
        },
      });

      // Label layer
      map.current.addLayer({
        id: "areas-label",
        type: "symbol",
        source: sourceId,
        layout: {
          "text-field": ["concat", ["get", "area_number"], " - ", ["get", "name"]],
          "text-size": 11,
          "text-anchor": "center",
          "text-max-width": 10,
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Click to select
      map.current.on("click", "areas-fill", (e) => {
        if (e.features && e.features.length > 0) {
          setSelectedAreaId(e.features[0].id as string);
        }
      });

      // Cursor
      map.current.on("mouseenter", "areas-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "areas-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
    }
  }, [areas, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync fill/line style live ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (map.current.getLayer("areas-fill")) {
      map.current.setPaintProperty("areas-fill", "fill-opacity", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        Math.min(fillOpacity + 0.25, 1),
        fillOpacity,
      ]);
    }
    if (map.current.getLayer("areas-outline")) {
      map.current.setPaintProperty("areas-outline", "line-width", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        lineWidth + 2,
        lineWidth,
      ]);
    }
  }, [fillOpacity, lineWidth, mapLoaded]);

  // ─── Sync selected feature state ────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    areas.forEach((area) => {
      map.current?.setFeatureState(
        { source: "areas-source", id: area.id },
        { selected: area.id === selectedAreaId }
      );
    });
  }, [selectedAreaId, areas, mapLoaded]);

  // ─── Toolbar Handlers ────────────────────────────────────────────────────────
  const handleDrawPolygon = useCallback(() => {
    if (!draw.current) return;
    if (drawMode === "draw_polygon") {
      draw.current.changeMode("simple_select");
      setDrawMode("idle");
    } else {
      draw.current.changeMode("draw_polygon");
      setDrawMode("draw_polygon");
    }
  }, [drawMode]);

  const handleDeleteSelected = useCallback(() => {
    if (!draw.current) return;
    draw.current.trash();
  }, []);

  const handleDirectSelect = useCallback(() => {
    if (!draw.current) return;
    const selected = draw.current.getSelected();
    if (selected.features.length > 0) {
      draw.current.changeMode("direct_select", { featureId: selected.features[0].id as string });
      setDrawMode("direct_select");
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Custom Draw Toolbar — only in edit mode */}
      {!readOnly && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
          {/* Draw polygon */}
          <button
            title={drawMode === "draw_polygon" ? "Cancel Drawing (ESC)" : "Draw Area (Pen Tool)"}
            onClick={handleDrawPolygon}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              ${drawMode === "draw_polygon"
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
          >
            {/* Pen icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
            </svg>
          </button>

          {/* Direct Select (move anchor points) */}
          <button
            title="Move Anchor Points"
            onClick={handleDirectSelect}
            className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
              ${drawMode === "direct_select"
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
          >
            {/* Anchor / node icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="19" cy="12" r="2"/>
              <circle cx="5" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
              <line x1="12" y1="7" x2="12" y2="17"/>
              <line x1="7" y1="12" x2="17" y2="12"/>
            </svg>
          </button>

          {/* Delete selected */}
          <button
            title="Delete Selected Area"
            onClick={handleDeleteSelected}
            className="w-9 h-9 flex items-center justify-center rounded-lg shadow-md border bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>

          {/* Style Settings */}
          <div className="relative mt-1">
            <button
              title="Style Settings"
              onClick={() => setShowStylePanel((p) => !p)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md border transition-all
                ${showStylePanel
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.85 11.07 10 10 0 0 1-8.92 5.5 10 10 0 0 1-8.92-5.5A10 10 0 0 1 4.93 4.93"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>

            {/* Style Panel Popover */}
            {showStylePanel && (
              <div className="absolute left-11 top-0 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-20">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Style Settings</h4>

                {/* Fill Opacity */}
                <div className="mb-4">
                  <label className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Fill Opacity</span>
                    <span className="font-mono text-indigo-600">{Math.round(fillOpacity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={fillOpacity}
                    onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-indigo-600"
                  />
                </div>

                {/* Line Weight */}
                <div className="mb-3">
                  <label className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Border Weight</span>
                    <span className="font-mono text-indigo-600">{lineWidth}px</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.5}
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-indigo-600"
                  />
                </div>

                <p className="text-[10px] text-slate-400 mt-2">Colors are set per Group in the sidebar.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draw mode hint bar */}
      {drawMode === "draw_polygon" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-700 text-white text-xs px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2 pointer-events-none">
          <span className="animate-pulse w-2 h-2 bg-white rounded-full" />
          Click to place points · Double-click to finish · ESC to cancel
        </div>
      )}
      {drawMode === "direct_select" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-2 pointer-events-none">
          <span className="animate-pulse w-2 h-2 bg-white rounded-full" />
          Drag anchor points to reposition · Click outside to deselect
        </div>
      )}
    </div>
  );
}
