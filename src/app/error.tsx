"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <TriangleAlert className="size-12 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-bold tracking-tight">Algo ha salido mal</h1>
      <p className="max-w-md text-muted-foreground">
        Se ha producido un error inesperado. Puedes intentarlo de nuevo.
      </p>
      <Button onClick={reset}>
        <RefreshCcw className="size-4" aria-hidden="true" />
        Reintentar
      </Button>
    </main>
  );
}
