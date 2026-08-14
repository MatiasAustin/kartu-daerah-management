import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-2">View and manage system administrators and area managers.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">User Directory</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          User management is currently handled securely via your Supabase Authentication Dashboard. 
          New users and roles can be configured there.
        </p>
        <a 
          href="https://supabase.com/dashboard/project/_/auth/users" 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Open Supabase Dashboard
        </a>
      </div>
    </div>
  );
}
