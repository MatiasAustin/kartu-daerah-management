"use client";

import { useState } from "react";
import { inviteManagerAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function InviteUserForm({ projects, groups }: { projects: any[], groups: any[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const filteredGroups = selectedProjectId 
    ? groups.filter(g => g.project_id === selectedProjectId)
    : [];

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    
    const result = await inviteManagerAction(formData);
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result.success) {
      setMessage({ type: 'success', text: result.message! });
      // Reset form if we had a ref... but for now just leave it
    }
    
    setLoading(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Area Manager</h3>
      
      {message && (
        <div className={`p-3 mb-4 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" type="text" required placeholder="John Doe" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" required placeholder="manager@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Select Project</Label>
            <select 
              id="projectId" 
              name="projectId" 
              required
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="groupId">Assign to Group (Area)</Label>
            <select 
              id="groupId" 
              name="groupId" 
              required
              disabled={!selectedProjectId}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a group...</option>
              {filteredGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Invite Manager"}
          </Button>
        </div>
      </form>
    </div>
  );
}
