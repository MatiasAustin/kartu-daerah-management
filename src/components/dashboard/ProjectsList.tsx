"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Globe, List, LayoutGrid, Clock, CalendarDays } from "lucide-react";
import { ProjectCardActions } from "@/components/dashboard/ProjectCardActions";

interface ProjectsListProps {
  projects: any[];
  currentUserId: string;
}

type SortOption = "created_desc" | "created_asc" | "updated_desc" | "updated_asc" | "name_asc";
type ViewMode = "gallery" | "list";

export function ProjectsList({ projects, currentUserId }: ProjectsListProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");

  // Sort projects
  const sortedProjects = [...projects].sort((a, b) => {
    switch (sortBy) {
      case "created_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "updated_desc":
        // Fallback to created_at if updated_at is missing
        const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
        const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
        return bUpdated - aUpdated;
      case "updated_asc":
        const aUp = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
        const bUp = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
        return aUp - bUp;
      case "name_asc":
        return (a.name || "").localeCompare(b.name || "");
      default:
        return 0;
    }
  });

  const handleCardClick = (e: React.MouseEvent, projectId: string) => {
    // If the user clicked a button or inside the dropdown (usually handled by stopPropagation, but just in case)
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      return;
    }
    router.push(`/dashboard/projects/${projectId}`);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-xs">
            {projects.length}
          </span>
          Projects
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border border-slate-200 rounded-md py-1.5 px-3 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="updated_desc">Recently Edited</option>
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>

          <div className="flex bg-slate-200 p-0.5 rounded-md">
            <button 
              onClick={() => setViewMode("gallery")}
              className={`p-1.5 rounded-sm transition-colors ${viewMode === "gallery" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
              title="Gallery View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-sm transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {viewMode === "gallery" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((project) => {
            const isOwner = project.owner_id === currentUserId;
            return (
              <Card 
                key={project.id} 
                onClick={(e) => handleCardClick(e, project.id)}
                className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer h-full group"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                        <FolderKanban className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="truncate">{project.name}</span>
                    </div>
                    {isOwner && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectCardActions project={project} />
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-2 h-10">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="font-medium text-slate-700">
                        {project.is_public ? "Public Map" : "Private"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Edited: {formatDate(project.updated_at || project.created_at)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3" />
                        Created: {formatDate(project.created_at)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedProjects.map((project) => {
            const isOwner = project.owner_id === currentUserId;
            return (
              <Card 
                key={project.id} 
                onClick={(e) => handleCardClick(e, project.id)}
                className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors shrink-0">
                      <FolderKanban className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{project.name}</h3>
                      <p className="text-sm text-slate-500 truncate">{project.description || "No description"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 sm:w-auto w-full justify-between sm:justify-end shrink-0 pl-14 sm:pl-0">
                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3" /> {project.is_public ? "Public" : "Private"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {formatDate(project.updated_at || project.created_at)}
                      </span>
                    </div>
                    {isOwner && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectCardActions project={project} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
