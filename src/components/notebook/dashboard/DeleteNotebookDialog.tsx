"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface DeleteNotebookDialogProps {
  notebookName: string;
}

export function DeleteNotebookDialog({
  notebookName,
}: DeleteNotebookDialogProps) {
  function handleDelete() {
    console.log("Delete Notebook:", notebookName);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger 
        render= {
          <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        }
        />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Notebook?</AlertDialogTitle>

          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium">{notebookName}</span> and all of its
            sources. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <AlertDialogAction onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}