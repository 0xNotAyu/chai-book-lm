interface NotebookPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NotebookPage({
  params,
}: NotebookPageProps) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Notebook {id}</h1>
        <p className="text-muted-foreground">
          Workspace coming soon.
        </p>
      </div>
    </main>
  );
}