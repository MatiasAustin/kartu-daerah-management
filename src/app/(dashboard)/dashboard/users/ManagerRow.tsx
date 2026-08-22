"use client";

import { useState } from "react";
import { removeManagerAction, updateManagerPermissionsAction, updateUserProfileNameAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Trash2, Edit2, ShieldAlert, UserIcon, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function ManagerRow({ manager, canEdit = true }: { manager: any, canEdit?: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Permissions state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Name edit state
  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editName, setEditName] = useState(manager.profiles?.full_name || "");
  
  const [perms, setPerms] = useState({
    can_view: manager.permissions?.can_view ?? true,
    can_create: manager.permissions?.can_create ?? true,
    can_edit: manager.permissions?.can_edit ?? true,
    can_delete: manager.permissions?.can_delete ?? true,
    can_manage_group: manager.permissions?.can_manage_group ?? false,
    can_share: manager.permissions?.can_share ?? false,
  });

  const handleRemove = async () => {
    if (confirm("Are you sure you want to remove this manager?")) {
      setIsDeleting(true);
      const res = await removeManagerAction(manager.id, manager.groups.id, manager.user_id);
      setIsDeleting(false);
      if (res.error) alert(res.error);
    }
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    const res = await updateManagerPermissionsAction(manager.groups.id, manager.user_id, perms);
    setIsSaving(false);
    if (res.error) {
      alert(res.error);
    } else {
      setIsEditDialogOpen(false);
    }
  };

  const handleSaveName = async () => {
    setIsSavingName(true);
    const res = await updateUserProfileNameAction(manager.user_id, editName);
    setIsSavingName(false);
    if (res.error) {
      alert(res.error);
    } else {
      setIsEditNameDialogOpen(false);
    }
  };

  return (
    <>
      <tr className="bg-white border-b border-slate-100 hover:bg-slate-50">
        <td className="px-6 py-4">
          <div className="font-medium text-slate-900">
            {manager.profiles?.full_name || manager.profiles?.email || manager.user_id}
          </div>
          {manager.profiles?.full_name && manager.profiles?.email && (
            <div className="text-xs text-slate-500">{manager.profiles.email}</div>
          )}
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {manager.groups?.name || 'Unknown Group'}
          </span>
        </td>
        <td className="px-6 py-4 text-slate-500">
          {new Date(manager.created_at).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 text-right">
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 font-sans">
                <DropdownMenuItem onClick={() => setIsEditNameDialogOpen(true)}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Edit Name</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  <span>Edit Role</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRemove} disabled={isDeleting} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{isDeleting ? "Removing..." : "Remove"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-xs text-slate-400 italic">View only</span>
          )}
        </td>
      </tr>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] font-sans">
          <DialogHeader>
            <DialogTitle>Edit Manager Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Can View Areas</Label>
                <div className="text-xs text-slate-500">Allows viewing areas in this group.</div>
              </div>
              <input type="checkbox" checked={perms.can_view} onChange={(e) => setPerms({...perms, can_view: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Can Create Areas</Label>
                <div className="text-xs text-slate-500">Allows drawing new areas.</div>
              </div>
              <input type="checkbox" checked={perms.can_create} onChange={(e) => setPerms({...perms, can_create: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Can Edit Areas</Label>
                <div className="text-xs text-slate-500">Allows modifying existing areas.</div>
              </div>
              <input type="checkbox" checked={perms.can_edit} onChange={(e) => setPerms({...perms, can_edit: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Can Delete Areas</Label>
                <div className="text-xs text-slate-500">Allows deleting areas in this group.</div>
              </div>
              <input type="checkbox" checked={perms.can_delete} onChange={(e) => setPerms({...perms, can_delete: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSavePermissions} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
        <DialogContent className="sm:max-w-[400px] font-sans">
          <DialogHeader>
            <DialogTitle>Edit User Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-sm font-medium">Full Name</Label>
              <Input 
                id="editName" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="John Doe" 
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditNameDialogOpen(false)} disabled={isSavingName}>Cancel</Button>
            <Button onClick={handleSaveName} disabled={isSavingName} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
              {isSavingName ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
