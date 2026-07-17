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

  const handleFiles = async (files: FileList | null) => {
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

      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full border-dashed py-8"
      >
        {uploading ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Comprimiendo y subiendo…
          </>
        ) : (
          <>
            <ImagePlus className="size-5" aria-hidden="true" />
            Añadir fotografías (se comprimen automáticamente)
          </>
        )}
      </Button>

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
