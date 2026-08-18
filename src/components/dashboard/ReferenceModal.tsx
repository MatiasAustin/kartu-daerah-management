"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvailableReferenceAreas } from "@/app/actions/referenceFetchActions";
import { addProjectReference } from "@/app/actions/referenceActions";

export function ReferenceModal({ projectId, onClose, onSuccess }: { projectId: string, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff0000");
  const [weight, setWeight] = useState(3);
  const [dashArray, setDashArray] = useState("5, 5");

  useEffect(() => {
    getAvailableReferenceAreas(projectId).then(res => {
      if (res.data) setProjects(res.data);
    });
  }, [projectId]);

  const activeProject = projects.find(p => p.id === selectedProjectId);
  const availableAreas = activeProject ? activeProject.areas : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId) return;

    setLoading(true);
    const res = await addProjectReference(projectId, selectedAreaId, name || "Reference Line", color, weight, dashArray);
    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-6 font-sans">
      <div className="space-y-3">
        <Label className="text-slate-700">Source Project</Label>
        <div className="relative">
          <select 
            required
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedAreaId("");
            }}
            className="flex h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="space-y-3">
        <Label className="text-slate-700">Source Area / Line</Label>
        <div className="relative">
          <select 
            required
            disabled={!selectedProjectId}
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="flex h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="space-y-3">
        <Label className="text-slate-700">Reference Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Batas Provinsi" className="h-11 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-3">
          <Label className="text-slate-700">Color</Label>
          <div className="flex items-center gap-3">
            <div className="h-11 w-full rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-1 relative">
               <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] cursor-pointer" />
            </div>
            <span className="text-xs text-slate-500 font-mono w-16 uppercase">{color}</span>
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-slate-700">Line Weight ({weight}px)</Label>
          <Input type="number" min="1" max="10" value={weight} onChange={e => setWeight(parseInt(e.target.value))} className="h-11 rounded-lg" />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-slate-700">Dash Style</Label>
        <div className="relative">
          <select 
            value={dashArray}
            onChange={(e) => setDashArray(e.target.value)}
            className="flex h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Solid (No dash)</option>
            <option value="5, 5">Dashed (5, 5)</option>
            <option value="10, 5">Long Dashed (10, 5)</option>
            <option value="2, 4">Dotted (2, 4)</option>
            <option value="15, 5, 5, 5">Dash-Dot (15, 5, 5, 5)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
        <Button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">{loading ? "Adding..." : "Add Reference"}</Button>
      </div>
    </form>
  );
}
