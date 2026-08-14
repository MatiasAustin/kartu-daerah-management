"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createArea, updateArea } from "@/app/actions/areaActions";

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  groups: any[];
  initialData?: any; 
  // initialData could be raw drawn GeoJSON feature (needs saving) 
  // OR an existing area from DB (needs updating)
}

export function AreaModal({ isOpen, onClose, projectId, groups, initialData }: AreaModalProps) {
  // If initialData has an 'id' and 'group_id', it's an existing DB record.
  // If it just has geometry properties (like from MapboxDraw), it's a new unsaved area.
  const isEditing = !!initialData?.group_id;

  const [areaNumber, setAreaNumber] = useState(initialData?.area_number || "");
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [groupId, setGroupId] = useState(initialData?.group_id || groups[0]?.id || "");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) {
      setError("Please select a group first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    let res;
    if (isEditing) {
      // Update existing area
      res = await updateArea(initialData.id, projectId, {
        area_number: areaNumber,
        name,
        description,
        // We do not update geometry here, geometry is updated via map drag events
      });
    } else {
      // Create new area
      
      // Calculate basic center point for labels (naive approach for MVP)
      // A proper approach would use Turf.js centroid, but we'll approximate using the first coordinate
      let center_lng = 0;
      let center_lat = 0;
      
      if (initialData?.geometry?.coordinates?.[0]?.[0]) {
         center_lng = initialData.geometry.coordinates[0][0][0];
         center_lat = initialData.geometry.coordinates[0][0][1];
      }

      const data = {
        area_number: areaNumber,
        name,
        description,
        geometry: initialData.geometry,
        center_lng,
        center_lat,
      };
      res = await createArea(projectId, groupId, data);
    }

    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Area Details" : "Save New Area"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
          
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="groupId">Assign to Group</Label>
              <select 
                id="groupId" 
                value={groupId} 
                onChange={(e) => setGroupId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                required
              >
                <option value="" disabled>Select a group...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="areaNumber">Area Number</Label>
              <Input id="areaNumber" placeholder="e.g. 001" value={areaNumber} onChange={(e) => setAreaNumber(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Area Name</Label>
              <Input id="name" placeholder="e.g. Jakarta Selatan Block A" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Area"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
