"use client";

import { useState } from "react";
import { Moon, Sun, Bell, Globe, Shield, Smartphone, Map, Key } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MapDataSourceClient } from "./MapDataSourceClient";
import { ApiKeysClient } from "./ApiKeysClient";
import { BoundaryImportClient } from "./BoundaryImportClient";

export function SettingsClient({ user }: { user: any }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "map" | "keys" | "boundaries">("general");

  const tabs = [
    { id: "general", label: "General", icon: Smartphone },
    { id: "map", label: "Map Data Source", icon: Map },
    { id: "keys", label: "API Keys", icon: Key },
    { id: "boundaries", label: "Import Boundaries", icon: Globe },
  ] as const;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row min-h-[60vh] overflow-hidden">
      
      {/* Sidebar Tabs */}
      <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0">
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-indigo-100 text-indigo-700" 
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col">
        {activeTab === "general" && (
          <div className="space-y-8 flex-1">
            {/* Account Settings */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" /> Account Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div className="font-medium text-slate-500">Email Address</div>
                <div className="sm:col-span-2 text-slate-900 font-mono bg-slate-50 px-3 py-1.5 rounded-md inline-block border border-slate-100">{user.email}</div>
                
                <div className="font-medium text-slate-500">User ID</div>
                <div className="sm:col-span-2 text-slate-900 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-md inline-block border border-slate-100 break-all">{user.id}</div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-500" /> App Preferences
              </h3>
              
              <div className="space-y-4 max-w-lg">
                {/* Dark Theme */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${darkMode ? "bg-slate-800 text-yellow-400" : "bg-slate-100 text-slate-600"}`}>
                      {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Dark Theme</p>
                      <p className="text-xs text-slate-500">Switch between light and dark mode</p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={(val) => {
                    setDarkMode(val);
                    if (val) {
                      alert("Dark mode will be fully implemented in a future update!");
                    }
                  }} />
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Email Notifications</p>
                      <p className="text-xs text-slate-500">Receive alerts when areas are updated</p>
                    </div>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>

                {/* Language */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Language</p>
                      <p className="text-xs text-slate-500">Select application language</p>
                    </div>
                  </div>
                  <select className="text-sm border border-slate-200 rounded-md py-1.5 px-3 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "map" && <MapDataSourceClient />}
        {activeTab === "keys" && <ApiKeysClient />}
        {activeTab === "boundaries" && <BoundaryImportClient />}

        {/* Footer Branding */}
        <div className="mt-auto pt-8 flex flex-col items-center justify-center gap-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Dev by Sidang Cikampek</p>
          <p className="text-[10px] text-slate-400">GeoManager v1.0.0 &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
