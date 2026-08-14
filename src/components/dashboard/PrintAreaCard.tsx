"use client";

import React, { useRef, useEffect, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl-csp-worker.js");
}

import { QRCodeSVG } from "qrcode.react";
import { Printer, Navigation } from "lucide-react";

interface PrintAreaCardProps {
  project: any;
  group: any;
  area: any;
  isPublicView?: boolean;
}

export function PrintAreaCard({ project, group, area, isPublicView = false }: PrintAreaCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
      center: center as [number, number],
      zoom: 14,
      interactive: false,
      preserveDrawingBuffer: true,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [area.center_lng, area.center_lat]);

  // Second effect to handle source, layers, and fitting bounds once map is loaded
  useEffect(() => {
    if (!mapLoaded || !map.current || !area.geometry) return;
    const m = map.current;
    const sourceId = "print-area-source";

    if (!m.getSource(sourceId)) {
      m.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: area.geometry,
            properties: {}
          }]
        } as any,
      });

      m.addLayer({
        id: "print-area-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": group.color || "#ef4444",
          "fill-opacity": 0.4
        },
      });

      m.addLayer({
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
          m.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]], 
            { padding: 50, duration: 0 } // No animation for print
          );
        }
      }
    }
  }, [mapLoaded, area, group]);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center justify-center print:bg-white print:p-0">
      
      {/* Floating Action Bar (Hidden on print) */}
      <div className="fixed top-6 right-6 flex flex-col items-end gap-3 print:hidden z-50">
        <button
          onClick={() => {
            const url = `${window.location.origin}/view/area/${area.id}`;
            navigator.clipboard.writeText(url);
            alert("Public link copied to clipboard!");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-900 transition-colors font-medium"
        >
          Copy Share Link
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Printer className="w-4 h-4" />
          Print / Export PDF
        </button>
      </div>

      {/* A5 Card Container */}
      {/* A5 physical size is 148mm x 210mm */}
      <div 
        className="bg-white text-black flex flex-col relative shadow-2xl print:shadow-none mx-auto overflow-hidden border border-slate-200 print:border-none"
        style={{
          width: "148mm",
          height: "210mm",
          padding: "12mm", // Standard print margin
        }}
      >
        
        {/* Header */}
        <header className="border-b-[3px] border-black pb-3 mb-4 flex justify-between items-end shrink-0">
          <div className="flex-1 pr-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-0.5">{project.name}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-black leading-tight line-clamp-2">{group.name}</h1>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Area No.</p>
            <h2 className="text-2xl font-black text-black bg-slate-100 border border-slate-300 px-3 py-1 rounded-md print:bg-white print:border-2 print:border-black">
              {area.area_number}
            </h2>
          </div>
        </header>

        {/* Main Body */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          
          <div className="shrink-0">
            <h3 className="text-xl font-bold text-black mb-1.5 leading-snug">{area.name}</h3>
            {area.description && (
              <p className="text-black text-xs border-l-[3px] border-slate-300 pl-2 line-clamp-2">
                {area.description}
              </p>
            )}
          </div>

          {/* Map Container */}
          <div className="flex-1 relative w-full border-[3px] border-black rounded-lg overflow-hidden bg-slate-50 shadow-inner print:shadow-none min-h-[50%]">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
          </div>

        </div>

        {/* Footer / QR Code */}
        <footer className="mt-4 pt-3 border-t-[3px] border-black flex justify-between items-center shrink-0">
          <div className="space-y-1 flex-1 pr-4">
            <h4 className="font-bold text-black text-sm uppercase tracking-wide">Navigation Directions</h4>
            <p className="text-[10px] text-slate-600 leading-tight max-w-[200px]">Scan this QR code using your smartphone camera to open Google Maps navigation directly to this area.</p>
            <p className="text-[9px] text-slate-500 font-mono mt-1 font-semibold">Coords: {area.center_lat?.toFixed(5)}, {area.center_lng?.toFixed(5)}</p>
            
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-semibold print:hidden border border-indigo-200 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              Get Directions
            </a>
          </div>
          <div className="shrink-0 bg-white p-1.5 border-2 border-black rounded-xl">
            <QRCodeSVG value={googleMapsUrl} size={76} level="H" />
          </div>
        </footer>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
