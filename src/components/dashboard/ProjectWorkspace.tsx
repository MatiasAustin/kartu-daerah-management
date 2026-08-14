"use client";

import { useState, useEffect } from "react";
import { MapContainer } from "@/components/map/MapContainer";
import { useMapStore } from "@/lib/store/mapStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Search, ChevronRight, MapPin, Users, Share2, ListFilter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Import Modals
import { GroupModal } from "./GroupModal";
import { AreaModal } from "./AreaModal";
import { ManagerModal } from "./ManagerModal";
import { ShareModal } from "./ShareModal";

export function ProjectWorkspace({ project, initialGroups, initialAreas }: any) {
  const [areas, setAreas] = useState(initialAreas);
  const [groups, setGroups] = useState(initialGroups);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { selectedAreaId, setSelectedAreaId, flyToArea } = useMapStore();

  useEffect(() => {
    setAreas(initialAreas);
  }, [initialAreas]);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  // Modal States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [areaFormData, setAreaFormData] = useState<any>(null);
  
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [selectedGroupForManager, setSelectedGroupForManager] = useState<any>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id?: string, name: string, isProject: boolean } | null>(null);

  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  const handleAreaClick = (area: any) => {
    setSelectedAreaId(area.id);
    setIsMobileListOpen(false);
    if (area.center_lng && area.center_lat) {
      flyToArea(area.center_lng, area.center_lat, 15);
    }
  };

  const handleMapAreaCreate = (feature: any) => {
    setAreaFormData({ geometry: feature.geometry });
    setIsAreaModalOpen(true);
  };

  const openManagerModal = (group: any) => {
    setSelectedGroupForManager(group);
    setIsManagerModalOpen(true);
  };

  const openShareModal = (target: { id?: string, name: string, isProject: boolean }) => {
    setShareTarget(target);
    setIsShareModalOpen(true);
  };

  const filteredAreas = areas.filter((a: any) => {
    // 1. Group Filter
    if (activeGroupFilter && a.group_id !== activeGroupFilter) return false;
    
    // 2. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const areaGroup = groups.find((g: any) => g.id === a.group_id);
      const groupName = areaGroup?.name?.toLowerCase() || "";
      
      return (
        a.name?.toLowerCase().includes(q) ||
        a.area_number?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        groupName.includes(q)
      );
    }
    
    return true;
  });

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 truncate pr-2">{project.name}</h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0 shrink-0" 
            title="Share Project"
            onClick={() => openShareModal({ name: project.name, isProject: true })}
          >
            <Share2 className="h-4 w-4 text-slate-600" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search areas..."
            className="pl-9 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Groups</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsGroupModalOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveGroupFilter(null)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${!activeGroupFilter ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
              >
                All Groups
              </button>
              {groups.map((group: any) => (
                <div key={group.id} className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors group/item ${activeGroupFilter === group.id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>
                  <button
                    onClick={() => setActiveGroupFilter(group.id)}
                    className="flex items-center gap-2 flex-1 truncate"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                    <span className="truncate">{group.name}</span>
                  </button>
                  <div className="flex items-center md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0" 
                      title="Share Group"
                      onClick={() => openShareModal({ id: group.id, name: group.name, isProject: false })}
                    >
                      <Share2 className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 ml-1" 
                      title="Manage Group Users"
                      onClick={() => openManagerModal(group)}
                    >
                      <Users className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Areas</h3>
            </div>
            <div className="space-y-1">
              {filteredAreas.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No areas found.</p>
              ) : (
                filteredAreas.map((area: any) => (
                  <button
                    key={area.id}
                    onClick={() => handleAreaClick(area)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors group ${selectedAreaId === area.id ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "text-slate-700 hover:bg-slate-50 border border-transparent"}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className={`h-4 w-4 shrink-0 ${selectedAreaId === area.id ? "text-indigo-500" : "text-slate-400"}`} />
                      <span className="truncate">{area.area_number} - {area.name}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${selectedAreaId === area.id ? "text-indigo-500 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-80 bg-white border-r border-slate-200 flex-col h-full shadow-sm z-10 shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Floating Trigger */}
      <div className="absolute top-4 left-4 z-20 md:hidden">
        <Sheet open={isMobileListOpen} onOpenChange={setIsMobileListOpen}>
          <SheetTrigger className="shadow-lg rounded-full flex items-center justify-center h-12 w-12 p-0 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50">
            <ListFilter className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:w-80 p-0 flex flex-col bg-white">
            <SheetTitle className="sr-only">Areas List</SheetTitle>
            <SheetDescription className="sr-only">Browse project areas</SheetDescription>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative w-full h-full">
        <MapContainer 
          areas={areas}
          onAreaCreate={handleMapAreaCreate}
          onAreaUpdate={(areaId, geometry) => {
            setAreas((prev: any[]) => prev.map((a: any) => a.id === areaId ? { ...a, geometry } : a));
          }}
          onAreaDelete={(id) => setAreas((prev: any[]) => prev.filter((a: any) => a.id !== id))}
        />
        
        {/* Selected Area Panel overlay */}
        {selectedAreaId && (
          <div className="absolute bottom-0 left-0 w-full rounded-t-xl md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-80 bg-white md:rounded-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg border border-slate-200 overflow-hidden z-20 transition-all">
            {(() => {
              const selectedArea = areas.find((a: any) => a.id === selectedAreaId);
              if (!selectedArea) return null;
              
              const group = groups.find((g: any) => g.id === selectedArea.group_id);
              
              return (
                <div className="max-h-[50vh] md:max-h-none flex flex-col">
                  <div className="h-1 w-12 bg-slate-200 rounded-full mx-auto mt-2 md:hidden shrink-0" />
                  <div className="h-2 w-full mt-2 md:mt-0 shrink-0" style={{ backgroundColor: group?.color || "#cbd5e1" }} />
                  <ScrollArea className="p-5 overflow-y-auto flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Area {selectedArea.area_number}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hidden md:inline-flex" onClick={() => setSelectedAreaId(null)}>×</Button>
                    </div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedArea.name}</h3>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full md:hidden" onClick={() => setSelectedAreaId(null)}>×</Button>
                    </div>
                    <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700 mb-4">
                      <div className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: group?.color || "#cbd5e1" }} />
                      {group?.name || "Unknown Group"}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-slate-500 mb-1">Description</h4>
                        <p className="text-sm text-slate-700">{selectedArea.description || "No description provided."}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 text-xs" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setAreaFormData(selectedArea);
                              setIsAreaModalOpen(true);
                            }}
                          >
                            Edit Details
                          </Button>
                          <Button 
                            className="flex-1 text-xs" 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if ((window as any).__mapEditVertices) {
                                (window as any).__mapEditVertices(selectedArea.id);
                              }
                            }}
                          >
                            Edit Anchors
                          </Button>
                        </div>
                        <Button 
                          className="w-full text-xs" 
                          variant="default" 
                          size="sm"
                          onClick={() => window.open(`/dashboard/projects/${project.id}/areas/${selectedArea.id}/print`, '_blank')}
                        >
                          Print Card
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        projectId={project.id}
        onSuccess={async () => {
          // Refresh groups list so new/updated groups appear in sidebar immediately
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data } = await supabase
            .from("groups")
            .select("*")
            .eq("project_id", project.id)
            .order("sort_order");
          if (data) setGroups(data);
          setIsGroupModalOpen(false);
        }}
      />
      
      <AreaModal
        isOpen={isAreaModalOpen}
        onClose={() => {
          setIsAreaModalOpen(false);
          setAreaFormData(null);
        }}
        projectId={project.id}
        groups={groups}
        initialData={areaFormData}
        onGroupCreated={async () => {
          // Refresh groups list after inline group creation
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data } = await supabase.from("groups").select("*").eq("project_id", project.id).order("sort_order");
          if (data) setGroups(data);
        }}
      />

      {selectedGroupForManager && (
        <ManagerModal
          isOpen={isManagerModalOpen}
          onClose={() => {
            setIsManagerModalOpen(false);
            setSelectedGroupForManager(null);
          }}
          projectId={project.id}
          groupId={selectedGroupForManager.id}
          groupName={selectedGroupForManager.name}
        />
      )}

      {shareTarget && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareTarget(null);
          }}
          projectId={project.id}
          groupId={shareTarget.isProject ? null : shareTarget.id}
          title={shareTarget.name}
        />
      )}
    </div>
  );
}
