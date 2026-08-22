
"use client";

import { useState } from "react";
import { addProjectAdminAction, removeProjectAdminAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";

export function AdminManager({ 
  projects, 
  admins 
}: { 
  projects: any[], 
  admins: any[] 
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects.length > 0 ? projects[0].id : "");

  async function handleAddAdmin(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await addProjectAdminAction(formData);
    
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.success) {
      setMessage({ type: "success", text: result.message! });
    }
    setLoading(false);
  }

  async function handleRemoveAdmin(adminId: string, projectId: string) {
    if (confirm("Are you sure you want to remove this Co-owner?")) {
      const result = await removeProjectAdminAction(adminId, projectId);
      if (result.error) alert(result.error);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Co-Owner (Project Admin) Management</h3>
      <p className="text-sm text-slate-500 mb-4">Co-owners have full access to manage projects, managers, and field workers.</p>
      
      {message && (
        <div className={`p-3 mb-4 rounded-md text-sm ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message.text}
        </div>
      )}

      <form action={handleAddAdmin} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email Address</Label>
            <Input id="adminEmail" name="email" type="email" required placeholder="coowner@example.com" />
            <p className="text-xs text-slate-400">User must already be registered in the app.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminProjectId">Select Project</Label>
            <select 
              id="adminProjectId" 
              name="projectId" 
              required
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Co-Owner"}
          </Button>
        </div>
      </form>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700">Current Co-Owners</h4>
        </div>
        {admins.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">No co-owners assigned yet.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{admin.profiles?.full_name || admin.profiles?.email}</td>
                  <td className="px-4 py-3 text-slate-500">{admin.projects?.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmin(admin.id, admin.project_id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
