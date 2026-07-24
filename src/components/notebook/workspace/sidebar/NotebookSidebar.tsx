import { NotebookInfo } from "./NotebookInfo";
import { AddSourceButton } from "./AddSourceButton";
import { SourceList } from "./SourceList";

export function NotebookSidebar() {
  return (
    <aside className="flex h-full w-80 flex-col border-r bg-background">
      <div className="space-y-4 border-b p-4">
        <NotebookInfo />
        <AddSourceButton />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <SourceList />
      </div>
    </aside>
  );
}