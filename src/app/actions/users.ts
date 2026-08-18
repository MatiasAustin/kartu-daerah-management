"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function inviteManagerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const groupId = formData.get("groupId") as string;
  
  if (!email || !groupId) {
    return { error: "Email and Group are required" };
  }

  try {
    // 1. Verify current user is authenticated and authorized (project owner/admin)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // 2. Initialize Admin Client
    const adminAuthClient = createAdminClient();

    // 3. Invite the user
    const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    });

    if (inviteError) {
      return { error: `Failed to invite user: ${inviteError.message}` };
    }

    const invitedUserId = inviteData.user.id;

    // 4. Assign the user to the group managers
    const { error: managerError } = await supabase
      .from("group_managers")
      .insert({
        group_id: groupId,
        user_id: invitedUserId,
      });

    if (managerError) {
      // If it's a unique constraint violation, they are already a manager
      if (managerError.code !== '23505') {
         return { error: `User invited, but failed to assign manager role: ${managerError.message}` };
      }
    }

    // 5. Add default group permissions (view, create, edit, delete areas within this group)
    const { error: permError } = await supabase
      .from("group_permissions")
      .insert({
        group_id: groupId,
        user_id: invitedUserId,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_manage_group: false,
        can_share: false
      });

    if (permError && permError.code !== '23505') {
       return { error: `User assigned, but failed to set permissions: ${permError.message}` };
    }

    revalidatePath("/dashboard/users");
    return { success: true, message: `Successfully invited ${email} and assigned to group.` };
    
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}
