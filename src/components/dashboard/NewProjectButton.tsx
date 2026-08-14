"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectModal } from "./ProjectModal";

interface NewProjectButtonProps {
  variant?: "default" | "empty_state";
}

export function NewProjectButton({ variant = "default" }: NewProjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === "default" ? (
        <Button className="gap-2" onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      ) : (
        <Button onClick={() => setIsOpen(true)}>Create your first project</Button>
      )}

      <ProjectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
