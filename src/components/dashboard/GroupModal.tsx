"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createGroup, updateGroup } from "@/app/actions/groupActions";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f43f5e", "#a855f7", "#6366f1",
];

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialData?: any;
  onSuccess?: () => void | Promise<void>;
}

export function GroupModal({ isOpen, onClose, projectId, initialData, onSuccess }: GroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form every time modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setDescription(initialData?.description || "");
      setColor(initialData?.color || "#6366f1");
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const data = { name: name.trim(), description: description.trim(), color };

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
      if (onSuccess) {
        await onSuccess();
      } else {
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Edit Group" : "Create New Group"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="groupName">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="groupName"
              placeholder="e.g. KDL BMI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="groupDesc">Description</Label>
            <Textarea
              id="groupDesc"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#1e293b" : "transparent",
                    transform: color === c ? "scale(1.2)" : undefined,
                  }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-200"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#6366f1"
              />
              <div className="w-8 h-8 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: color }} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} style={{ backgroundColor: color, borderColor: color }} className="min-w-[120px] text-white">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> Saving...</> : initialData?.id ? "Update Group" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
