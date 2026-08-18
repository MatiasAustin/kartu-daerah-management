"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createArea, updateArea } from "@/app/actions/areaActions";
import { assignAreaToPublisher } from "@/app/actions/assignmentActions";
import { GroupModal } from "./GroupModal";

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (area: any) => void;
  projectId: string;
  groups: any[];
  publishers?: any[];
  activeAssignments?: any[];
  onGroupCreated?: () => void;
  initialData?: any;
}

export function AreaModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  projectId, 
  groups,
  publishers = [],
  activeAssignments = [],
  onGroupCreated, 
  initialData 
}: AreaModalProps) {
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const isEditing = !!initialData?.id && !!initialData?.group_id;

  // Re-initialize form state whenever the modal opens with new data
  const [areaNumber, setAreaNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState("");
  const [publisherId, setPublisherId] = useState<string>("unassigned");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/initialData changes
  useEffect(() => {
    if (isOpen) {
      setAreaNumber(initialData?.area_number || "");
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
      setGroupId(initialData?.group_id || "");
      
      if (initialData?.id) {
        const assignment = activeAssignments.find((a: any) => a.area_id === initialData.id);
        setPublisherId(assignment ? assignment.publisher_id : "unassigned");
      } else {
        setPublisherId("unassigned");
      }
      
      setError(null);
    }
  }, [isOpen, initialData, activeAssignments]);

  // Auto-select first group when groups load and nothing selected
  useEffect(() => {
    if (isOpen && !groupId && groups.length > 0) {
      setGroupId(groups[0].id);
    }
  }, [isOpen, groups, groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !groupId) {
      setError("Please select or create a group first.");
      return;
    }
    if (isEditing) {
      if (!name.trim()) {
        setError("Area name is required.");
        return;
      }
      if (!areaNumber.trim()) {
        setError("Area number is required.");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    let res;
    if (isEditing) {
      res = await updateArea(initialData.id, projectId, {
        area_number: areaNumber,
        name,
        description,
        group_id: groupId,
      });
    } else {
      // Calculate centroid (average of polygon vertices)
      let center_lng = 0;
      let center_lat = 0;
      const coords = initialData?.geometry?.coordinates?.[0];
      if (coords && coords.length > 0) {
        const sum = coords.reduce(
          (acc: [number, number], c: [number, number]) => [acc[0] + c[0], acc[1] + c[1]],
          [0, 0]
        );
        center_lng = sum[0] / coords.length;
        center_lat = sum[1] / coords.length;
      }

      res = await createArea(projectId, groupId, {
        area_number: areaNumber,
        name,
        description,
        geometry: initialData?.geometry,
        center_lng,
        center_lat,
      });
    }

    if (res && "error" in res && res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    } 
    
    // Save assignment if publisherId is valid or changed
    let finalAreaId = isEditing ? initialData.id : (res && "area" in res && res.area ? res.area.id : null);
    if (finalAreaId) {
      const pubId = publisherId === "unassigned" ? null : publisherId;
      await assignAreaToPublisher(finalAreaId, pubId, projectId);
    }
    
    setIsLoading(false);

    if (onSuccess) {
        if (isEditing) {
          // For edits, pass back the updated fields merged with the existing record
          onSuccess({
            type: "edit",
            area: {
              ...initialData,
              area_number: areaNumber,
              name,
              description,
              group_id: groupId,
            },
          });
        } else {
          // For new areas: use the DB record but inject the drawn geometry so the map can render it immediately
          const createdArea = res && "area" in res ? res.area : null;
          onSuccess({
            type: "create",
            area: {
              ...(createdArea || {}),
              area_number: createdArea?.area_number || areaNumber,
              name: createdArea?.name || name,
              description,
              group_id: groupId,
              geometry: initialData?.geometry, // the raw drawn GeoJSON polygon
              geojson: initialData?.geometry,  // use the same for geojson field
              groups: null, // will be filled in by parent
            },
          });
        }
      }
      onClose();
  };

  return (<>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Area Details" : "Save New Area"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}

          {/* Group selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="groupId">Group (Daerah) <span className="text-red-500">*</span></Label>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + New Group
                </button>
              </div>
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-5 text-center gap-2">
                  <p className="text-sm text-slate-500">No groups yet. Create a group first to assign this area.</p>
                  <Button type="button" size="sm" onClick={() => setIsGroupModalOpen(true)}>
                    + Create Group
                  </Button>
                </div>
              ) : (
                <select
                  id="groupId"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Select a group...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="publisherId">
                Assign Publisher (Penyiar)
              </Label>
              <select
                id="publisherId"
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="unassigned">-- Unassigned --</option>
                {publishers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

          {/* Area number + name (Only visible when editing, auto-generated on create) */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="areaNumber">
                  Area Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="areaNumber"
                  placeholder="e.g. 001"
                  value={areaNumber}
                  onChange={(e) => setAreaNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Area Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Pucung Barat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 flex flex-col gap-1">
              <p className="font-medium">✨ Auto-Naming & Numbering Active</p>
              <p className="text-xs opacity-80">The area name and number will be automatically generated based on the location when you save.</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional notes about this area..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!isEditing && groups.length === 0)} className="min-w-[120px]">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEditing ? "Update Area" : "Save Area"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <GroupModal
      isOpen={isGroupModalOpen}
      onClose={() => setIsGroupModalOpen(false)}
      projectId={projectId}
      onSuccess={async () => {
        setIsGroupModalOpen(false);
        await onGroupCreated?.();
      }}
    />
  </>);
}
