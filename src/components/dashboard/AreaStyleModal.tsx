"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { updateArea } from "@/app/actions/areaActions";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f43f5e", "#a855f7", "#6366f1",
];

export function AreaStyleModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  projectId, 
  area 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: (updatedArea: any) => void;
  projectId: string;
  area: any;
}) {
  const [color, setColor] = useState("");
  const [strokeWeight, setStrokeWeight] = useState(2);
  const [dashArray, setDashArray] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && area) {
      setColor(area.color || area.groups?.color || area.group_color || "#ef4444");
      setStrokeWeight(area.stroke_weight ?? area.groups?.stroke_weight ?? 2);
      setDashArray(area.dash_array || area.groups?.dash_array || "");
      setError(null);
    }
  }, [isOpen, area]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      color,
      stroke_weight: strokeWeight,
      dash_array: dashArray
    };

    const res = await updateArea(area.id, projectId, payload);
    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      onSuccess({ ...area, ...payload });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm font-sans">
        <DialogHeader>
          <DialogTitle>Edit Area Style</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Fill & Base Color</Label>
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

          {/* Style Options */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Border Weight</Label>
                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{strokeWeight}px</span>
              </div>
              <input 
                type="range" 
                min="0" max="10" step="1" 
                value={strokeWeight} 
                onChange={(e) => setStrokeWeight(parseFloat(e.target.value))}
                className="w-full accent-indigo-600" 
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Dash Style</Label>
                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{dashArray || 'Solid'}</span>
              </div>
              <select 
                value={dashArray} 
                onChange={(e) => setDashArray(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Solid</option>
                <option value="4,2">Dashed</option>
                <option value="8,4">Long Dashed</option>
                <option value="1,2">Dotted</option>
                <option value="4,2,1,2">Dash-Dot</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2 mt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} style={{ backgroundColor: color, borderColor: color }} className="min-w-[120px] text-white shadow-sm">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> Saving...</> : "Save Style"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
