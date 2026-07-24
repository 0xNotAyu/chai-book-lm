import { DashboardHeader } from "@/components/notebook/dashboard/DashboardHeader";
import { NotebookGrid } from "@/components/notebook/dashboard/NotebookGrid";
import { NotebookCard } from "@/components/notebook/dashboard/NotebookCard";
import { RenameNotebookDialog } from "@/components/notebook/dashboard/RenameNotebookDialog";
import { DeleteNotebookDialog } from "@/components/notebook/dashboard/DeleteNotebookDialog";
import { EmptyNotebookState } from "@/components/notebook/dashboard/EmptyNotebookState";
import { LoadingState } from "@/components/notebook/dashboard/LoadingState";

export default function Dashboard() {
  // Temporary UI state (replace with API later)
  const isLoading = false;

  const notebooks = [
    {
      id: "1",
      title: "Machine Learning",
      sourceCount: 5,
      updatedAt: "2 hours ago",
    },
    {
      id: "2",
      title: "Deep Learning",
      sourceCount: 12,
      updatedAt: "1 day ago",
    },
    {
      id: "3",
      title: "LangChain Notes",
      sourceCount: 8,
      updatedAt: "3 hours ago",
    },
    {
      id: "4",
      title: "RAG Research",
      sourceCount: 15,
      updatedAt: "Just now",
    },
  ];
  

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <DashboardHeader />

        <section className="mt-12">
          {isLoading ? (
            <LoadingState />
          ) : notebooks.length === 0 ? (
            <EmptyNotebookState />
          ) : (
            <NotebookGrid>
              {notebooks.map((notebook) => (
                <NotebookCard
                  key={notebook.id}
                  title={notebook.title}
                  sourceCount={notebook.sourceCount}
                  updatedAt={notebook.updatedAt}
                />
              ))}
            </NotebookGrid>
          )}
        </section>
      </div>

      {/* Dialogs */}
     
    </main>
  );
}