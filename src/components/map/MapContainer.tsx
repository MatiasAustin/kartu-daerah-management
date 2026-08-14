"use client";

import React, { useRef, useEffect, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useMapStore } from "@/lib/store/mapStore";

interface MapContainerProps {
  areas: any[]; // We'll type this properly later
  activeGroupId?: string | null;
  onAreaCreate?: (feature: any) => void;
  onAreaUpdate?: (feature: any) => void;
  onAreaDelete?: (featureId: string) => void;
}

export function MapContainer({
  areas,
  activeGroupId,
  onAreaCreate,
  onAreaUpdate,
  onAreaDelete,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const { setMap, setSelectedAreaId, selectedAreaId } = useMapStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const rasterStyle = {
      version: 8,
      sources: {
        carto: {
          type: "raster",
          tiles: [
            "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
        }
      },
      layers: [
        {
          id: "carto",
          type: "raster",
          source: "carto",
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: rasterStyle as any,
      center: [106.8272, -6.1751], // Default Jakarta
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });

    map.current.addControl(draw.current as any, "top-left");

    map.current.on("load", () => {
      setMapLoaded(true);
      if (map.current) setMap(map.current);
      
      // Setup Draw Events
      map.current?.on("draw.create" as any, (e: any) => {
        if (onAreaCreate) onAreaCreate(e.features[0]);
      });
      map.current?.on("draw.update" as any, (e: any) => {
        if (onAreaUpdate) onAreaUpdate(e.features[0]);
      });
      map.current?.on("draw.delete" as any, (e: any) => {
        if (onAreaDelete) onAreaDelete(e.features[0].id);
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update GeoJSON source when areas change
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const sourceId = "areas-source";
    
    // Prepare GeoJSON
    const geojson = {
      type: "FeatureCollection",
      features: areas.map(area => ({
        type: "Feature",
        id: area.id,
        geometry: area.geometry, // Assuming PostGIS returns GeoJSON format when requested properly
        properties: {
          ...area,
          color: area.groups?.color || "#ef4444",
        }
      }))
    };

    if (map.current.getSource(sourceId)) {
      (map.current.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson as any);
    } else {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojson as any,
      });

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
            0.6,
            0.3
          ]
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
            3,
            1
          ]
        }
      });

      // Click event
      map.current.on("click", "areas-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const clickedId = e.features[0].id as string;
          setSelectedAreaId(clickedId);
        }
      });

      // Cursor changes
      map.current.on("mouseenter", "areas-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "areas-fill", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
    }
  }, [areas, mapLoaded]);

  // Handle selected state visually
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    // Reset all selection states first (simplified approach, might need optimization for thousands of polygons)
    areas.forEach(area => {
      map.current?.setFeatureState(
        { source: "areas-source", id: area.id },
        { selected: area.id === selectedAreaId }
      );
    });

  }, [selectedAreaId, areas, mapLoaded]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
