"use client";

import { useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, emoji: string) => Promise<void>;
}

export function CreateNotebookDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateNotebookDialogProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📙");
  const [showPicker, setShowPicker] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    console.log("Dialog emoji:", emoji);

    await onCreate(name, emoji);

    setName("");
    setEmoji("📙");
    setShowPicker(false);

    onOpenChange(false);
  }

  function handleEmojiSelect(emojiData: EmojiClickData) {
    console.log(emojiData.emoji);
    setEmoji(emojiData.emoji);
    console.log(emojiData.emoji);
    setShowPicker(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create notebook</DialogTitle>
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
                  onEmojiClick={handleEmojiSelect}
                  lazyLoadEmojis
                  theme={Theme.DARK}
                />
              </div>
            )}
          </div>
        </div>

        <Input
          placeholder="New notebook"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

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