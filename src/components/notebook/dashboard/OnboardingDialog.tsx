"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Globe, Play, FileVideo } from "lucide-react";

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("chaibooklm_onboarded")) setOpen(true);
  }, []);

  function dismiss() {
    localStorage.setItem("chaibooklm_onboarded", "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to ChaibookLM 👋</DialogTitle>
          <DialogDescription>
            We've added sample notebooks so you can try the app right away — no upload needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><FileText className="w-4 h-4" /> A PDF source notebook</p>
          <p className="flex items-center gap-2"><FileVideo className="w-4 h-4" /> A VTT transcript notebook</p>
          <p className="flex items-center gap-2"><Globe className="w-4 h-4" /> A website source notebook</p>
          <p className="flex items-center gap-2"><Play className="w-4 h-4" /> A YouTube source notebook</p>
        </div>
        <DialogFooter>
          <Button onClick={dismiss}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}