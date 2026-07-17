import { PHOTOS_BUCKET } from "@/lib/constants";
import type { Photo } from "@/types/database";

/**
 * URL pública de una foto en Supabase Storage.
 * El bucket es público, así que la URL es directa (servida por CDN).
 */
export function getPhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;
}

/** Foto principal (o la primera disponible) de un establecimiento. */
export function getMainPhoto(photos: Photo[] | undefined): Photo | null {
  if (!photos || photos.length === 0) return null;
  return photos.find((p) => p.is_main) ?? photos[0];
}

export function getMainPhotoUrl(photos: Photo[] | undefined): string | null {
  const main = getMainPhoto(photos);
  return main ? getPhotoUrl(main.storage_path) : null;
}
