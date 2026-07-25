"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DashboardNotebook {
  id: string;
  title: string;
  emoji: string;
  sourceCount: number;
  updatedAt: string;
}


interface DeleteNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook: DashboardNotebook | null;
  onDeleteSuccess: () => void;
}

export function DeleteNotebookDialog({
  open,
  onOpenChange,
  notebook,
  onDeleteSuccess,
}: DeleteNotebookDialogProps) {
  async function handleDelete() {
  if (!notebook) return;

  const res = await fetch(`/api/notebooks/${notebook.id}`, {
    method: "DELETE",
  });

  if (!res.ok) return;

  onDeleteSuccess();     // Refresh notebooks
  onOpenChange(false);   // Close dialog (selectedNotebook is cleared in Dashboard)
}

return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Notebook?</AlertDialogTitle>

          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium">{notebook?.title}</span> and all of its
            sources. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <AlertDialogAction onClick={handleDelete} variant='destructive'>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
