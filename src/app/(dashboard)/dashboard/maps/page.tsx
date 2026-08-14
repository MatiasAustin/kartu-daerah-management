import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MapsOverviewPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch all projects to show a summary
  const { data: projects } = await supabase.from("projects").select("id, name");

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Maps Overview</h1>
        <p className="text-slate-500 mt-2">A global view of all your geographic territories.</p>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Global Map Coming Soon</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          This dashboard will eventually feature a unified global map showing all areas across all projects. 
          For now, please manage maps individually inside each project workspace.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {projects?.map(project => (
            <Link 
              key={project.id} 
              href={`/dashboard/projects/${project.id}`}
              className="px-4 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors text-left flex items-center justify-between group"
            >
              <span className="truncate">{project.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
