"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadCloud, Globe, Type, ArrowLeft, Play } from "lucide-react";

type SourceStep = "select" | "website" | "youtube" | "text";

interface UniversalSourceAreaProps {
  /** The element that opens the dialog. Pass whatever button/link markup you want — this component only owns the dialog itself. */
  trigger: React.ReactNode;
}

const STEP_META: Record<Exclude<SourceStep, "select">, { title: string; description: string }> = {
  website: {
    title: "Add website URL",
    description: "Paste a link and we'll extract the page content.",
  },
  youtube: {
    title: "Add YouTube video",
    description: "Paste a video URL and we'll pull the transcript.",
  },
  text: {
    title: "Add copied text",
    description: "Paste raw text below to add it as a source.",
  },
};

export function UniversalSourceArea({ trigger }: UniversalSourceAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SourceStep>("select");
  const [inputValue, setInputValue] = useState("");

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      // Ready for API integration
      setOpen(false);
    }
    if (e.target) e.target.value = "";
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("select");
    setInputValue("");
  };

  const handleSubmit = () => {
    console.log(`Submitting ${step}:`, inputValue);
    // Ready for API integration
    resetAndClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setStep("select");
          setInputValue("");
        }
      }}
    >
      <input
        type="file"
        className="hidden"
        accept=".pdf,.txt,.vtt"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <DialogTrigger >{trigger}</DialogTrigger>

      <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-3xl sm:max-w-md">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Add sources</DialogTitle>
              <DialogDescription className="text-zinc-500">
                Choose a source type to ingest into this notebook.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <SourceOption
                icon={<UploadCloud className="w-5 h-5" />}
                label="Upload files"
                sublabel="PDF, TXT, VTT"
                onClick={handleFileUpload}
              />
              <SourceOption
                icon={<Globe className="w-5 h-5" />}
                label="Website"
                sublabel="Paste a URL"
                onClick={() => setStep("website")}
              />
              <SourceOption
                icon={<Play className="w-5 h-5 text-red-500" />}
                label="YouTube"
                sublabel="Video transcript"
                onClick={() => setStep("youtube")}
              />
              <SourceOption
                icon={<Type className="w-5 h-5" />}
                label="Copied text"
                sublabel="Paste raw text"
                onClick={() => setStep("text")}
              />
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <button
                onClick={() => {
                  setStep("select");
                  setInputValue("");
                }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <DialogTitle className="text-zinc-100">{STEP_META[step].title}</DialogTitle>
              <DialogDescription className="text-zinc-500">
                {STEP_META[step].description}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              {step === "text" ? (
                <Textarea
                  placeholder="Paste your text here..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="min-h-37.5 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                />
              ) : (
                <Input
                  type="url"
                  placeholder="https://..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                />
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={resetAndClose}
                className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="rounded-full bg-white text-zinc-900 hover:bg-zinc-200"
              >
                Submit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SourceOption({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 h-24 p-3 rounded-2xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors text-left"
    >
      <span className="text-zinc-300">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="block text-xs text-zinc-500">{sublabel}</span>
      </span>
    </button>
  );
}