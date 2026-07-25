"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  onNewNotebook: () => void;
}

export function DashboardHeader({
  onNewNotebook,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ChaibookLM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage your AI research notebooks.
        </p>
      </div>

      <Button variant="outline" onClick={onNewNotebook}>
        <Plus className="h-4 w-4" />
      </Button>
    </header>
  );
}