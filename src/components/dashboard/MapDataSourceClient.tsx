"use client";

import { useState, useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { createClient } from "@/lib/supabase/client";
import { Map, Layers, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MapDataSourceClient() {
  const { mapProvider, maptilerKey, maptilerStyle, setMapProvider, setMaptilerConfig } = useMapStore();
  const [apiKeys, setApiKeys] = useState<{ id: string; api_key: string; description: string }[]>([]);
  const [selectedKey, setSelectedKey] = useState(maptilerKey || "");
  const [selectedStyle, setSelectedStyle] = useState(maptilerStyle || "streets-v2");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  useEffect(() => {
    setSelectedStyle(maptilerStyle);
  }, [maptilerStyle]);
  const [saveStatus, setSaveStatus] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchKeys() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("api_keys")
        .select("id, api_key, description")
        .eq("user_id", user.id)
        .eq("provider", "maptiler")
        .eq("status", "active");
      
      if (data) {
        setApiKeys(data);
        if (!selectedKey && data.length > 0) {
          setSelectedKey(data[0].api_key);
        }
      }
    }
    fetchKeys();
  }, [supabase, selectedKey]);

  const handleTestConnection = async () => {
    if (!selectedKey) return;
    setTestStatus("testing");
    try {
      const res = await fetch(`https://api.maptiler.com/maps/${selectedStyle}/style.json?key=${selectedKey}`);
      if (res.ok) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch {
      setTestStatus("error");
    }
  };

  const handleSave = () => {
    if (mapProvider === "maptiler") {
      setMaptilerConfig(selectedKey, selectedStyle);
    }
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Map Data Source</h3>
        <p className="text-sm text-slate-500">Choose which provider supplies map data for the application.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Existing Provider Card */}
        <div 
          onClick={() => setMapProvider("existing")}
          className={cn(
            "p-5 border rounded-xl cursor-pointer transition-all",
            mapProvider === "existing" ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" : "border-slate-200 hover:border-indigo-300"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", mapProvider === "existing" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                <Map className="w-5 h-5" />
              </div>
              <h4 className="font-medium text-slate-900">Existing Map Source</h4>
            </div>
            <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", mapProvider === "existing" ? "border-indigo-600 bg-indigo-600" : "border-slate-300")}>
              {mapProvider === "existing" && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-3 pl-11">
            Current configuration using default Carto vector tiles. No API key required.
          </p>
        </div>

        {/* MapTiler Card */}
        <div 
          onClick={() => setMapProvider("maptiler")}
          className={cn(
            "p-5 border rounded-xl cursor-pointer transition-all",
            mapProvider === "maptiler" ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" : "border-slate-200 hover:border-indigo-300"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", mapProvider === "maptiler" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-medium text-slate-900">MapTiler</h4>
            </div>
            <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", mapProvider === "maptiler" ? "border-indigo-600 bg-indigo-600" : "border-slate-300")}>
              {mapProvider === "maptiler" && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-3 pl-11">
            High-performance vector tiles, geocoding and map data from MapTiler Cloud.
          </p>
        </div>
      </div>

      {mapProvider === "maptiler" && (
        <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-6">
          <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-3">MapTiler Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">API Key</label>
              <select 
                value={selectedKey}
                onChange={e => {
                  setSelectedKey(e.target.value);
                  setTestStatus("idle");
                }}
                className="w-full border-slate-300 rounded-md shadow-sm p-2.5 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="" disabled>Select an API Key...</option>
                {apiKeys.map(k => (
                  <option key={k.id} value={k.api_key}>
                    {k.description} (***{k.api_key.slice(-4)})
                  </option>
                ))}
              </select>
              {apiKeys.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No MapTiler keys found. Add one in API Keys tab.</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Map Style</label>
              <select 
                value={selectedStyle}
                onChange={e => {
                  setSelectedStyle(e.target.value);
                  setTestStatus("idle");
                }}
                className="w-full border-slate-300 rounded-md shadow-sm p-2.5 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="streets-v2">Streets</option>
                <option value="basic-v2">Basic</option>
                <option value="outdoor-v2">Outdoor</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4 pt-2">
            <button 
              onClick={handleTestConnection}
              disabled={!selectedKey || testStatus === "testing"}
              className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {testStatus === "testing" ? "Testing..." : "Test Connection"}
            </button>
            
            {testStatus === "success" && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Connection successful</span>}
            {testStatus === "error" && <span className="text-sm text-red-600 font-medium">Connection failed. Check API key.</span>}
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
        <button 
          onClick={handleSave}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          Save Changes
        </button>
        
        {saveStatus && (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 className="w-4 h-4" /> Map data source updated
          </span>
        )}
      </div>
    </div>
  );
}
