"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/app/actions/projectActions";
import { useRouter } from "next/navigation";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectModal({ isOpen, onClose }: ProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createProject(formData);

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.project) {
      onClose();
      // Redirect to the newly created project
      router.push(`/dashboard/projects/${result.project.id}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
            <Input id="name" name="name" placeholder="e.g. Jakarta Region Mapping" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" name="description" placeholder="Brief description of this project..." />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
