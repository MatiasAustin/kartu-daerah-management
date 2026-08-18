"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Clock, User, X } from "lucide-react";
import { getAreaComments, postAreaComment } from "@/app/actions/commentActions";

export function PublicAreaComments({ 
  area, 
  onClose,
  publisherId,
  publisherName,
  className
}: { 
  area: any; 
  onClose?: () => void;
  publisherId: string | null;
  publisherName: string | null;
  className?: string;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (area?.id) {
      loadComments();
    }
  }, [area?.id]);

  const loadComments = async () => {
    setIsLoading(true);
    const res = await getAreaComments(area.id);
    if (res.data) setComments(res.data);
    setIsLoading(false);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !area?.id) return;
    
    setIsPosting(true);
    const res = await postAreaComment(area.id, publisherId, newComment.trim());
    if (res.success) {
      setNewComment("");
      await loadComments();
    }
    setIsPosting(false);
  };

  if (!area) return null;

  return (
    <div className={className || "absolute bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 md:rounded-t-2xl md:rounded-b-lg bg-white shadow-2xl md:shadow-xl border-t md:border border-slate-200 flex flex-col z-50 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300 h-[60vh] md:h-[500px]"}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white md:rounded-t-2xl shrink-0">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Comments & History</h3>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{area.name || `Area ${area.area_number}`}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Assignment Info */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
        <User className="w-4 h-4 text-slate-400" />
        <div className="text-xs text-slate-600">
          Saat ini ditugaskan ke: <span className="font-semibold text-slate-800">{publisherName || "Belum ada (Unassigned)"}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            Belum ada komentar atau catatan.
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-xs text-slate-700">{c.publishers?.name || "Anonymous"}</span>
                <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm text-sm text-slate-800 w-fit max-w-[90%]">
                {c.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0 md:rounded-b-lg">
        {publisherId ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Kirim komentar sebagai ${publisherName}...`}
              className="flex-1 pl-4 pr-10 py-2.5 bg-slate-100 hover:bg-slate-200 focus:bg-white border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-sm rounded-full transition-all outline-none"
              disabled={isPosting}
            />
            <button 
              type="submit"
              disabled={isPosting || !newComment.trim()}
              className="absolute right-1.5 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </button>
          </form>
        ) : (
          <div className="text-xs text-center text-slate-500 py-2">
            Pilih penyiar untuk area ini dari Dashboard untuk mengaktifkan komentar.
          </div>
        )}
      </div>
    </div>
  );
}
