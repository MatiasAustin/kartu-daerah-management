"use client";

import { useState } from "react";
import { MapContainer, resolveGeometry } from "@/components/map/MapContainer";
import { useMapStore } from "@/lib/store/mapStore";
import { ChevronDown, ChevronRight, MapPin, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PublicWorkspaceProps {
  project: any;
  groups: any[];
  areas: any[];
  isGroupShare: boolean;
}

export function PublicWorkspace({ project, groups, areas, isGroupShare }: PublicWorkspaceProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { setSelectedAreaId, selectedAreaId, flyToArea } = useMapStore();

  const handleAreaClick = (area: any) => {
    setSelectedAreaId(area.id);
    
    const geo = resolveGeometry(area);
    if (geo) {
      let minX = 180, maxX = -180, minY = 90, maxY = -90;
      let hasValidCoords = false;
      const extract = (coords: any[]) => {
        if (typeof coords[0] === 'number') {
          hasValidCoords = true;
          if (coords[0] < minX) minX = coords[0];
          if (coords[0] > maxX) maxX = coords[0];
          if (coords[1] < minY) minY = coords[1];
          if (coords[1] > maxY) maxY = coords[1];
        } else if (Array.isArray(coords)) {
          coords.forEach(extract);
        }
      };
      
      const extractFromGeometry = (geometry: any) => {
        if (geometry.type === 'GeometryCollection') {
          geometry.geometries.forEach(extractFromGeometry);
        } else if (geometry.coordinates) {
          extract(geometry.coordinates);
        }
      };
      
      extractFromGeometry(geo);

      if (hasValidCoords && minX < maxX && minY < maxY) {
        useMapStore.getState().fitBounds([[minX, minY], [maxX, maxY]]);
        return;
      }
    }

    if (area.center_lng && area.center_lat) {
      flyToArea(area.center_lng, area.center_lat, 16);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId] // if undefined, becomes true
    }));
  };

  // Group areas
  const areasByGroup: Record<string, any[]> = {};
  areas.forEach(a => {
    if (!areasByGroup[a.group_id]) areasByGroup[a.group_id] = [];
    areasByGroup[a.group_id].push(a);
  });

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 relative overflow-hidden">
      {/* List Panel - bottom on mobile, left on desktop */}
      <div className="order-2 md:order-1 flex-shrink-0 bg-white border-t md:border-t-0 md:border-r border-slate-200 
                      h-[40vh] md:h-full w-full md:w-80 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none z-20">
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1">Daftar Area</h2>
          <p className="text-xs text-slate-500">Pilih area dari daftar untuk melihat lokasinya di peta.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {isGroupShare ? (
            // Flat list for Group Share
            <div className="space-y-1">
              {areas.length === 0 && <p className="text-sm text-slate-400 p-2 text-center">Tidak ada area.</p>}
              {areas.map(area => (
                <AreaItem 
                  key={area.id} 
                  area={area} 
                  isSelected={selectedAreaId === area.id} 
                  onClick={() => handleAreaClick(area)} 
                />
              ))}
            </div>
          ) : (
            // Folders for Project Share
            <div className="space-y-3">
              {groups.map(group => {
                const groupAreas = areasByGroup[group.id] || [];
                // Default expanded if only 1 group, else default collapsed unless state says otherwise
                const isExpanded = expandedGroups[group.id] ?? groups.length === 1;

                return (
                  <div key={group.id} className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-sm text-slate-800">{group.name}</span>
                        <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-white rounded-md border border-slate-200">{groupAreas.length}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="p-2 space-y-1 bg-white">
                        {groupAreas.length === 0 ? (
                          <p className="text-xs text-slate-400 p-2 text-center">Folder kosong</p>
                        ) : (
                          groupAreas.map(area => (
                            <AreaItem 
                              key={area.id} 
                              area={area} 
                              isSelected={selectedAreaId === area.id} 
                              onClick={() => handleAreaClick(area)} 
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && <p className="text-sm text-slate-400 p-2 text-center">Tidak ada grup.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Map Panel - top on mobile, right on desktop */}
      <div className="order-1 md:order-2 flex-1 relative bg-slate-100 min-h-[50vh] md:min-h-0">
        <MapContainer areas={areas} readOnly={true} />
      </div>
    </div>
  );
}

function AreaItem({ area, isSelected, onClick }: { area: any, isSelected: boolean, onClick: () => void }) {
  const color = area.groups?.color || area.group_color || "#ccc";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2.5 rounded-md transition-colors text-left border ${
        isSelected ? "bg-indigo-50 border-indigo-100" : "bg-white border-transparent hover:bg-slate-50"
      }`}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex flex-col overflow-hidden flex-1">
        <span className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
          {area.area_number}
        </span>
        <span className={`text-xs truncate ${isSelected ? "text-indigo-500" : "text-slate-500"}`}>
          {area.name}
        </span>
      </div>
      <MapPin className={`h-4 w-4 shrink-0 ${isSelected ? "text-indigo-500" : "text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"}`} />
    </button>
  );
}
