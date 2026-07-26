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
import type { Source } from "@/components/notebook/workspace/SourceList";

type SourceStep = "select" | "website" | "youtube" | "text";

interface UniversalSourceAreaProps {
  /** Notebook this source will be attached to. */
  notebookId: string;
  /** The element that opens the dialog. Pass whatever button/link markup you want — this component only owns the dialog itself. */
  trigger: React.ReactElement;
  /**
   * Called immediately once a source is submitted, before the network
   * request finishes — lets the parent show a "processing" placeholder in
   * the source list right away instead of blocking this dialog.
   */
  onOptimisticAdd?: (tempSource: Source) => void;
  /** Called once the background add request settles (success or failure). */
  onResolved?: () => void;
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

function truncateTitle(input: string, max = 100) {
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

export function UniversalSourceArea({
  notebookId,
  trigger,
  onOptimisticAdd,
  onResolved,
}: UniversalSourceAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SourceStep>("select");
  const [inputValue, setInputValue] = useState("");

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  async function postSource(body: FormData | Record<string, unknown>) {
    const isFormData = body instanceof FormData;

    const res = await fetch(`/api/notebooks/${notebookId}/sources`, {
      method: "POST",
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
      body: isFormData ? body : JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Something went wrong while adding this source.");
    }

    return data;
  }

  // Fires the create request in the background and reconciles the source
  // list once it settles — never awaited by the dialog itself.
  function submitInBackground(body: FormData | Record<string, unknown>) {
    postSource(body)
      .catch((err) => {
        console.error("Failed to add source:", err);
      })
      .finally(() => {
        onResolved?.();
      });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const EXTENSION_TO_SOURCE_TYPE: Record<string, Source["sourceType"]> = {
      pdf: "pdf",
      txt: "text",
      vtt: "vtt",
    };
    const sourceType = EXTENSION_TO_SOURCE_TYPE[extension];

    if (!sourceType) {
      alert("Unsupported file type. Please upload a .pdf, .txt, or .vtt file.");
      return;
    }

    onOptimisticAdd?.({
      _id: `temp-${crypto.randomUUID()}`,
      title: truncateTitle(file.name),
      fileName: file.name,
      sourceType,
      status: "processing",
    });

    resetAndClose();

    const formData = new FormData();
    formData.append("file", file);
    submitInBackground(formData);
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("select");
    setInputValue("");
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const payload =
      step === "text"
        ? { sourceType: "text" as const, textContent: inputValue }
        : { sourceType: step, url: inputValue };

    onOptimisticAdd?.({
      _id: `temp-${crypto.randomUUID()}`,
      title: truncateTitle(step === "text" ? inputValue : inputValue),
      url: step === "text" ? undefined : inputValue,
      sourceType: step as Source["sourceType"],
      status: "processing",
    });

    resetAndClose();
    submitInBackground(payload);
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

      <DialogTrigger render={trigger} />

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
              {/* <button
                onClick={() => {
                  setStep("select");
                  setInputValue("");
                }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button> */}
              <DialogTitle className="text-zinc-100">{STEP_META[step].title}</DialogTitle>
              <DialogDescription className="text-zinc-500">
                {STEP_META[step].description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2">
              {step === "text" ? (
                <Textarea
      placeholder="Paste your text here..."
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      className="
    h-[40vh]
    resize-none
    bg-zinc-950
    border-zinc-800
    shadow-none
    outline-none
    ring-0
    focus:ring-0
    focus-visible:ring-0
    focus-visible:outline-none
    focus-visible:border-zinc-700
  "
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

            <DialogFooter className="border-t border-zinc-800  shrink-0 border-0 ">
              {/* <Button
                variant="ghost"
                onClick={resetAndClose}
                className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </Button> */}
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="rounded-full bg-white text-zinc-900 hover:bg-zinc-200 gap-1.5"
              >
                Add source
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
