import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PrintAreaCard } from "@/components/dashboard/PrintAreaCard";
import { PrintButton } from "@/components/dashboard/PrintButton";

export default async function PrintAreaPage({
  params,
}: {
  params: { projectId: string; areaId: string };
}) {
  const supabase = await createClient();

  // Verify auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch Area
  const { data: area, error: areaError } = await supabase
    .from("areas")
    .select("*")
    .eq("id", params.areaId)
    .single();

  if (areaError || !area || area.project_id !== params.projectId) {
    return notFound();
  }

  // Fetch Group
  const { data: group } = await supabase
    .from("area_groups")
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

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:py-0 print:bg-white flex justify-center">
      <div className="w-full max-w-4xl bg-white shadow-2xl print:shadow-none overflow-hidden rounded-xl print:rounded-none">
        
        {/* Print instructions overlay (hidden during print) */}
        <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center print:hidden rounded-t-xl">
          <div>
            <h2 className="font-bold">Print Preview Mode</h2>
            <p className="text-sm text-indigo-200">Adjust your browser print settings to A4/Letter size. Enable "Background graphics" if colors are missing.</p>
          </div>
          <PrintButton />
        </div>

        <PrintAreaCard project={project} group={group} area={area} />
      </div>
    </div>
  );
}
