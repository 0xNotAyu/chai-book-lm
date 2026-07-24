"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RenameNotebookDialogProps {
  currentName: string;
}

export function RenameNotebookDialog({
  currentName,
}: RenameNotebookDialogProps) {
  const [name, setName] = useState(currentName);

  function handleRename() {
    console.log("Rename Notebook:", name);
  }

  return (
    <Dialog>
      <DialogTrigger render={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }/>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Notebook</DialogTitle>
          <DialogDescription>
            Enter a new name for your notebook.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Notebook name"
        />

        <DialogFooter>
          <Button
            onClick={handleRename}
            disabled={!name.trim() || name === currentName}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}