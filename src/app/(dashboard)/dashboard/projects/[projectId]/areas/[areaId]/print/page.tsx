import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PrintAreaCard } from "@/components/dashboard/PrintAreaCard";
import { PrintButton } from "@/components/dashboard/PrintButton";

export default async function PrintAreaPage({
  params,
}: {
  params: Promise<{ projectId: string; areaId: string }>;
}) {
  const { projectId, areaId } = await params;
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
    .eq("id", areaId)
    .single();

  if (areaError || !area || area.project_id !== projectId) {
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

  return <PrintAreaCard project={project} group={group} area={area} />;
}
