import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card
          key={index}
          className="group transition-all hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />

              <div className="min-w-0 flex-1 pt-1">
                <Skeleton className="h-5 w-20" />
              </div>
            </div>

            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
          </CardHeader>

          <CardContent>
            <Skeleton className="h-4 w-16" />
          </CardContent>

          <CardFooter className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />

            <Skeleton className="h-3 w-16 rounded-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}