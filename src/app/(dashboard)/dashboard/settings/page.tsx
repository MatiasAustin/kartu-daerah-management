import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-2">Manage your account and application preferences.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="space-y-8">
          
          <div>
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="font-medium text-slate-500">Email Address</div>
              <div className="sm:col-span-2 text-slate-900 font-mono">{session.user.email}</div>
              
              <div className="font-medium text-slate-500">User ID</div>
              <div className="sm:col-span-2 text-slate-900 font-mono text-xs">{session.user.id}</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2 mb-4">Preferences</h3>
            <p className="text-sm text-slate-500 mb-4">Application preferences (like dark mode and default map views) will be available in a future update.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
