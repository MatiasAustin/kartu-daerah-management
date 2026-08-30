"use client";

import { useState, useRef, useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { Search, Loader2, X, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MapSearchBoxProps {
  onConvert?: (feature: any) => void;
}

export function MapSearchBox({ onConvert }: MapSearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  
  const { map } = useMapStore();
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateMapBoundary = (feature: any) => {
    if (!map) return;
    
    if (map.getLayer("search-boundary-point")) map.removeLayer("search-boundary-point");
    if (map.getLayer("search-boundary-line")) map.removeLayer("search-boundary-line");
    if (map.getLayer("search-boundary-fill")) map.removeLayer("search-boundary-fill");
    if (map.getSource("search-boundary")) map.removeSource("search-boundary");

    if (!feature || !feature.geometry) return;

    map.addSource("search-boundary", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [feature]
      }
    });
    
    map.addLayer({
      id: "search-boundary-fill",
      type: "fill",
      source: "search-boundary",
      paint: {
        "fill-color": "#f43f5e",
        "fill-opacity": 0.15
      }
    });
    
    map.addLayer({
      id: "search-boundary-line",
      type: "line",
      source: "search-boundary",
      paint: {
        "line-color": "#f43f5e",
        "line-width": 3,
        "line-dasharray": [3, 3]
      }
    });
    
    if (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint") {
      map.addLayer({
        id: "search-boundary-point",
        type: "circle",
        source: "search-boundary",
        paint: {
          "circle-radius": 8,
          "circle-color": "#f43f5e",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setIsOpen(true);
    try {
      // 1. Search Internal Database (Supabase administrative_boundaries)
      const { data: dbData, error } = await supabase.rpc('search_boundaries', {
        search_query: query,
        search_limit: 5
      });
      
      const internalResults = [];
      if (dbData && !error) {
        internalResults.push(...dbData.map((row: any) => ({
          type: "Feature",
          properties: {
            name: row.name,
            display_name: `${row.name} (${row.level}) - Internal Database`,
            level: row.level
          },
          geometry: JSON.parse(row.geojson),
          source: 'internal'
        })));
      }

      // 2. Search Nominatim OSM
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&polygon_geojson=1&limit=10`);
      const data = await res.json();
      
      const nominatimResults = [];
      if (data && data.features) {
        nominatimResults.push(...data.features);
      }
      
      const combined = [...internalResults, ...nominatimResults];

      const sorted = combined.sort((a: any, b: any) => {
        // Internal db results first
        if (a.source === 'internal' && b.source !== 'internal') return -1;
        if (b.source === 'internal' && a.source !== 'internal') return 1;
        // Then prioritize polygons over points
        const aIsPoly = a.geometry?.type?.includes("Polygon") ? 1 : 0;
        const bIsPoly = b.geometry?.type?.includes("Polygon") ? 1 : 0;
        return bIsPoly - aIsPoly;
      });

      setResults(sorted);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    }
    setLoading(false);
  };

  const selectResult = (feature: any) => {
    setIsOpen(false);
    setSelectedFeature(feature);
    updateMapBoundary(feature);

    if (map) {
      if (feature.bbox) {
        const [minLon, minLat, maxLon, maxLat] = feature.bbox;
        map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 50, duration: 1000 });
      } else {
        // Fallback for internal geometry without precalculated bbox, fly to first coordinate
        const coords = feature.geometry.coordinates;
        if (coords) {
          const firstCoord = feature.geometry.type.includes("Polygon") 
            ? feature.geometry.type === "MultiPolygon" 
              ? coords[0][0][0]
              : coords[0][0]
            : coords;
          if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
            map.flyTo({ center: [firstCoord[0], firstCoord[1]], zoom: 12, essential: true });
          }
        }
      }
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedFeature(null);
    updateMapBoundary(null);
  };

  const handleConvert = () => {
    if (!selectedFeature || !onConvert) return;
    
    // We just pass the geojson geometry to onConvert, which expects a feature-like object.
    // The MapContainer's onAreaCreate expects an object with { type: "Feature", geometry: ... } or raw geometry.
    // Let's pass a clean feature object.
    const newFeature = {
      type: "Feature",
      geometry: selectedFeature.geometry,
      properties: {
        name: selectedFeature.properties?.name || selectedFeature.properties?.display_name?.split(',')[0] || "Imported Boundary"
      }
    };
    
    onConvert(newFeature);
    
    // Clear search after conversion
    clearSearch();
  };

  return (
    <div ref={searchRef} className="absolute top-4 left-[72px] md:left-16 z-20 w-[calc(100vw-120px)] sm:w-64 md:w-80">
      <form onSubmit={handleSearch} className="relative flex items-center bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="pl-3 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Cari desa, kecamatan..."
          className="flex-1 w-full py-2.5 px-3 text-sm focus:outline-none text-slate-800"
        />
        {query && (
          <button type="button" onClick={clearSearch} className="pr-3 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Convert to Area Marking Action */}
      {selectedFeature && selectedFeature.geometry?.type?.includes("Polygon") && onConvert && !isOpen && (
        <div className="mt-2 bg-white rounded-lg shadow-md border border-indigo-200 p-3 flex flex-col gap-2">
          <div className="text-xs text-slate-600 font-medium">
            <span className="text-indigo-600 font-semibold">{selectedFeature.properties?.name || "Selected Boundary"}</span>
          </div>
          <button 
            type="button"
            onClick={handleConvert}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 px-3 rounded flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Convert to Area Marking
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Mencari...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectResult(r)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-800 line-clamp-1">{r.properties?.name || r.properties?.display_name.split(",")[0]}</div>
                        {r.geometry?.type?.includes("Polygon") && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-sm whitespace-nowrap">
                            {r.source === 'internal' ? 'DB Area' : 'Area'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2">{r.properties?.display_name}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query && !loading ? (
            <div className="p-4 text-sm text-center text-slate-500">Tidak ada hasil ditemukan.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
