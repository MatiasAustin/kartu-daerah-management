"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { PublicAreaComments } from "./PublicAreaComments";

export function AreaCommentsSidebar({ 
  area, 
  publisherId, 
  publisherName 
}: { 
  area: any; 
  publisherId: string | null; 
  publisherName: string | null; 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button (Visible only on small screens) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 transition-transform active:scale-95 flex items-center justify-center"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/20 z-40 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:static inset-x-0 bottom-0 md:inset-auto
        w-full md:w-96 md:h-screen md:border-l border-slate-200 bg-white md:sticky top-0 
        shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-lg z-50 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-y-0 h-[85vh] rounded-t-2xl" : "translate-y-full md:translate-y-0 h-0 md:h-screen"}
      `}>
        {/* Mobile Drag Handle & Close */}
        <div className="md:hidden flex items-center justify-center py-3 border-b border-slate-100 bg-white rounded-t-2xl shrink-0 cursor-pointer" onClick={() => setIsOpen(false)}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Area Status & Comments</h2>
            <button onClick={() => setIsOpen(false)} className="md:hidden p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          {publisherName ? (
             <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-md">
               <span className="text-xs text-emerald-600 block mb-1">Assigned to:</span>
               <div className="flex items-center gap-1.5 font-medium text-emerald-800 text-sm">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 {publisherName}
               </div>
             </div>
          ) : (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500">
               Unassigned
            </div>
          )}
        </div>
        <div className="flex-1 relative overflow-hidden">
           <PublicAreaComments 
             area={area} 
             publisherId={publisherId} 
             publisherName={publisherName} 
             className="flex flex-col h-full bg-slate-50"
           />
        </div>
      </div>
    </>
  );
}