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
  fitBounds: (bounds: [[number, number], [number, number]], customPadding?: any) => void;
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
  
  fitBounds: (bounds, customPadding) => {
    const { map } = get();
    if (map) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      let bottomPadding = 50;
      
      if (isMobile) {
        const mapHeight = map.getContainer().clientHeight;
        const screenHeight = window.innerHeight;
        // If map takes up most of the screen, assume there's an overlay (like Dashboard)
        // If it's much smaller (like Public View split screen), don't add huge padding
        if (mapHeight > screenHeight * 0.8) {
          bottomPadding = screenHeight * 0.40;
        }
      }

      const defaultPadding = isMobile 
        ? { top: 50, bottom: bottomPadding, left: 50, right: 50 } 
        : { top: 50, bottom: 50, left: 50, right: 50 };
      
      map.fitBounds(bounds, { padding: customPadding || defaultPadding, duration: 1000 });
    }
  },
}));
