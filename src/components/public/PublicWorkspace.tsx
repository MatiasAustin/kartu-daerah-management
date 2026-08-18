"use client";

import { useState } from "react";
import { MapContainer, resolveGeometry } from "@/components/map/MapContainer";
import { useMapStore } from "@/lib/store/mapStore";
import { ChevronDown, ChevronRight, MapPin, FolderOpen, Share2, Printer, Navigation } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

import { PublicAreaComments } from "./PublicAreaComments";

interface PublicWorkspaceProps {
  project: any;
  groups: any[];
  areas: any[];
  isGroupShare: boolean;
  publishers?: any[];
  activeAssignments?: any[];
}

export function PublicWorkspace({ 
  project, 
  groups, 
  areas, 
  isGroupShare,
  publishers = [],
  activeAssignments = []
}: PublicWorkspaceProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const { setSelectedAreaId, selectedAreaId, flyToArea } = useMapStore();

  const handleAreaClick = (area: any) => {
    setSelectedAreaId(area.id);
    setIsCommentsOpen(false); // Close comments when switching areas
    
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
              {areas.map(area => {
                const assignment = activeAssignments.find((a: any) => a.area_id === area.id);
                const pubName = assignment ? publishers.find(p => p.id === assignment.publisher_id)?.name : null;
                const mappedArea = { ...area, publisher_name: pubName };
                return (
                  <AreaItem 
                    key={area.id} 
                    area={mappedArea} 
                    isSelected={selectedAreaId === area.id} 
                    onClick={() => handleAreaClick(area)} 
                    onOpenComments={() => setIsCommentsOpen(true)}
                  />
                );
              })}
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
                          groupAreas.map(area => {
                            const assignment = activeAssignments.find((a: any) => a.area_id === area.id);
                            const pubName = assignment ? publishers.find(p => p.id === assignment.publisher_id)?.name : null;
                            const mappedArea = { ...area, publisher_name: pubName };
                            
                            return (
                              <AreaItem 
                                key={area.id} 
                                area={mappedArea} 
                                isSelected={selectedAreaId === area.id} 
                                onClick={() => handleAreaClick(area)} 
                                onOpenComments={() => setIsCommentsOpen(true)}
                              />
                            );
                          })
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
      <div className="order-1 md:order-2 flex-1 relative bg-slate-100 min-h-0">
        <MapContainer 
          areas={areas.map(a => {
            const assignment = activeAssignments.find((assign: any) => assign.area_id === a.id);
            const pubName = assignment ? publishers.find((p: any) => p.id === assignment.publisher_id)?.name : null;
            return { ...a, publisher_name: pubName };
          })} 
          readOnly={true} 
        />
        
        {/* Render comments drawer if area is selected AND comments are open */}
        {selectedAreaId && isCommentsOpen && (() => {
          const area = areas.find(a => a.id === selectedAreaId);
          if (!area) return null;
          
          const assignment = activeAssignments.find((a: any) => a.area_id === selectedAreaId);
          const publisherId = assignment ? assignment.publisher_id : null;
          const publisher = publisherId ? publishers.find(p => p.id === publisherId) : null;
          const publisherName = publisher ? publisher.name : null;

          return (
            <>
              {/* Overlay for mobile to close when clicking outside */}
              <div 
                className="md:hidden fixed inset-0 z-40 bg-slate-900/20"
                onClick={() => setIsCommentsOpen(false)}
              />
              <PublicAreaComments
                area={area}
                onClose={() => setIsCommentsOpen(false)}
                publisherId={publisherId}
                publisherName={publisherName}
                className="fixed bottom-0 left-0 right-0 md:absolute md:left-auto md:right-4 md:bottom-4 w-full md:w-96 md:rounded-t-2xl md:rounded-b-lg bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-xl border-t md:border border-slate-200 flex flex-col z-[60] animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300 h-[75vh] md:h-[500px] rounded-t-2xl"
              />
            </>
          );
        })()}
      </div>
    </div>
  );
}

function AreaItem({ area, isSelected, onClick, onOpenComments }: { area: any, isSelected: boolean, onClick: () => void, onOpenComments: () => void }) {
  const color = area.groups?.color || area.group_color || "#ccc";
  
  const googleMapsUrl = area.center_lat && area.center_lng 
    ? `https://www.google.com/maps/dir/?api=1&destination=${area.center_lat},${area.center_lng}`
    : `https://www.google.com/maps`;

  return (
    <div className={`w-full flex flex-col rounded-md transition-colors border overflow-hidden ${
      isSelected ? "bg-indigo-50 border-indigo-200" : "bg-white border-transparent hover:bg-slate-50"
    }`}>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-2.5 text-left"
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex flex-col overflow-hidden flex-1">
          <span className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
            {area.area_number}
          </span>
          <span className={`text-xs truncate ${isSelected ? "text-indigo-500" : "text-slate-500"}`}>
            {area.name}
          </span>
          {area.publisher_name && (
            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 max-w-fit">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {area.publisher_name}
            </span>
          )}
        </div>
        <MapPin className={`h-4 w-4 shrink-0 ${isSelected ? "text-indigo-500" : "text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"}`} />
      </button>

      {isSelected && (
        <div className="flex flex-col border-t border-indigo-100 bg-indigo-50/50">
          <div className="flex items-center gap-2 px-3 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenComments();
              }}
              className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Buka Catatan / Komentar
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 pb-3 pt-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/view/area/${area.id}`;
                navigator.clipboard.writeText(url);
                alert("Link disalin!");
              }}
              className="flex-1 flex items-center justify-center gap-1.5 p-1.5 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
              title="Bagikan Area"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
            
            <button
              onClick={() => window.open(`/view/area/${area.id}`, '_blank')}
              className="flex-1 flex items-center justify-center gap-1.5 p-1.5 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
              title="Cetak Area"
            >
              <Printer className="w-3 h-3" /> Print
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 p-1.5 text-xs font-medium text-white bg-indigo-600 border border-indigo-600 rounded hover:bg-indigo-700 transition-colors"
              title="Navigasi ke Lokasi"
            >
              <Navigation className="w-3 h-3" /> Navigasi
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
