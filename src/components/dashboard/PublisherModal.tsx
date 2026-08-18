"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Phone, Trash2, Edit } from "lucide-react";
import { createPublisher, updatePublisher, deletePublisher } from "@/app/actions/publisherActions";

export function PublisherModal({ 
  isOpen, 
  onClose, 
  projectId, 
  publishers,
  activeAssignments,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  projectId: string;
  publishers: any[];
  activeAssignments: any[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md font-sans">
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
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <UserPlus className="w-3 h-3" /> {assignedCount} Area(s)
                          </span>
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
      </DialogContent>
    </Dialog>
  );
}
