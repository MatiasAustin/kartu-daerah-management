"use client";

import React, { useRef, useEffect, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { QRCodeSVG } from "qrcode.react";

interface PrintAreaCardProps {
  project: any;
  group: any;
  area: any;
}

export function PrintAreaCard({ project, group, area }: PrintAreaCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Generate Google Maps URL using center lat/lng
  const googleMapsUrl = area.center_lat && area.center_lng 
    ? `https://www.google.com/maps/dir/?api=1&destination=${area.center_lat},${area.center_lng}`
    : `https://www.google.com/maps`;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Determine initial center
    const center = area.center_lng && area.center_lat 
      ? [area.center_lng, area.center_lat] 
      : [106.8272, -6.1751];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: center as [number, number],
      zoom: 14,
      interactive: false, // Lock map interaction for print
    });

    map.current.on("load", () => {
      if (!map.current || !area.geometry) return;

      const sourceId = "print-area-source";
      
      const geojson = {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          id: area.id,
          geometry: area.geometry,
          properties: {}
        }]
      };

      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojson as any,
      });

      map.current.addLayer({
        id: "print-area-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": group.color || "#ef4444",
          "fill-opacity": 0.4
        },
      });

      map.current.addLayer({
        id: "print-area-outline",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": group.color || "#ef4444",
          "line-width": 3
        }
      });

      // Calculate Bounding Box to fit map automatically
      let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
      
      const extractCoords = (coords: any[]) => {
        if (typeof coords[0] === 'number') {
          if (coords[0] < minLng) minLng = coords[0];
          if (coords[0] > maxLng) maxLng = coords[0];
          if (coords[1] < minLat) minLat = coords[1];
          if (coords[1] > maxLat) maxLat = coords[1];
        } else {
          coords.forEach(extractCoords);
        }
      };

      if (area.geometry && area.geometry.coordinates) {
        extractCoords(area.geometry.coordinates);
        
        // Fit map bounds if valid bbox was found
        if (minLng < maxLng && minLat < maxLat) {
          map.current.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]], 
            { padding: 50, duration: 0 } // No animation for print
          );
        }
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [area, group]);

  return (
    <div className="w-full h-screen bg-white text-black p-8 flex flex-col mx-auto max-w-4xl print:w-full print:max-w-none print:p-0 print:m-0" style={{ minHeight: '100vh' }}>
      
      {/* Header */}
      <header className="border-b-4 border-slate-900 pb-4 mb-6 print:border-b-4 print:border-black flex justify-between items-end">
        <div>
          <p className="text-sm font-bold tracking-widest uppercase text-slate-500 mb-1">{project.name}</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{group.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Area Number</p>
          <h2 className="text-3xl font-bold text-slate-800 bg-slate-100 px-4 py-1 rounded-md print:bg-white print:border print:border-slate-300">
            {area.area_number}
          </h2>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col gap-6">
        
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{area.name}</h3>
            {area.description && (
              <p className="text-slate-600 max-w-xl text-sm border-l-4 border-slate-200 pl-3">
                {area.description}
              </p>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative w-full rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm print:rounded-none print:shadow-none print:border-4 print:border-slate-900 bg-slate-50" style={{ minHeight: '50vh' }}>
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Footer / QR Code */}
        <footer className="mt-auto pt-6 border-t-2 border-slate-200 flex justify-between items-center print:border-black">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900">Navigation Directions</h4>
            <p className="text-xs text-slate-500">Scan barcode using your smartphone to open Google Maps navigation directly to the center of this area.</p>
            <p className="text-[10px] text-slate-400 font-mono pt-2">Coordinates: {area.center_lat?.toFixed(5)}, {area.center_lng?.toFixed(5)}</p>
          </div>
          <div className="shrink-0 bg-white p-2 border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-black">
            <QRCodeSVG value={googleMapsUrl} size={100} />
          </div>
        </footer>

      </div>
    </div>
  );
}
