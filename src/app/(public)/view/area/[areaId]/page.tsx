import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintAreaCard } from "@/components/dashboard/PrintAreaCard";
import { AreaCommentsSidebar } from "@/components/public/AreaCommentsSidebar";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function PublicAreaPreviewPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;
  
  const supabase = await createAdminClient();

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
    <div className="relative min-h-screen bg-slate-50 flex flex-col md:flex-row print:block">
      <div className="flex-1 overflow-auto">
        <PrintAreaCard project={project} group={group} area={{ ...area, publisher_name: publisherName }} isPublicView={true} />
      </div>
      {/* Sidebar for Comments on Desktop, Bottom Toggle on Mobile — hidden when printing */}
      <div className="print:hidden">
        <AreaCommentsSidebar area={area} publisherId={publisherId} publisherName={publisherName} />
      </div>
    </div>
  );
}
