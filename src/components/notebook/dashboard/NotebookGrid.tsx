import { ReactNode } from "react";

interface NotebookGridProps {
  children: ReactNode;
}

export function NotebookGrid({ children }: NotebookGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}