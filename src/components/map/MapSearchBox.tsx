
"use client";

import { useState, useRef, useEffect } from "react";
import { useMapStore } from "@/lib/store/mapStore";
import { Search, Loader2, X, MapPin } from "lucide-react";

export function MapSearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { map } = useMapStore();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize or update the map layers for the search boundary
  const updateMapBoundary = (feature: any) => {
    if (!map) return;
    
    // Add source if it doesnt exist
    if (!map.getSource("search-boundary")) {
      map.addSource("search-boundary", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      
      map.addLayer({
        id: "search-boundary-fill",
        type: "fill",
        source: "search-boundary",
        filter: ["!=", ["geometry-type"], "Point"],
        paint: {
          "fill-color": "#f43f5e",
          "fill-opacity": 0.15
        }
      });
      
      map.addLayer({
        id: "search-boundary-line",
        type: "line",
        source: "search-boundary",
        filter: ["!=", ["geometry-type"], "Point"],
        paint: {
          "line-color": "#f43f5e",
          "line-width": 3,
          "line-dasharray": [2, 2]
        }
      });

      map.addLayer({
        id: "search-boundary-point",
        type: "circle",
        source: "search-boundary",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#f43f5e",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
    }

    const source = map.getSource("search-boundary") as any;
    if (source) {
      if (feature) {
        source.setData({
          type: "FeatureCollection",
          features: [feature]
        });
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setIsOpen(true);
    try {
      // Fetch from Nominatim
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&polygon_geojson=1&limit=5`);
      const data = await res.json();
      if (data && data.features) {
        setResults(data.features);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    }
    setLoading(false);
  };

  const selectResult = (feature: any) => {
    setIsOpen(false);
    
    // Draw boundary on map
    updateMapBoundary(feature);

    // Zoom to bbox
    if (map && feature.bbox) {
      // Nominatim bbox is [minLon, minLat, maxLon, maxLat] in GeoJSON format
      const [minLon, minLat, maxLon, maxLat] = feature.bbox;
      map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 50, duration: 1000 });
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    updateMapBoundary(null);
  };

  return (
    <div ref={searchRef} className="absolute top-4 left-4 md:left-16 z-20 w-64 md:w-80">
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
                    <div>
                      <div className="text-sm font-medium text-slate-800 line-clamp-1">{r.properties?.name || r.properties?.display_name.split(",")[0]}</div>
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
