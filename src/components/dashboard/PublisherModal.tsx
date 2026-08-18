"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Phone, Trash2, Edit } from "lucide-react";
import { createPublisher, updatePublisher, deletePublisher } from "@/app/actions/publisherActions";
import { assignAreaToPublisher } from "@/app/actions/assignmentActions";

export function PublisherModal({ 
  isOpen, 
  onClose, 
  projectId, 
  publishers,
  activeAssignments,
  areas = [],
  groups = []
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  projectId: string;
  publishers: any[];
  activeAssignments: any[];
  areas?: any[];
  groups?: any[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [assigningPublisherId, setAssigningPublisherId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setContactInfo("");
    setError(null);
    setDeleteTarget(null);
  };

  const handleEdit = (p: any) => {
    setIsEditing(true);
    setEditId(p.id);
    setName(p.name);
    setContactInfo(p.contact_info || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const data = { name: name.trim(), contact_info: contactInfo.trim() };

    let res;
    if (isEditing && editId) {
      res = await updatePublisher(editId, projectId, data);
    } else {
      res = await createPublisher(projectId, data);
    }

    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const res = await deletePublisher(id, projectId);
    setIsDeleting(false);
    if (!res?.error) {
      setDeleteTarget(null);
    }
  };

  const handleOpenAssign = (publisherId: string) => {
    // find areas currently assigned to this publisher
    const currentAssigned = activeAssignments.filter(a => a.publisher_id === publisherId).map(a => a.area_id);
    setSelectedAreaIds(currentAssigned);
    setAssigningPublisherId(publisherId);
  };

  const handleSaveAssignments = async () => {
    if (!assigningPublisherId) return;
    setIsAssigning(true);
    
    // Get currently assigned areas from DB for this publisher
    const originallyAssigned = activeAssignments.filter(a => a.publisher_id === assigningPublisherId).map(a => a.area_id);
    
    // Find areas to assign (in selectedAreaIds but not in originallyAssigned)
    const toAssign = selectedAreaIds.filter(id => !originallyAssigned.includes(id));
    // Find areas to unassign (in originallyAssigned but not in selectedAreaIds)
    const toUnassign = originallyAssigned.filter(id => !selectedAreaIds.includes(id));

    // Execute assignments sequentially
    for (const areaId of toAssign) {
      await assignAreaToPublisher(areaId, assigningPublisherId, projectId);
    }
    for (const areaId of toUnassign) {
      await assignAreaToPublisher(areaId, null, projectId);
    }

    setIsAssigning(false);
    setAssigningPublisherId(null);
  };

  const toggleAreaSelect = (areaId: string) => {
    setSelectedAreaIds(prev => 
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md font-sans">
        {assigningPublisherId ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Assign Areas to {publishers.find(p => p.id === assigningPublisherId)?.name}</DialogTitle>
              <DialogDescription>
                Select the areas you want to assign to this field worker.
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
              {groups?.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No groups available.</div>
              ) : (
                groups?.map(group => {
                  const groupAreas = areas?.filter(a => a.group_id === group.id) || [];
                  if (groupAreas.length === 0) return null;
                  
                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.name}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {groupAreas.map(area => {
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
                })
              )}
            </div>
            
            <DialogFooter className="mt-2 pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setAssigningPublisherId(null)} disabled={isAssigning}>
                Back
              </Button>
              <Button onClick={handleSaveAssignments} disabled={isAssigning} className="bg-indigo-600 hover:bg-indigo-700">
                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Assignments
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Manage Publishers (Penyiar)</DialogTitle>
              <DialogDescription>
                Publishers are field workers who can be assigned to areas.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">
                  {isEditing ? "Edit Publisher" : "Add New Publisher"}
                </h4>
                
                {error && (
                  <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-100">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name</Label>
                    <Input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Budi Santoso"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contact (Optional)</Label>
                    <Input 
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="e.g. 0812..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  {isEditing && (
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={isLoading}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" size="sm" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Update" : "Add Publisher"}
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">Current Publishers</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {publishers.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-6 border border-dashed rounded-lg">
                      No publishers added yet.
                    </div>
                  ) : (
                    publishers.map(p => {
                      const assignedCount = activeAssignments.filter(a => a.publisher_id === p.id).length;
                      const isDeletingThis = isDeleting && deleteTarget === p.id;
                      
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                          <div>
                            <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                            <div className="flex items-center gap-3 mt-1">
                              {p.contact_info && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {p.contact_info}
                                </span>
                              )}
                              <button 
                                onClick={() => handleOpenAssign(p.id)}
                                className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                              >
                                <UserPlus className="w-3 h-3" /> Assign Area(s) ({assignedCount})
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {deleteTarget === p.id ? (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDeleteTarget(null)} disabled={isDeletingThis}>Cancel</Button>
                                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handleDelete(p.id)} disabled={isDeletingThis}>
                                  {isDeletingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500" onClick={() => handleEdit(p)}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(p.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
