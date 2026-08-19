"use client";

import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getPhotoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/database";

interface PhotoGalleryProps {
  photos: Photo[];
  restaurantName: string;
}

/** Galería con miniaturas y visor a pantalla completa (lightbox). */
export function PhotoGallery({ photos, restaurantName }: PhotoGalleryProps) {
  const sorted = [...photos].sort(
    (a, b) => Number(b.is_main) - Number(a.is_main) || a.position - b.position,
  );
  const [selected, setSelected] = useState<number | null>(null);

  const next = useCallback(
    () => setSelected((s) => (s === null ? null : (s + 1) % sorted.length)),
    [sorted.length],
  );
  const prev = useCallback(
    () =>
      setSelected((s) =>
        s === null ? null : (s - 1 + sorted.length) % sorted.length,
      ),
    [sorted.length],
  );

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, next, prev]);

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="size-8" aria-hidden="true" />
          <p className="text-sm">Sin fotografías todavía</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          sorted.length === 1
            ? "grid-cols-1"
            : "grid-cols-4 grid-rows-2 [&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2",
        )}
      >
        {sorted.slice(0, 5).map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelected(i)}
            aria-label={`Ampliar fotografía ${i + 1} de ${restaurantName}`}
            className={cn(
              "group relative overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-ring",
              sorted.length === 1 ? "aspect-video" : "aspect-[4/3]",
            )}
          >
            <Image
              src={getPhotoUrl(photo.storage_path)}
              alt={`Fotografía ${i + 1} de ${restaurantName}`}
              fill
              sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "25vw"}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority={i === 0}
            />
            {i === 4 && sorted.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                +{sorted.length - 5}
              </span>
            )}
          </button>
        ))}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {/* Visor a casi pantalla completa: hay que sobrescribir el
            sm:max-w-lg que trae DialogContent por defecto. */}
        <DialogContent
          className="w-[96vw] max-w-[96vw] border-none bg-black/95 p-2 sm:max-w-[96vw] sm:p-3"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Fotografías de {restaurantName}
          </DialogTitle>
          {selected !== null && (
            <div className="relative">
              {/* Altura fija y object-contain: las fotos verticales
                  aprovechan todo el alto y las horizontales todo el ancho. */}
              <div className="relative h-[72dvh] w-full sm:h-[80dvh]">
                <Image
                  src={getPhotoUrl(sorted[selected].storage_path)}
                  alt={`Fotografía ${selected + 1} de ${restaurantName}`}
                  fill
                  sizes="96vw"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="mt-2 text-center text-sm text-white/70">
                {selected + 1} / {sorted.length}
              </p>
              {sorted.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={prev}
                    aria-label="Fotografía anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-80"
                  >
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={next}
                    aria-label="Fotografía siguiente"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-80"
                  >
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </Button>
                </>
              )}
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setSelected(null)}
                aria-label="Cerrar visor"
                className="absolute right-2 top-2 rounded-full opacity-80"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
