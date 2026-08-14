import { create } from "zustand";
import type { Map as MapLibreMap } from "maplibre-gl";

interface MapState {
  map: MapLibreMap | null;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  drawMode: "simple_select" | "draw_polygon";
  
  setMap: (map: MapLibreMap) => void;
  setSelectedAreaId: (id: string | null) => void;
  setHoveredAreaId: (id: string | null) => void;
  setDrawMode: (mode: "simple_select" | "draw_polygon") => void;
  flyToArea: (lng: number, lat: number, zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  selectedAreaId: null,
  hoveredAreaId: null,
  drawMode: "simple_select",

  setMap: (map) => set({ map }),
  setSelectedAreaId: (id) => set({ selectedAreaId: id }),
  setHoveredAreaId: (id) => set({ hoveredAreaId: id }),
  setDrawMode: (mode) => set({ drawMode: mode }),
  
  flyToArea: (lng, lat, zoom = 14) => {
    const { map } = get();
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom,
        essential: true,
      });
    }
  },
  
  fitBounds: (bounds) => {
    const { map } = get();
    if (map) {
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  },
}));
