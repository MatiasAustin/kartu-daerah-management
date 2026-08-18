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
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Source Project</Label>
        <select 
          required
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setSelectedAreaId("");
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select a project...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Source Area / Line</Label>
        <select 
          required
          disabled={!selectedProjectId}
          value={selectedAreaId}
          onChange={(e) => setSelectedAreaId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select an area...</option>
          {availableAreas.map((a: any) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Reference Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Batas Provinsi" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Color</Label>
          <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 px-1 py-1" />
        </div>
        <div className="space-y-2">
          <Label>Line Weight ({weight}px)</Label>
          <Input type="number" min="1" max="10" value={weight} onChange={e => setWeight(parseInt(e.target.value))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dash Style</Label>
        <select 
          value={dashArray}
          onChange={(e) => setDashArray(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Solid (No dash)</option>
          <option value="5, 5">Dashed (5, 5)</option>
          <option value="10, 5">Long Dashed (10, 5)</option>
          <option value="2, 4">Dotted (2, 4)</option>
          <option value="15, 5, 5, 5">Dash-Dot (15, 5, 5, 5)</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Reference"}</Button>
      </div>
    </form>
  );
}
