"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FolderKanban, Users, Map, Settings, LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Maps Overview", href: "/dashboard/maps", icon: Map },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavLinks({ pathname, onNavigate }: { pathname: string, onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navigation.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium"
            )}
          >
            <item.icon
              className={cn(
                isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                "mr-3 h-5 w-5 flex-shrink-0"
              )}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold tracking-tight">GeoManager</h1>
      </div>
      
      <NavLinks pathname={pathname} />
      
      <div className="border-t border-slate-800 p-4">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-white" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800 px-2">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-slate-900 text-white border-r-slate-800 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">GeoManager</h1>
        </div>
        
        <NavLinks pathname={pathname} />
        
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={handleLogout}
            className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-white" />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
