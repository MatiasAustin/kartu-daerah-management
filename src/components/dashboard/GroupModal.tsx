"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup, updateGroup } from "@/app/actions/groupActions";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialData?: any;
  onSuccess?: () => void;
}

export function GroupModal({ isOpen, onClose, projectId, initialData, onSuccess }: GroupModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#ef4444");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const data = { name, description, color };
    
    let res;
    if (initialData?.id) {
      res = await updateGroup(initialData.id, projectId, data);
    } else {
      res = await createGroup(projectId, data);
    }

    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onSuccess ? onSuccess() : onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Group" : "Create New Group"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-10 p-1" />
              <Input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Group"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
