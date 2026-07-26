"use client";

import { useEffect, useState } from "react";

import { DashboardHeader } from "@/components/notebook/dashboard/DashboardHeader";
import { NotebookGrid } from "@/components/notebook/dashboard/NotebookGrid";
import { NotebookCard } from "@/components/notebook/dashboard/NotebookCard";
import { CreateNotebookDialog } from "@/components/notebook/dashboard/CreateNotebookDialog";
import { EmptyNotebookState } from "@/components/notebook/dashboard/EmptyNotebookState";
import { LoadingState } from "@/components/notebook/dashboard/LoadingState";
import { RenameNotebookDialog } from "@/components/notebook/dashboard/RenameNotebookDialog";
import { DeleteNotebookDialog } from "./DeleteNotebookDialog";
import { OnboardingDialog } from "@/components/notebook/dashboard/OnboardingDialog";

interface Notebook {
  id: string;
  title: string;
  emoji: string;
  sourceCount: number;
  updatedAt: string;
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  
  useEffect(() => {
    fetchNotebooks();
  }, []);

      useEffect(() => {
}, [selectedNotebook]);

  async function fetchNotebooks() {
    try {
      setIsLoading(true);

      const res = await fetch("/api/notebooks");
      const data = await res.json();

      setNotebooks(
        data.map((notebook: any) => ({
          id: notebook._id,
          title: notebook.title,
          emoji: notebook.emoji,
          sourceCount: notebook.sourceCount ?? 0,
          updatedAt: notebook.updatedAt,
        }))
      );
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateNotebook(title: string, emoji: string) {
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title , emoji}),
      });

      const data = await res.json();

      if (!res.ok) {
          console.log(data);
          throw new Error(data.message);
      }

      setDialogOpen(false);
      await fetchNotebooks();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleRename(id: string) {
  const notebook = notebooks.find(n => n.id === id);
  if (!notebook) return;

  setSelectedNotebook(notebook);
  setIsRenameDialogOpen(true);

}
  async function handleDelete(id: string) {
  const notebook = notebooks.find(n => n.id === id);
  if (!notebook) return;

  setSelectedNotebook(notebook);
  setIsDeleteDialogOpen(true);
  }

  return (
    <main className="min-h-screen bg-background">
      <OnboardingDialog />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <DashboardHeader onNewNotebook={() => setDialogOpen(true)} />

        <CreateNotebookDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={handleCreateNotebook}
        />
        
        <RenameNotebookDialog
          open={isRenameDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsRenameDialogOpen(open)
              if (!open) setSelectedNotebook(null);
            }
          }}
          notebook={selectedNotebook}
          onRenameSuccess={fetchNotebooks}
        />

        <DeleteNotebookDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
          if (!open) setSelectedNotebook(null);
          }}
          notebook={selectedNotebook}
          onDeleteSuccess={fetchNotebooks}
        />

        <section className="mt-12">
          {isLoading ? (
            <LoadingState />
          ) : notebooks.length === 0 ? (
            <EmptyNotebookState
              onCreate={() => setDialogOpen(true)}
            />
          ) : (
            <NotebookGrid>
              {notebooks.map((notebook) => (
                <NotebookCard
                key={notebook.id}
                id={notebook.id}
                emoji={notebook.emoji}
                title={notebook.title}
                sourceCount={notebook.sourceCount}
                updatedAt={notebook.updatedAt}
                selected={selectedNotebook?.id === notebook.id}
                onSelect={() => setSelectedNotebook(notebook)}
                onRename={handleRename}
                onDelete={handleDelete}
              />
              ))}
            </NotebookGrid>
          )}
        </section>
      </div>
    </main>
  );
}