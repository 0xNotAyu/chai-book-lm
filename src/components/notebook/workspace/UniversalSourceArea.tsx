"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { UploadCloud, Globe, Type, ArrowLeft, Play, Loader2 } from "lucide-react";

type SourceStep = "select" | "website" | "youtube" | "text";

interface UniversalSourceAreaProps {
  /** Notebook this source will be attached to. */
  notebookId: string;
  /** The element that opens the dialog. Pass whatever button/link markup you want — this component only owns the dialog itself. */
  trigger: React.ReactElement;
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

export function UniversalSourceArea({ notebookId, trigger }: UniversalSourceAreaProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SourceStep>("select");
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await postSource(formData);

      router.refresh();
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("select");
    setInputValue("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const payload =
        step === "text"
          ? { sourceType: "text", textContent: inputValue }
          : { sourceType: step, url: inputValue };

      await postSource(payload);

      router.refresh();
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isSubmitting) return; // don't allow closing mid-submit
        setOpen(isOpen);
        if (!isOpen) {
          setStep("select");
          setInputValue("");
          setError(null);
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

            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                <p className="text-sm text-zinc-400">Uploading and indexing your file...</p>
              </div>
            ) : (
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
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <button
                onClick={() => {
                  setStep("select");
                  setInputValue("");
                  setError(null);
                }}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-1 transition-colors disabled:opacity-50"
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
                  disabled={isSubmitting}
                  className="min-h-37.5 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                />
              ) : (
                <Input
                  type="url"
                  placeholder="https://..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                />
              )}
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-2">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={resetAndClose}
                disabled={isSubmitting}
                className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isSubmitting}
                className="rounded-full bg-white text-zinc-900 hover:bg-zinc-200 gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSubmitting ? "Adding..." : "Submit"}
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
