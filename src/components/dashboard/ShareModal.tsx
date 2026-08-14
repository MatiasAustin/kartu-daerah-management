"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getShareToken, toggleShare } from "@/app/actions/shareActions";
import { Copy, ExternalLink, Globe } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  groupId?: string | null;
  title: string;
}

export function ShareModal({ isOpen, onClose, projectId, groupId, title }: ShareModalProps) {
  const [isActive, setIsActive] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadShareState();
    }
  }, [isOpen]);

  const loadShareState = async () => {
    setIsLoading(true);
    const { share } = await getShareToken(projectId, groupId);
    if (share) {
      setIsActive(share.is_active);
      setToken(share.token);
    } else {
      setIsActive(false);
      setToken(null);
    }
    setIsLoading(false);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    const newState = !isActive;
    await toggleShare(projectId, newState, groupId);
    await loadShareState();
    setIsToggling(false);
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine origin safely for SSR
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const shareUrl = token ? `${origin}/view/${token}` : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {title}</DialogTitle>
          <DialogDescription>
            {groupId 
              ? "Anyone with the link can view this specific group and its areas." 
              : "Anyone with the link can view all public groups and areas in this project."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 flex justify-center text-slate-500 text-sm">Loading share settings...</div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Public access</h4>
                  <p className="text-xs text-slate-500">{isActive ? "Link is active" : "Link is disabled"}</p>
                </div>
              </div>
              <button 
                onClick={handleToggle}
                disabled={isToggling}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isActive ? 'bg-indigo-600' : 'bg-slate-200'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {isActive && shareUrl && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label>Share URL</Label>
                <div className="flex space-x-2">
                  <Input value={shareUrl} readOnly className="bg-slate-50 text-slate-600 text-sm" />
                  <Button variant="secondary" onClick={handleCopy} className="shrink-0 w-24">
                    {copied ? "Copied!" : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {isActive && shareUrl && (
            <Button 
              type="button" 
              onClick={() => window.open(shareUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Preview
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
