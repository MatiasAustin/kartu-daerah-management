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
    <div 
      className="absolute top-[170px] right-[24px] z-[9] flex items-center shadow-md rounded-[6px] bg-white"
      style={{ transform: "scale(1.35)", transformOrigin: "center center" }}
    >
      <button
        onClick={() => {
          toggleMapStyle();
          setShowTooltip(false);
        }}
        className="p-1.5 rounded-[6px] hover:bg-slate-50 transition-colors flex items-center justify-center relative w-[29px] h-[29px]"
        title="Ganti Tampilan Peta"
      >
        <Layers className={`w-[15px] h-[15px] ${mapStyle === "detailed" ? "text-indigo-600" : "text-slate-700"}`} strokeWidth={2.5} />
        
        {/* Animated Pop-up Tooltip */}
        {showTooltip && (
          <div 
            className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-sm animate-out fade-out duration-1000 delay-[4000ms] fill-mode-forwards"
            style={{ transform: "translateY(-50%) scale(0.74)" /* Counter-scale the tooltip text so it doesn't become huge */, transformOrigin: "right center" }}
          >
            Ganti Tampilan Peta
            {/* Triangle pointing right */}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-indigo-600"></div>
          </div>
        )}
      </button>
    </div>
  );
}
