"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addGroupManager } from "@/app/actions/groupActions";

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  groupId: string;
  groupName: string;
}

export function ManagerModal({ isOpen, onClose, projectId, groupId, groupName }: ManagerModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const res = await addGroupManager(groupId, email, projectId);

    setIsLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Area Manager</DialogTitle>
          <DialogDescription>
            Assign a user to manage areas within <strong>{groupName}</strong>. They must have an existing account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <div className="p-2 text-sm text-red-500 bg-red-50 rounded">{error}</div>}
          {success && <div className="p-2 text-sm text-emerald-600 bg-emerald-50 rounded">Manager added successfully!</div>}
          
          <div className="space-y-2">
            <Label htmlFor="email">User Email Address</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="e.g. budi@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Assigning..." : "Assign Manager"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
