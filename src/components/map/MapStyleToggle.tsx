"use client";

import { useMapStore } from "@/lib/store/mapStore";
import { Layers } from "lucide-react";
import { useEffect, useState } from "react";

export function MapStyleToggle() {
  const mapStyle = useMapStore((state) => state.mapStyle);
  const toggleMapStyle = useMapStore((state) => state.toggleMapStyle);
  const [showTooltip, setShowTooltip] = useState(true);

  // Hide the tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute top-[88px] right-[10px] z-[9] flex items-center maplibregl-ctrl-group shadow-md">
      <button
        onClick={() => {
          toggleMapStyle();
          setShowTooltip(false);
        }}
        className="bg-white p-1.5 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center relative w-[29px] h-[29px]"
        title="Ganti Tampilan Peta"
      >
        <Layers className={`w-4 h-4 ${mapStyle === "detailed" ? "text-indigo-600" : "text-slate-700"}`} />
        
        {/* Animated Pop-up Tooltip */}
        {showTooltip && (
          <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-sm animate-out fade-out duration-1000 delay-[4000ms] fill-mode-forwards">
            Ganti Tampilan Peta
            {/* Triangle pointing right */}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-indigo-600"></div>
          </div>
        )}
      </button>
    </div>
  );
}
