"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Edit, Phone, UserPlus } from "lucide-react";
import { createPublisher, updatePublisher, deletePublisher } from "@/app/actions/publisherActions";

export function PublisherManager({ projects, initialPublishers }: { projects: any[], initialPublishers: any[] }) {
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
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {p.projects?.name}
                        </span>
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
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => handleStartEdit(p)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(p.id)}>
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
    </div>
  );
}
