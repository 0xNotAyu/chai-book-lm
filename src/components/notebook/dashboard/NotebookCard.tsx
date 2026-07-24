import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, BookOpen } from "lucide-react";

interface NotebookCardProps {
  title: string;
  description?: string;
  sourceCount: number;
  updatedAt: string;
}

export function NotebookCard({
  title,
  description,
  sourceCount,
  updatedAt,
}: NotebookCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="line-clamp-1">{title}</CardTitle>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{sourceCount} Sources</span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Updated {updatedAt}
        </span>

        <Button size="sm">Open</Button>
      </CardFooter>
    </Card>
  );
}