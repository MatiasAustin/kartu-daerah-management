"use client";

import { useState } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteProject } from "@/app/actions/projectActions";
import { ProjectModal } from "@/components/dashboard/ProjectModal";

export function ProjectCardActions({ project }: { project: any }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteProject(project.id);
    setIsDeleting(false);
    if (!res.error) {
      setShowDeleteConfirm(false);
    } else {
      alert(res.error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger 
          onClick={(e) => e.stopPropagation()} 
          className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors focus:outline-none"
        >
          <MoreVertical className="h-4 w-4 text-slate-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setShowEditModal(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        initialData={project} 
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{project.name}</strong>? This will permanently delete all associated groups and areas. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
