"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Globe, List, LayoutGrid, Clock, CalendarDays } from "lucide-react";
import { ProjectCardActions } from "@/components/dashboard/ProjectCardActions";
import { HelpGuide } from "@/components/ui/HelpGuide";

const PROJECTS_HELP_STEPS = [
  {
    icon: "🗂️",
    title: "Daftar Proyek",
    content: (
      <div className="space-y-3">
        <p>Halaman ini menampilkan semua proyek pemetaan yang Anda kelola. Setiap proyek berisi kumpulan area penyiaran yang dibagi ke dalam grup-grup.</p>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Yang bisa Anda lakukan:</p>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex gap-2"><span>📁</span><span>Klik kartu proyek untuk masuk ke editor peta</span></li>
            <li className="flex gap-2"><span>🔢</span><span>Urutkan proyek berdasarkan nama, tanggal dibuat, atau terakhir diedit</span></li>
            <li className="flex gap-2"><span>⊞</span><span>Ganti tampilan antara Grid atau List</span></li>
          </ul>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
          💡 Klik tombol <strong>"+ New Project"</strong> (pojok kanan atas halaman) untuk membuat proyek baru.
        </div>
      </div>
    )
  },
  {
    icon: "⚙️",
    title: "Kelola Proyek",
    content: (
      <div className="space-y-3">
        <p>Setiap kartu proyek milik Anda memiliki menu aksi di pojok kanan atas kartu (ikon titik tiga).</p>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Menu Aksi Proyek:</p>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex gap-2"><span>✏️</span><span><strong>Rename</strong> — ubah nama proyek</span></li>
            <li className="flex gap-2"><span>🔗</span><span><strong>Share</strong> — buat link publik untuk penyiar</span></li>
            <li className="flex gap-2"><span>🗑️</span><span><strong>Delete</strong> — hapus proyek beserta semua areanya</span></li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ Menghapus proyek bersifat permanen dan tidak dapat dibatalkan. Semua area dan data di dalamnya akan ikut terhapus.
        </div>
      </div>
    )
  },
  {
    icon: "🔗",
    title: "Berbagi ke Penyiar",
    content: (
      <div className="space-y-3">
        <p>Penyiar (field worker) tidak perlu login. Cukup bagikan link publik agar mereka bisa melihat peta dan mengisi catatan/komentar di area mereka.</p>
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Cara berbagi:</p>
          <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
            <li>Klik ikon ⋮ di kartu proyek</li>
            <li>Pilih <strong>"Share"</strong></li>
            <li>Aktifkan tombol link publik</li>
            <li>Salin link atau QR Code dan kirim ke penyiar</li>
          </ol>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-700">
          ✅ Anda juga bisa berbagi hanya satu grup spesifik dari dalam editor proyek.
        </div>
      </div>
    )
  }
];

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
        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
          <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-xs">
            {projects.length}
          </span>
          Projects
          <HelpGuide steps={PROJECTS_HELP_STEPS} label="Panduan" />
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
                      {(project as any).isCoOwner && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium tracking-wide">Co-Owner</span>}
                      {(project as any).isManager && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium tracking-wide">Manager</span>}
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
