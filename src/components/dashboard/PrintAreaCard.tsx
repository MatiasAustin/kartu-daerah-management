"use client";

import React, { useRef, useEffect, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@6.3.0/dist/maplibre-gl-worker.mjs");
}

import { QRCodeSVG } from "qrcode.react";
import { Printer, Navigation } from "lucide-react";

// ─── EWKB decoder ────────────────────────────────────────────────────────────
function ewkbHexToGeoJSON(hex: string): any | null {
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    const byteOrder = view.getUint8(offset++);
    const le = byteOrder === 1;
    const readUint32 = () => { const v = view.getUint32(offset, le); offset += 4; return v; };
    const readFloat64 = () => { const v = view.getFloat64(offset, le); offset += 8; return v; };
    let wkbType = readUint32();
    const hasZ = (wkbType & 0x80000000) !== 0;
    const hasM = (wkbType & 0x40000000) !== 0;
    const hasSRID = (wkbType & 0x20000000) !== 0;
    wkbType = wkbType & 0x0fffffff;
    if (hasSRID) readUint32();
    const readPoint = (): [number, number] => {
      const x = readFloat64(); const y = readFloat64();
      if (hasZ) readFloat64(); if (hasM) readFloat64();
      return [x, y];
    };
    const readRing = (): [number, number][] => {
      const count = readUint32(); const pts: [number, number][] = [];
      for (let i = 0; i < count; i++) pts.push(readPoint());
      return pts;
    };
    if (wkbType === 1) return { type: "Point", coordinates: readPoint() };
    else if (wkbType === 2) {
      const count = readUint32(); const pts: [number, number][] = [];
      for (let i = 0; i < count; i++) pts.push(readPoint());
      return { type: "LineString", coordinates: pts };
    } else if (wkbType === 3) {
      const numRings = readUint32(); const rings: [number, number][][] = [];
      for (let i = 0; i < numRings; i++) rings.push(readRing());
      return { type: "Polygon", coordinates: rings };
    } else if (wkbType === 6) {
      const numGeoms = readUint32(); const polys: [number, number][][][] = [];
      for (let i = 0; i < numGeoms; i++) {
        offset++; let subType = readUint32();
        if ((subType & 0x20000000) !== 0) readUint32();
        subType = subType & 0x0fffffff;
        const numRings = readUint32(); const rings: [number, number][][] = [];
        for (let j = 0; j < numRings; j++) rings.push(readRing());
        polys.push(rings);
      }
      return { type: "MultiPolygon", coordinates: polys };
    }
    return null;
  } catch { return null; }
}

function resolveGeometry(area: any): any | null {
  let geo = area.geojson ?? area.geometry;
  if (!geo) return null;
  if (typeof geo === "object" && geo !== null && geo.type) {
    if (geo.crs) { const { crs, ...rest } = geo; return rest; }
    return geo;
  }
  if (typeof geo === "string" && geo.trimStart().startsWith("{")) {
    try { 
      const parsed = JSON.parse(geo); 
      if (parsed.crs) { const { crs, ...rest } = parsed; return rest; }
      return parsed;
    } catch { return null; }
  }
  if (typeof geo === "string" && /^[0-9a-fA-F]+$/.test(geo)) return ewkbHexToGeoJSON(geo);
  return null;
}

interface PrintAreaCardProps {
  project: any;
  group: any;
  area: any;
  isPublicView?: boolean;
}

export function PrintAreaCard({ project, group, area, isPublicView = false }: PrintAreaCardProps) {
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

    const geo = resolveGeometry(area);

    const printStyle = {
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
        },
        "print-area-source": {
          type: "geojson",
          data: geo ? {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: geo,
              properties: {}
            }]
          } : { type: "FeatureCollection", features: [] }
        }
      },
      layers: [
        {
          id: "carto",
          type: "raster",
          source: "carto",
          minzoom: 0,
          maxzoom: 22
        },
        {
          id: "print-area-fill",
          type: "fill",
          source: "print-area-source",
          paint: {
            "fill-color": group?.color || "#ef4444",
            "fill-opacity": 0.4
          }
        },
        {
          id: "print-area-outline",
          type: "line",
          source: "print-area-source",
          paint: {
            "line-color": group?.color || "#ef4444",
            "line-width": 3
          }
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: printStyle as any,
      center: center as [number, number],
      zoom: 14,
      preserveDrawingBuffer: true,
    } as any);

    const m = map.current;
    m.scrollZoom.disable();
    m.boxZoom.disable();
    m.dragRotate.disable();
    m.dragPan.disable();
    m.keyboard.disable();
    m.doubleClickZoom.disable();
    m.touchZoomRotate.disable();

    map.current.on("load", () => {
      const currentMap = map.current;
      if (!currentMap || !geo) return;

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

      if (geo.coordinates) {
        extractCoords(geo.coordinates);
        if (minLng < maxLng && minLat < maxLat) {
          currentMap.fitBounds(
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
