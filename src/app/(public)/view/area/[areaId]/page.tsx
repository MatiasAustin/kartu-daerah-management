import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintAreaCard } from "@/components/dashboard/PrintAreaCard";
import { PublicAreaComments } from "@/components/public/PublicAreaComments";

export default async function PublicAreaPreviewPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;
  
  // Use a service role key or just normal client without auth requirement
  // Since we use the public URL and anon key, we need to ensure RLS allows reading areas if they have the UUID,
  // OR we can bypass RLS here because knowing the UUID is the "token". 
  // Wait, if RLS is enabled, the anon user might not be able to read it!
  // Let's use the standard client. If RLS blocks it, we might have an issue.
  // Actually, we can use an admin bypass if needed, but Next.js server actions / server components can use service_role if we create an admin client.
  // I will just use the normal client first. If it fails, I'll update RLS or use service role.
  
  // Wait, `createClient` uses the cookie store. Let's check how `/view/[token]` does it.
  // `/view/[token]` uses `createClient()` directly. If it works there, it must mean the tables are readable by anon, OR we need an admin client.
  // Let's look at `createClient` from `@/lib/supabase/server`.
  const supabase = await createClient();

  // Fetch Area
  const { data: area, error: areaError } = await supabase
    .from("areas")
    .select("*")
    .eq("id", areaId)
    .single();

  if (areaError || !area) {
    return notFound();
  }

  // Fetch Group
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", area.group_id)
    .single();

  // Fetch Project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", area.project_id)
    .single();

  if (!group || !project) {
    return notFound();
  }

  // Fetch active assignment for this area
  const { data: assignment } = await supabase
    .from("area_assignments")
    .select("publisher_id")
    .eq("area_id", areaId)
    .eq("is_active", true)
    .single();

  let publisherName = null;
  let publisherId = null;
  if (assignment?.publisher_id) {
    publisherId = assignment.publisher_id;
    const { data: pub } = await supabase
      .from("publishers")
      .select("name")
      .eq("id", publisherId)
      .single();
    if (pub) {
      publisherName = pub.name;
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="flex-1 overflow-auto">
        <PrintAreaCard project={project} group={group} area={{ ...area, publisher_name: publisherName }} isPublicView={true} />
      </div>
      {/* Sidebar for Comments on Desktop, Bottom on Mobile */}
      <div className="w-full md:w-96 md:h-screen md:border-l border-slate-200 bg-white md:sticky top-0 shadow-lg relative z-10 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-white">
          <h2 className="font-semibold text-slate-800">Area Status & Comments</h2>
          {publisherName ? (
             <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-md">
               <span className="text-xs text-emerald-600 block mb-1">Assigned to:</span>
               <div className="flex items-center gap-1.5 font-medium text-emerald-800 text-sm">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 {publisherName}
               </div>
             </div>
          ) : (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500">
               Unassigned
            </div>
          )}
        </div>
        <div className="flex-1 relative">
           <PublicAreaComments 
             area={area} 
             publisherId={publisherId} 
             publisherName={publisherName} 
             className="flex flex-col h-full bg-slate-50"
           />
        </div>
      </div>
    </div>
  );
}
