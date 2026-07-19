"use client";

import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  addPhotoAction,
  deletePhotoAction,
  importPhotoFromUrlAction,
  setMainPhotoAction,
} from "@/app/actions/restaurants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PHOTO_MAX_DIMENSION,
  PHOTO_MAX_SIZE_MB,
  PHOTOS_BUCKET,
} from "@/lib/constants";
import { getPhotoUrl } from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/database";

interface PhotoManagerProps {
  restaurantId: string;
  photos: Photo[];
}

/**
 * Gestión de fotografías: subida múltiple con compresión automática
 * en el navegador, previsualización, foto principal y borrado.
 */
export function PhotoManager({ restaurantId, photos }: PhotoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const supabase = createClient();
    let uploaded = 0;

    for (const file of Array.from(files)) {
      try {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} no es una imagen`);
          continue;
        }

        // Compresión automática antes de subir (ahorra Storage y ancho de banda).
        const compressed = await imageCompression(file, {
          maxSizeMB: PHOTO_MAX_SIZE_MB,
          maxWidthOrHeight: PHOTO_MAX_DIMENSION,
          useWebWorker: true,
          fileType: "image/webp",
        });

        const path = `${restaurantId}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, compressed, {
            contentType: "image/webp",
            cacheControl: "31536000",
          });

        if (uploadError) {
          toast.error(`Error subiendo ${file.name}: ${uploadError.message}`);
          continue;
        }

        const result = await addPhotoAction(restaurantId, path, false);
        if (!result.success) {
          toast.error(result.error ?? "Error registrando la foto");
          continue;
        }
        uploaded++;
      } catch {
        toast.error(`No se pudo procesar ${file.name}`);
      }
    }

    if (uploaded > 0) {
      toast.success(
        uploaded === 1 ? "Foto subida" : `${uploaded} fotos subidas`,
      );
      router.refresh();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (photoId: string) => {
    setBusyPhotoId(photoId);
    const result = await deletePhotoAction(photoId);
    if (result.success) {
      toast.success("Foto eliminada");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar");
    }
    setBusyPhotoId(null);
  };

  /** Extrae TODAS las URLs candidatas de un arrastre desde otra web. */
  const extractDraggedImageUrls = (dt: DataTransfer): string[] => {
    const clean = (u: string) =>
      u.trim().replaceAll("&amp;", "&").split(/\s+/)[0];
    const urls: string[] = [];
    const push = (u: string | undefined | null) => {
      if (u && /^https?:\/\//i.test(u.trim())) urls.push(clean(u));
    };

    // El <img> del HTML arrastrado suele traer la URL real de la imagen
    // (Google Fotos, resultados de Google…), aunque la uri-list apunte
    // a la página que la contiene.
    const html = dt.getData("text/html");
    if (html) {
      for (const m of html.matchAll(/<img[^>]+\bsrc=["']([^"']+)["']/gi)) {
        push(m[1]);
      }
      for (const m of html.matchAll(/<img[^>]+\bsrcset=["']([^"']+)["']/gi)) {
        // Del srcset, la última entrada suele ser la de mayor resolución.
        const parts = m[1].split(",").map((p) => p.trim().split(/\s+/)[0]);
        push(parts[parts.length - 1]);
        push(parts[0]);
      }
    }

    const uri = dt.getData("text/uri-list") || dt.getData("text/plain");
    if (uri) {
      for (const line of uri.split("\n")) {
        if (line.trim() && !line.startsWith("#")) push(line);
      }
    }

    return [...new Set(urls)];
  };

  /**
   * Variantes de una URL de googleusercontent: las miniaturas llevan
   * un sufijo de tamaño (=w408-h306-no…) que se puede cambiar por
   * =s0 (resolución completa, sin recortes).
   */
  const withGoogleVariants = (url: string): string[] => {
    try {
      const u = new URL(url);
      if (!u.hostname.endsWith("googleusercontent.com")) return [url];
      const eqIdx = u.pathname.lastIndexOf("=");
      if (eqIdx > 0) {
        const full = new URL(u);
        full.pathname = `${u.pathname.slice(0, eqIdx)}=s0`;
        full.search = "";
        return [full.toString(), url];
      }
      return [`${u.origin}${u.pathname}=s0`, url];
    } catch {
      return [url];
    }
  };

  /** Firma binaria mínima: ¿estos bytes parecen una imagen? */
  const looksLikeImage = (head: Uint8Array): boolean => {
    const ascii = (s: number, e: number) => String.fromCharCode(...head.slice(s, e));
    return (
      (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) || // JPEG
      (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e) || // PNG
      (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") || // WebP
      ascii(4, 8) === "ftyp" || // AVIF/HEIF
      ascii(0, 4) === "GIF8" // GIF
    );
  };

  /**
   * Intenta descargar la imagen DESDE EL NAVEGADOR del usuario:
   * es la única forma de leer URLs ligadas a su sesión (Google Fotos).
   * Si el CDN no permite CORS, falla y se pasa al intento en servidor.
   */
  const tryClientFetch = async (url: string): Promise<File | null> => {
    try {
      const res = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size === 0) return null;

      let type = blob.type.split(";")[0];
      if (!type.startsWith("image/")) {
        const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
        if (!looksLikeImage(head)) return null;
        type = "image/jpeg"; // la compresión lo normaliza a WebP igualmente
      }
      return new File([blob], "imagen-importada", { type });
    } catch {
      return null;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    // 1) Archivos arrastrados desde el disco o desde el escritorio.
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
      return;
    }

    // 2) Imagen arrastrada desde otra web: probar cada URL candidata,
    //    primero en el navegador (sesión del usuario) y luego en el
    //    servidor (sin restricciones CORS).
    const candidates = extractDraggedImageUrls(e.dataTransfer)
      .flatMap(withGoogleVariants)
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .slice(0, 6);

    if (candidates.length === 0) {
      toast.error("No se reconoció ninguna imagen en lo que has arrastrado");
      return;
    }

    setUploading(true);
    let lastError: string | null = null;

    for (const url of candidates) {
      const file = await tryClientFetch(url);
      if (file) {
        setUploading(false);
        await handleFiles([file]);
        return;
      }

      const result = await importPhotoFromUrlAction(restaurantId, url);
      if (result.success) {
        setUploading(false);
        toast.success("Imagen importada");
        router.refresh();
        return;
      }
      lastError = result.error ?? null;
    }

    setUploading(false);
    toast.error(
      lastError ??
        "No se pudo importar. Descarga la imagen y arrástrala desde tu dispositivo.",
    );
  };

  const handleSetMain = async (photoId: string) => {
    setBusyPhotoId(photoId);
    const result = await setMainPhotoAction(photoId);
    if (result.success) {
      toast.success("Foto principal actualizada");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al actualizar");
    }
    setBusyPhotoId(null);
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        aria-label="Seleccionar fotografías para subir"
      />

      {/* Zona de subida: clic para elegir o arrastrar y soltar */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Añadir fotografías: haz clic para elegir archivos o arrastra imágenes aquí"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={handleDrop}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-colors",
          "focus-visible:outline-2 focus-visible:outline-ring",
          dragOver
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            <span>Procesando imagen…</span>
          </>
        ) : (
          <>
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="text-center font-medium">
              {dragOver
                ? "¡Suelta aquí las imágenes!"
                : "Haz clic para elegir o arrastra imágenes aquí"}
            </span>
            <span className="text-center text-xs">
              Vale arrastrar desde el explorador o directamente desde otra web.
              Se comprimen automáticamente.
            </span>
          </>
        )}
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border"
            >
              <Image
                src={getPhotoUrl(photo.storage_path)}
                alt="Fotografía del establecimiento"
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
              {photo.is_main && (
                <Badge className="absolute left-2 top-2 gap-1 shadow">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  Principal
                </Badge>
              )}
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2",
                  "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                )}
              >
                {!photo.is_main && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="size-8"
                        disabled={busyPhotoId === photo.id}
                        onClick={() => handleSetMain(photo.id)}
                        aria-label="Marcar como foto principal"
                      >
                        <Star className="size-4" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Marcar como principal</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="size-8"
                      disabled={busyPhotoId === photo.id}
                      onClick={() => handleDelete(photo.id)}
                      aria-label="Eliminar fotografía"
                    >
                      {busyPhotoId === photo.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
