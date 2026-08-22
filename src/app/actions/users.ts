"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function inviteManagerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const groupId = formData.get("groupId") as string;
  const fullName = formData.get("fullName") as string;
  
  if (!email || !groupId || !fullName) {
    return { error: "Name, Email, and Group are required" };
  }

  try {
    // 1. Verify current user is authenticated and authorized (project owner/admin)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Verify ownership of the group's project
    const { data: groupData } = await supabase
      .from("groups")
      .select("projects!inner(owner_id)")
      .eq("id", groupId)
      .single();

    if (!groupData || groupData.projects.owner_id !== user.id) {
      return { error: "Unauthorized: You do not own this project." };
    }

    // 2. Initialize Admin Client
    const adminAuthClient = createAdminClient();

    let invitedUserId = "";

    // 3. First, check if the user is already registered (has a profile)
    const { data: existingProfile } = await adminAuthClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      invitedUserId = existingProfile.id;
      // Update their profile name if it was provided
      await adminAuthClient.from('profiles').update({ full_name: fullName }).eq('id', invitedUserId);
    } else {
      // 3b. If not registered, invite them
      const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      });

      if (inviteError) {
        if (inviteError.status === 429) {
           return { error: `Gagal mengirim undangan karena Supabase mencapai batas limit (Rate Limit). Coba lagi nanti atau minta user mendaftar sendiri.` };
        }
        return { error: `Failed to invite user: ${inviteError.message}` };
      }
      invitedUserId = inviteData.user.id;
    }

    // 4. Assign the user to the group managers
    const { error: managerError } = await adminAuthClient
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
    const { error: permError } = await adminAuthClient
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

export async function removeManagerAction(managerId: string, groupId: string, userId: string) {
  try {
    const supabase = await createClient();
    
    // Check if the current user is authorized (done via RLS, but we can just attempt delete)
    const { error } = await supabase
      .from("group_managers")
      .delete()
      .eq("id", managerId);

    if (error) {
      return { error: error.message };
    }

    // Also remove permissions
    await supabase
      .from("group_permissions")
      .delete()
      .match({ group_id: groupId, user_id: userId });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function updateManagerPermissionsAction(groupId: string, userId: string, permissions: any) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("group_permissions")
      .update(permissions)
      .match({ group_id: groupId, user_id: userId });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}

export async function updateUserProfileNameAction(userId: string, newName: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', userId);
    
    if (error) {
      return { error: error.message };
    }
    
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred" };
  }
}
