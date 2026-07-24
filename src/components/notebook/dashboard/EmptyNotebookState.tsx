import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyNotebookState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>

      <h2 className="text-xl font-semibold">
        No notebooks yet
      </h2>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first notebook to organize documents, chat with AI, and
        explore your knowledge base.
      </p>

      <Button className="mt-6">
        Create Notebook
      </Button>
    </div>
  );
}