import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/utils/util";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotebookCardProps {
  id: string;
  title: string;
  emoji?: string;
  sourceCount: number;
  selected?: boolean;
  updatedAt: string;
  description?: string;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: () => void;
}

export function NotebookCard({
  id,
  title,
  emoji = "📙",
  description,
  sourceCount,
  updatedAt,
  selected,
  onRename,
  onDelete,
  onSelect,
}: NotebookCardProps) {
  return (
    <Card 
    onClick={onSelect}
    className={selected ? "border-primary" : "group transition-all hover:shadow-md"}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
            {emoji}
          </div>

          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{title}</CardTitle>

            {description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }>
            
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename?.(id);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>

            <DropdownMenuItem
            variant="destructive"
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <Link href={`/notebook/${id}`} className="block" onClick={(e) => e.stopPropagation()}>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {sourceCount} {sourceCount === 1 ? "Source" : "Sources"}
          </p>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(updatedAt)}
          </span>

          <Button size="sm">Open</Button>
        </CardFooter>
      </Link>
    </Card>
  );
}