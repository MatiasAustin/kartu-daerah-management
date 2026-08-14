"use client";

import { useMapStore } from "@/lib/store/mapStore";
import { Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MapStyleToggle() {
  const mapStyle = useMapStore((state) => state.mapStyle);
  const toggleMapStyle = useMapStore((state) => state.toggleMapStyle);
  const [showTooltip, setShowTooltip] = useState(true);
  const [targetContainer, setTargetContainer] = useState<HTMLElement | null>(null);

  // Hide the tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const map = useMapStore((state) => state.map);

  // Mount a container into MapLibre's top-right control group
  useEffect(() => {
    if (!map) return; // Wait until map is instantiated
    const mountEl = document.querySelector(".maplibregl-ctrl-top-right");
    if (!mountEl) return;

    // Create a wrapper div that mimics a MapLibre control group
    const wrapper = document.createElement("div");
    wrapper.className = "maplibregl-ctrl maplibregl-ctrl-group custom-map-btn-group";
    
    // Insert it before the geolocate control so it sits between Zoom and My Location
    const geolocateGroup = mountEl.querySelector(".maplibregl-ctrl-group:has(.maplibregl-ctrl-geolocate)");
    if (geolocateGroup) {
      mountEl.insertBefore(wrapper, geolocateGroup);
    } else {
      mountEl.appendChild(wrapper);
    }
    
    setTargetContainer(wrapper);

    return () => {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    };
  }, [map]);

  if (!targetContainer) return null;

  return createPortal(
    <button
      onClick={() => {
        toggleMapStyle();
        setShowTooltip(false);
      }}
      className="custom-map-btn p-1.5 hover:bg-slate-50 transition-colors flex items-center justify-center relative w-[29px] h-[29px] bg-white rounded-[6px]"
      title="Change Map Style"
    >
      <Layers className={`w-[16px] h-[16px] ${mapStyle === "detailed" ? "text-indigo-600" : "text-slate-700"}`} strokeWidth={2.5} />
      
      {/* Animated Pop-up Tooltip */}
      {showTooltip && (
        <div 
          className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-sm animate-out fade-out duration-1000 delay-[4000ms] fill-mode-forwards"
          style={{ transform: "translateY(-50%) scale(0.74)", transformOrigin: "right center" }}
        >
          Change Map Style
          {/* Triangle pointing right */}
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-indigo-600"></div>
        </div>
      )}
    </button>,
    targetContainer
  );
}
