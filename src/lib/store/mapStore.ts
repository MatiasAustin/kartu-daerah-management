import { create } from "zustand";
import type { Map as MapLibreMap } from "maplibre-gl";

interface MapState {
  map: MapLibreMap | null;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  drawMode: "simple_select" | "draw_polygon";
  mapStyle: "clean" | "detailed";
  
  setMap: (map: MapLibreMap) => void;
  setSelectedAreaId: (id: string | null) => void;
  setHoveredAreaId: (id: string | null) => void;
  setDrawMode: (mode: "simple_select" | "draw_polygon") => void;
  toggleMapStyle: () => void;
  flyToArea: (lng: number, lat: number, zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], customPadding?: any) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  selectedAreaId: null,
  hoveredAreaId: null,
  drawMode: "simple_select",
  mapStyle: "clean",

  setMap: (map) => set({ map }),
  setSelectedAreaId: (id) => set({ selectedAreaId: id }),
  setHoveredAreaId: (id) => set({ hoveredAreaId: id }),
  setDrawMode: (mode) => set({ drawMode: mode }),
  toggleMapStyle: () => set((state) => ({ mapStyle: state.mapStyle === "clean" ? "detailed" : "clean" })),
  
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
  
  fitBounds: (bounds, customPadding) => {
    const { map } = get();
    if (map) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const defaultPadding = isMobile 
        ? { top: 30, bottom: 30, left: 30, right: 30 } 
        : { top: 40, bottom: 40, left: 40, right: 40 };
      
      map.fitBounds(bounds, { padding: customPadding || defaultPadding, duration: 1000 });
    }
  },
}));
