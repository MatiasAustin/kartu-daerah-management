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
        osm: {
          type: "raster",
          tiles: [
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap contributors"
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
          id: "osm",
          type: "raster",
          source: "osm",
          minzoom: 0,
          maxzoom: 22
        },
        {
          id: "print-area-fill",
          type: "fill",
          source: "print-area-source",
          paint: {
            "fill-color": area.color || group?.color || "#ef4444",
            "fill-opacity": 0
          }
        },
        {
          id: "print-area-outline",
          type: "line",
          source: "print-area-source",
          paint: (() => {
            const dash = area.dash_array || group?.dash_array || "solid";
            const paintProps: any = {
              "line-color": area.color || group?.color || "#ef4444",
              "line-width": area.stroke_weight ?? group?.stroke_weight ?? 3
            };
            if (dash !== "solid") {
              paintProps["line-dasharray"] = dash.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
            }
            return paintProps;
          })()
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
    <div className="min-h-[100dvh] bg-slate-100 pt-4 pb-32 sm:py-8 flex flex-col items-center justify-start overflow-x-hidden print:bg-white print:p-0 print:block">
      
      {/* Global Print Styles for A5 */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A5;
            margin: 0;
          }
        }
      `}} />

      {/* A5 Card Container Wrapper for Screen Scaling */}
      <div className="w-full flex justify-center origin-top transform scale-[0.78] sm:scale-100 transition-transform print:scale-100 print:transform-none -mb-[46mm] sm:mb-0">
        
        {/* A5 physical size is 148mm x 210mm */}
        <div 
          className="bg-white text-black flex flex-col relative shadow-2xl print:shadow-none overflow-hidden border border-slate-200 print:border-none shrink-0"
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
      </div>
      
      {/* Action Bar (Responsive flow on screen, Hidden on print) */}
      <div className="w-full max-w-[148mm] px-2 sm:px-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-6 sm:mt-8 print:hidden z-50">
        
        <div className="flex flex-col gap-3 w-full sm:max-w-[220px]">
          {/* Assignment Status Badge */}
          {area.publisher_name ? (
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-2.5 shadow-sm">
              <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-600 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div className="text-xs text-emerald-800 leading-tight">
                <span className="opacity-75">Assigned to:</span> <br/>
                <strong className="font-semibold text-[13px]">{area.publisher_name}</strong>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-center gap-2.5 shadow-sm">
              <div className="bg-amber-100 p-1.5 rounded-md text-amber-500 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="text-xs text-amber-800 font-medium">Unassigned Area</div>
            </div>
          )}

          {/* Printing Tips */}
          <div className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 text-sm">
            <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-slate-400" />
              Printing Tips
            </h4>
            <ul className="text-slate-600 space-y-1 text-xs list-disc pl-4">
              <li>Set Paper Size to <strong>A5</strong></li>
              <li>Set Margins to <strong>None</strong></li>
              <li>Check <strong>Background graphics</strong></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
          <button
            onClick={() => {
              const url = `${window.location.origin}/view/area/${area.id}`;
              navigator.clipboard.writeText(url);
              alert("Public link copied to clipboard!");
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-900 transition-colors font-medium w-full"
          >
            Copy Share Link
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-colors font-medium w-full"
          >
            <Printer className="w-4 h-4" />
            Print / Export PDF
          </button>
        </div>
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
