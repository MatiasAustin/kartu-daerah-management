"use client";

import { useState } from "react";
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as shp from "shpjs";

export function BoundaryImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  };

  const processGeoJSON = async (geojson: any) => {
    if (!geojson.features || !Array.isArray(geojson.features)) {
      throw new Error("Invalid GeoJSON: Missing features array");
    }

    let successCount = 0;
    
    // Batch processing to avoid overloading the browser
    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];
      if (!feature.geometry) continue;

      const name = feature.properties?.name || feature.properties?.NAME_3 || feature.properties?.NAMOBJ || `Boundary ${i+1}`;
      const level = feature.properties?.level || feature.properties?.TYPE_3 || "Area";

      const { error } = await supabase.rpc('insert_boundary_geojson', {
        p_name: name,
        p_level: level,
        p_geojson: feature.geometry
      });

      if (!error) {
        successCount++;
      } else {
        console.error("Error inserting feature", name, error);
      }
    }

    return successCount;
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      let geojson: any;

      if (file.name.toLowerCase().endsWith(".zip")) {
        const buffer = await file.arrayBuffer();
        geojson = await shp.parseZip(buffer);
        
        // shpjs might return an array of FeatureCollections if the zip contains multiple shapefiles
        if (Array.isArray(geojson)) {
          // Flatten into a single FeatureCollection
          geojson = {
            type: "FeatureCollection",
            features: geojson.flatMap((g: any) => g.features || [])
          };
        }
      } else {
        const text = await file.text();
        geojson = JSON.parse(text);
      }
      
      if (geojson.type !== "FeatureCollection") {
        throw new Error("Only FeatureCollection GeoJSON or valid Shapefile ZIPs are supported.");
      }

      const count = await processGeoJSON(geojson);
      
      setStatus("success");
      setMessage(`Successfully imported ${count} boundaries.`);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to process file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Import Geo Boundaries</h3>
        <p className="text-sm text-slate-500">
          Upload a GeoJSON file (.geojson) or a zipped Shapefile (.zip) containing administrative boundaries.
          These boundaries will be saved to the database and can be searched and converted to Area Markings.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-4">
            <FileJson className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-medium text-slate-900 mb-1">Select GeoJSON or ZIP File</h4>
          <p className="text-xs text-slate-500 mb-2 max-w-xs">
            Upload a .geojson file or a .zip file containing ESRI Shapefiles (.shp, .shx, .dbf, .prj).
          </p>
          <div className="bg-amber-50 text-amber-700 text-[10px] p-2 rounded border border-amber-200 mb-6 max-w-xs text-left">
            <strong>Note:</strong> Very large files (e.g., &gt; 100MB Shapefiles) may crash your browser or take a long time to process. Consider splitting large datasets.
          </div>
          
          <input 
            type="file" 
            id="file-upload" 
            accept=".geojson,.zip,application/geo+json,application/json,application/zip" 
            className="hidden" 
            onChange={handleFileChange}
          />
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Browse Files
          </label>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileJson className="w-5 h-5 text-indigo-500 shrink-0" />
              <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
              <span className="text-xs text-slate-500 shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <button 
              onClick={handleUpload}
              disabled={loading}
              className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="w-4 h-4" /> Import Data</>
              )}
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-start gap-3 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{message}</div>
          </div>
        )}
        
        {status === "error" && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
