import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Map as MapLibreMap } from "maplibre-gl";

interface MapState {
  map: MapLibreMap | null;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  drawMode: "simple_select" | "draw_polygon";
  mapStyle: "clean" | "detailed";
  mapProvider: "existing" | "maptiler";
  maptilerKey: string | null;
  maptilerStyle: string;
  
  setMap: (map: MapLibreMap) => void;
  setSelectedAreaId: (id: string | null) => void;
  setHoveredAreaId: (id: string | null) => void;
  setDrawMode: (mode: "simple_select" | "draw_polygon") => void;
  toggleMapStyle: () => void;
  setMapProvider: (provider: "existing" | "maptiler") => void;
  setMaptilerConfig: (key: string | null, style: string) => void;
  flyToArea: (lng: number, lat: number, zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]], customPadding?: any) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set, get) => ({
      map: null,
      selectedAreaId: null,
      hoveredAreaId: null,
      drawMode: "simple_select",
      mapStyle: "clean",
      mapProvider: "existing",
      maptilerKey: null,
      maptilerStyle: "streets-v2",

      setMap: (map) => set({ map }),
      setSelectedAreaId: (id) => set({ selectedAreaId: id }),
      setHoveredAreaId: (id) => set({ hoveredAreaId: id }),
      setDrawMode: (mode) => set({ drawMode: mode }),
      toggleMapStyle: () => set((state) => {
        if (state.mapProvider === "maptiler") {
          const maptilerStyles = ["streets-v2", "satellite", "basic-v2", "outdoor-v2", "hybrid"];
          const currentIndex = maptilerStyles.indexOf(state.maptilerStyle);
          const nextIndex = (currentIndex + 1) % maptilerStyles.length;
          return { maptilerStyle: maptilerStyles[nextIndex] };
        } else {
          return { mapStyle: state.mapStyle === "clean" ? "detailed" : "clean" };
        }
      }),
      setMapProvider: (provider) => set({ mapProvider: provider }),
      setMaptilerConfig: (key, style) => set({ maptilerKey: key, maptilerStyle: style }),
      
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
    }),
    {
      name: 'map-settings-storage',
      partialize: (state) => ({ 
        mapStyle: state.mapStyle,
        mapProvider: state.mapProvider,
        maptilerKey: state.maptilerKey,
        maptilerStyle: state.maptilerStyle
      }),
    }
  )
);
