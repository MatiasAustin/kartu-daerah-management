"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { getAvailableReferenceAreas } from "@/app/actions/referenceFetchActions";
import { addProjectReference, updateProjectReference } from "@/app/actions/referenceActions";

export function ReferenceModal({ 
  projectId, 
  initialData,
  onClose, 
  onSuccess,
  onPreviewChange
}: { 
  projectId: string, 
  initialData?: any,
  onClose: () => void, 
  onSuccess: (updatedData?: any) => void,
  onPreviewChange?: (updates: any) => void
}) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>(initialData?.source_area_id || "");
  const [name, setName] = useState(initialData?.name || "");
  const [color, setColor] = useState(initialData?.color || "#ff0000");
  const [weight, setWeight] = useState(initialData?.weight || 3);
  
  // Parse initial dash array
  let initDash = 0;
  let initGap = 0;
  if (initialData?.dash_array) {
    const parts = initialData.dash_array.split(',').map((s: string) => parseFloat(s.trim()));
    if (parts.length >= 2) {
      initDash = parts[0];
      initGap = parts[1];
    }
  }

  const [dashLength, setDashLength] = useState(initDash);
  const [gapLength, setGapLength] = useState(initGap);

  const isEdit = !!initialData;
  const dashArray = gapLength > 0 ? `${dashLength || 1}, ${gapLength}` : "";

  useEffect(() => {
    if (!isEdit) {
      getAvailableReferenceAreas(projectId).then(res => {
        if (res.data) setProjects(res.data);
      });
    }
  }, [projectId, isEdit]);

  useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange({ id: initialData?.id, color, weight, dash_array: dashArray });
    }
  }, [color, weight, dashLength, gapLength, onPreviewChange, dashArray, initialData?.id]);

  const activeProject = projects.find(p => p.id === selectedProjectId);
  const availableAreas = activeProject ? activeProject.areas : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !selectedAreaId) return;

    setLoading(true);
    let res;
    if (isEdit) {
      res = await updateProjectReference(initialData.id, projectId, { name, color, weight, dash_array: dashArray });
    } else {
      res = await addProjectReference(projectId, selectedAreaId, name || "Reference Line", color, weight, dashArray);
    }
    setLoading(false);

    if (res.success) {
      onSuccess(isEdit ? { ...initialData, name, color, weight, dash_array: dashArray } : undefined);
    } else {
      alert(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-4 pt-2 font-sans">
      {!isEdit && (
        <>
          <div className="space-y-2">
            <Label className="text-slate-700 font-sans">Source Project</Label>
            <div className="relative">
              <select 
                required
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedAreaId("");
                }}
                className="flex h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 font-sans"
              >
                <option value="">Select a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-sans">Source Area / Line</Label>
            <div className="relative">
              <select 
                required
                disabled={!selectedProjectId}
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="flex h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 font-sans"
              >
                <option value="">Select an area...</option>
                {availableAreas.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label className="text-slate-700 font-sans">Reference Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Batas Provinsi" className="h-11 rounded-lg font-sans" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-slate-700 font-sans">Color</Label>
          <div className="flex items-center gap-3">
            <div className="h-11 w-full rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-1 relative">
               <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] cursor-pointer" />
            </div>
            <span className="text-xs text-slate-500 font-mono w-16 uppercase">{color}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700 font-sans flex justify-between">
            <span>Line Weight</span>
            <span className="text-indigo-600 font-medium">{weight}px</span>
          </Label>
          <div className="h-11 flex items-center">
            <input 
              type="range" 
              min="1" 
              max="15" 
              value={weight} 
              onChange={e => setWeight(parseInt(e.target.value))} 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-slate-700 font-sans">Dash Style</Label>
        
        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-3">
            <Label className="text-slate-600 font-sans text-xs flex justify-between">
              <span>Dash Length (Stroke)</span>
              <span className="text-indigo-600 font-medium">{gapLength === 0 ? "Solid" : dashLength}</span>
            </Label>
            <input 
              type="range" 
              min="1" 
              max="30" 
              value={dashLength} 
              disabled={gapLength === 0}
              onChange={e => setDashLength(parseInt(e.target.value))} 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" 
            />
          </div>
          <div className="space-y-3">
            <Label className="text-slate-600 font-sans text-xs flex justify-between">
              <span>Gap Length (Spacing)</span>
              <span className="text-indigo-600 font-medium">{gapLength === 0 ? "0 (Solid)" : gapLength}</span>
            </Label>
            <input 
              type="range" 
              min="0" 
              max="30" 
              value={gapLength} 
              onChange={e => setGapLength(parseInt(e.target.value))} 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
            />
          </div>
          
          <div className="pt-2">
             <div className="h-6 w-full border border-slate-200 rounded bg-white overflow-hidden flex items-center justify-center">
                <svg width="100%" height="4" className="block">
                  <line 
                    x1="0" 
                    y1="2" 
                    x2="100%" 
                    y2="2" 
                    stroke={color} 
                    strokeWidth={weight > 4 ? 4 : weight} 
                    strokeDasharray={gapLength > 0 ? `${dashLength}, ${gapLength}` : "none"} 
                  />
                </svg>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-6">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-lg font-sans">Cancel</Button>
        <Button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-sans min-w-[140px]">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEdit ? "Save Changes" : "Add Reference"}
        </Button>
      </div>
    </form>
  );
}
