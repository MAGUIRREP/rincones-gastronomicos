import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <UtensilsCrossed
        className="size-12 text-muted-foreground"
        aria-hidden="true"
      />
      <h1 className="text-3xl font-bold tracking-tight">Página no encontrada</h1>
      <p className="max-w-md text-muted-foreground">
        Este rincón no existe o ha sido eliminado. Quizá esté en otra mesa…
      </p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
