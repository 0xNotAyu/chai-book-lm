// src/components/dashboard/

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ChaibookLM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage your AI research notebooks.
        </p>
      </div>

      <Button>
        <Plus className="mr-2 h-4 w-4" />
        New Notebook
      </Button>
    </header>
  );
}