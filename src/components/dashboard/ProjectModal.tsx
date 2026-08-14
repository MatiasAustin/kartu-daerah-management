"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/app/actions/projectActions";
import { useRouter } from "next/navigation";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export function ProjectModal({ isOpen, onClose, initialData }: ProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    if (initialData) {
      const result = await updateProject(initialData.id, {
        name: formData.get("name"),
        description: formData.get("description"),
        is_public: initialData.is_public
      });

      setIsLoading(false);

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    } else {
      const result = await createProject(formData);

      setIsLoading(false);

      if (result.error) {
        setError(result.error);
      } else if (result.project) {
        onClose();
        // Redirect to the newly created project
        router.push(`/dashboard/projects/${result.project.id}`);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Project" : "Create New Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
            <Input id="name" name="name" defaultValue={initialData?.name} placeholder="e.g. Jakarta Region Mapping" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" name="description" defaultValue={initialData?.description} placeholder="Brief description of this project..." />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : (initialData ? "Save Changes" : "Create Project")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
