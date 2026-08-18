"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Edit, Phone, UserPlus } from "lucide-react";
import { createPublisher, updatePublisher, deletePublisher } from "@/app/actions/publisherActions";
import { assignAreaToPublisher } from "@/app/actions/assignmentActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function PublisherManager({ 
  projects, 
  initialPublishers,
  initialAreas = [],
  initialGroups = [],
  initialAssignments = []
}: { 
  projects: any[], 
  initialPublishers: any[],
  initialAreas?: any[],
  initialGroups?: any[],
  initialAssignments?: any[]
}) {
  const [projectId, setProjectId] = useState(projects.length > 0 ? projects[0].id : "");
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // For Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editProject, setEditProject] = useState("");
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !name.trim()) return;

    setIsLoading(true);
    setError(null);
    const res = await createPublisher(projectId, { name: name.trim(), contact_info: contactInfo.trim() });
    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setName("");
      setContactInfo("");
    }
  };

  const handleStartEdit = (p: any) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditContact(p.contact_info || "");
    setEditProject(p.project_id);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editProject || !editName.trim()) return;
    setIsEditingLoading(true);
    await updatePublisher(editId, editProject, { name: editName.trim(), contact_info: editContact.trim() });
    setIsEditingLoading(false);
    setEditId(null);
  };

  const handleDelete = async (p: any) => {
    setIsDeleting(true);
    await deletePublisher(p.id, p.project_id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  // Assignment Modal State
  const [assigningPublisherId, setAssigningPublisherId] = useState<string | null>(null);
  const [assigningProjectId, setAssigningProjectId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleOpenAssign = (publisherId: string, pubProjectId: string) => {
    const currentAssigned = initialAssignments.filter(a => a.publisher_id === publisherId).map(a => a.area_id);
    setSelectedAreaIds(currentAssigned);
    setAssigningPublisherId(publisherId);
    setAssigningProjectId(pubProjectId);
  };

  const handleSaveAssignments = async () => {
    if (!assigningPublisherId || !assigningProjectId) return;
    setIsAssigning(true);
    
    const originallyAssigned = initialAssignments.filter(a => a.publisher_id === assigningPublisherId).map(a => a.area_id);
    const toAssign = selectedAreaIds.filter(id => !originallyAssigned.includes(id));
    const toUnassign = originallyAssigned.filter(id => !selectedAreaIds.includes(id));

    for (const areaId of toAssign) {
      await assignAreaToPublisher(areaId, assigningPublisherId, assigningProjectId);
    }
    for (const areaId of toUnassign) {
      await assignAreaToPublisher(areaId, null, assigningProjectId);
    }

    setIsAssigning(false);
    setAssigningPublisherId(null);
    setAssigningProjectId(null);
  };

  const toggleAreaSelect = (areaId: string) => {
    setSelectedAreaIds(prev => 
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  return (
    <div className="space-y-8 mt-12">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Field Worker (Penyiar) Management</h2>
        <p className="text-slate-500 mt-1">Manage field workers who will be assigned to specific areas.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-slate-800 mb-4">Add Field Worker</h3>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pub_name">Full Name</Label>
            <Input 
              id="pub_name" 
              placeholder="e.g. Budi Santoso" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub_contact">Contact (Optional)</Label>
            <Input 
              id="pub_contact" 
              placeholder="e.g. 08123456789" 
              value={contactInfo} 
              onChange={e => setContactInfo(e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pub_project">Select Project</Label>
            <select
              id="pub_project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              {projects.length === 0 && <option value="" disabled>No projects available</option>}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-3 flex justify-end mt-2">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading || projects.length === 0}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Field Worker
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Current Field Workers (Penyiar)</h3>
        </div>
        
        {initialPublishers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No field workers have been added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Added Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialPublishers.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {editId === p.id ? (
                        <div className="space-y-2">
                          <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="h-8" />
                          <Input value={editContact} onChange={e => setEditContact(e.target.value)} placeholder="Contact" className="h-8" />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-800">{p.name}</div>
                          {p.contact_info && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" /> {p.contact_info}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editId === p.id ? (
                         <select
                           value={editProject}
                           onChange={(e) => setEditProject(e.target.value)}
                           className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                         >
                           {projects.map(proj => (
                             <option key={proj.id} value={proj.id}>{proj.name}</option>
                           ))}
                         </select>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
                            {p.projects?.name}
                          </span>
                          {(() => {
                            const assignedAreaIds = initialAssignments?.filter((a: any) => a.publisher_id === p.id).map(a => a.area_id) || [];
                            if (assignedAreaIds.length === 0) return null;
                            const assignedAreas = initialAreas?.filter(a => assignedAreaIds.includes(a.id)) || [];
                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {assignedAreas.map(area => (
                                  <span key={area.id} className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                    {area.name || `Area ${area.area_number}`}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editId === p.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)} disabled={isEditingLoading}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveEdit} disabled={isEditingLoading}>
                            {isEditingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                      ) : deleteTarget === p.id ? (
                        <div className="flex justify-end gap-2 items-center">
                          <span className="text-xs text-red-500 mr-2">Delete?</span>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="h-7 px-2">Cancel</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(p)} disabled={isDeleting} className="h-7 px-2">
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" 
                            onClick={() => handleOpenAssign(p.id, p.project_id)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" /> Assign Area(s)
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" onClick={() => handleStartEdit(p)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(p.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={!!assigningPublisherId} onOpenChange={(open) => !open && setAssigningPublisherId(null)}>
        <DialogContent className="sm:max-w-md font-sans">
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Assign Areas to {initialPublishers.find((p: any) => p.id === assigningPublisherId)?.name}</DialogTitle>
              <DialogDescription>
                Select the areas you want to assign to this field worker.
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
              {(() => {
                const projGroups = initialGroups?.filter((g: any) => g.project_id === assigningProjectId) || [];
                const projAreas = initialAreas?.filter((a: any) => a.project_id === assigningProjectId) || [];
                
                if (projGroups.length === 0) {
                  return <div className="text-sm text-slate-500 text-center py-4">No groups available in this project.</div>;
                }
                
                return projGroups.map((group: any) => {
                  const groupAreas = projAreas.filter((a: any) => a.group_id === group.id);
                  if (groupAreas.length === 0) return null;
                  
                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.name}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {groupAreas.map((area: any) => {
                          const isSelected = selectedAreaIds.includes(area.id);
                          return (
                            <button
                              key={area.id}
                              type="button"
                              onClick={() => toggleAreaSelect(area.id)}
                              className={`flex items-center gap-2 p-2 rounded border text-sm text-left transition-colors ${
                                isSelected 
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-700" 
                                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                              }`}
                            >
                              <div className={`w-4 h-4 shrink-0 rounded flex items-center justify-center border ${
                                isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                              }`}>
                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <span className="truncate flex-1">{area.name || `Area ${area.area_number}`}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            <DialogFooter className="mt-2 pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setAssigningPublisherId(null)} disabled={isAssigning}>
                Cancel
              </Button>
              <Button onClick={handleSaveAssignments} disabled={isAssigning} className="bg-indigo-600 hover:bg-indigo-700">
                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Assignments
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
