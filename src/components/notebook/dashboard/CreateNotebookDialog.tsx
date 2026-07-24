"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

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

export function CreateNotebookDialog() {
  const [name, setName] = useState("");

  function handleCreate() {
    console.log("Create Notebook:", name);
    setName("");
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Notebook
        </Button>
        }/>
        

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Notebook</DialogTitle>
          <DialogDescription>
            Give your notebook a name to get started.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Notebook name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}