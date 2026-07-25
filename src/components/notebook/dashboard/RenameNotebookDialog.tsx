"use client";

import { useEffect ,useState } from "react";

import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RenameNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenameSuccess: () => void;
  notebook: {
    id: string;
    title: string;
    emoji: string;
  } | null;
}

export function RenameNotebookDialog({
  notebook,
  open,
  onOpenChange,
  onRenameSuccess,
}: RenameNotebookDialogProps) {
  const [name, setName] = useState(notebook?.title ?? "");
  const [emoji, setEmoji] = useState(notebook?.emoji ?? "📙");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
  if (open && notebook) {
    setName(notebook.title);
    setEmoji(notebook.emoji);
  }
}, [open, notebook]);
  
  async function handleRename() {

  if (!notebook) return;

  try {
    const res = await fetch(`/api/notebooks/${notebook?.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: name,
        emoji,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to rename notebook");
    }

    onRenameSuccess();
    onOpenChange(false);
  } catch (error) {
    console.error(error);
  }
}

  function handleEmojiSelect(emojiData: EmojiClickData) {
    setEmoji(emojiData.emoji);
    setShowPicker(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit notebook</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker((prev) => !prev)}
              className="flex h-36 w-36 items-center justify-center rounded-full bg-muted text-6xl transition hover:bg-muted/80"
            >
              {emoji}
            </button>

            {showPicker && (
              <div className="absolute left-full top-0 ml-4 z-50">
                <EmojiPicker
                  theme={Theme.DARK}
                  lazyLoadEmojis
                  onEmojiClick={handleEmojiSelect}
                />
              </div>
            )}
          </div>
        </div>

        <Input
          value={name}
          placeholder="Notebook name"
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>
          <Button variant="outline"  onClick={() => onOpenChange(false)}>Cancel</Button>

          <Button
            onClick={handleRename}
            disabled={
            name.trim() === notebook?.title &&
            emoji === notebook?.emoji
          }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}