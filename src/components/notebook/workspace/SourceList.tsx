// src/components/notebook/workspace/SourceList.tsx
'use client';

import { useState } from "react";
import { 
  FileText, 
  Globe, 
  Type, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Trash2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type SourceType = 'pdf' | 'youtube' | 'website' | 'text';
export type SourceStatus = 'processing' | 'completed' | 'failed';

export interface Source {
  _id: string;
  title: string;
  fileName?: string;
  url?: string;
  sourceType: SourceType;
  status: SourceStatus;
}

interface SourceListProps {
  notebookId: string;
  sources: Source[];
  onSourceDeleted?: (sourceId: string) => void;
}

// 1. Source Item Component
function SourceItem({ source,notebookId, onDeleted }: { source: Source,notebookId: string, onDeleted?: (id: string) => void }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      // NOTE: Update this URL to match your exact backend route structure
      const response = await fetch(`/api/notebooks/${notebookId}/sources/${source._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete source');
      
      onDeleted?.(source._id);
    } catch (error) {
      console.error("Error deleting source:", error);
      // Optional: Add a toast notification here for errors
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const TypeIcon = {
    pdf: <FileText className="w-4 h-4 text-blue-500" />,
    youtube: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-red-500" viewBox="0 0 16 16">
        <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z"/>
      </svg>
    ),
    website: <Globe className="w-4 h-4 text-zinc-500" />,
    text: <Type className="w-4 h-4 text-zinc-500" />
  }[source.sourceType];

  const StatusIcon = {
    processing: <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    failed: <AlertCircle className="w-4 h-4 text-red-500" />
  }[source.status];

  return (
    <>
      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer border border-transparent hover:border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 bg-background p-1.5 rounded-md border shadow-sm">
            {TypeIcon}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium truncate">
              {source.title || source.fileName || "Untitled Source"}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {source.sourceType} • {source.status}
            </span>
          </div>
        </div>
        
        {/* Actions Container */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Status shown by default, hidden on hover */}
          <div className="block group-hover:hidden" title={`Status: ${source.status}`}>
            {StatusIcon}
          </div>
          
          {/* Trash shown only on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="hidden group-hover:flex p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the source 
              "{source.title || source.fileName}" and remove its extracted data from your notebook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                "Delete Source"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// 2. Main Source List Component
export function SourceList({ notebookId, sources = [], onSourceDeleted }: SourceListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold tracking-tight">Your Sources</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sources.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-4 mt-4 bg-muted/30 rounded-lg border border-dashed">
            No sources added yet.
          </div>
        ) : (
          sources.map((source) => (
            <SourceItem 
              key={source._id} 
              source={source} 
              notebookId={notebookId}
              onDeleted={onSourceDeleted} 
            />
          ))
        )}
      </div>
    </div>
  );
}