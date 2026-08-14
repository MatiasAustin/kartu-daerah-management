import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-slate-50 print:bg-white print:overflow-visible print:h-auto">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full print:hidden">
        <Sidebar />
      </div>
      
      {/* Mobile Top Navigation */}
      <div className="md:hidden flex h-14 items-center justify-between border-b border-slate-200 bg-slate-900 px-4 shrink-0 print:hidden">
        <h1 className="text-lg font-bold tracking-tight text-white">GeoManager</h1>
        <MobileSidebar />
      </div>

      <main className="flex-1 overflow-y-auto relative flex flex-col print:overflow-visible print:block">
        {children}
      </main>
    </div>
  );
}
