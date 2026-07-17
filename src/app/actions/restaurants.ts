"use server";

import { revalidatePath } from "next/cache";

import { PHOTOS_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  restaurantSchema,
  type RestaurantFormValues,
} from "@/lib/validations/restaurant";

export interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

function revalidateRestaurantPaths(id?: string) {
  revalidatePath("/");
  revalidatePath("/restaurantes");
  revalidatePath("/mapa");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/restaurantes/${id}`);
}

/** Crea un establecimiento con sus platos y vídeos. */
export async function createRestaurantAction(
  values: RestaurantFormValues,
): Promise<ActionResult> {
  const parsed = restaurantSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  const { favorite_dishes, videos, ...restaurant } = parsed.data;

  const { data: created, error } = await supabase
    .from("restaurants")
    .insert({
      ...restaurant,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { success: false, error: error?.message ?? "Error al crear" };
  }

  if (favorite_dishes.length > 0) {
    await supabase.from("favorite_dishes").insert(
      favorite_dishes.map((d, i) => ({
        restaurant_id: created.id,
        name: d.name,
        position: i,
      })),
    );
  }

  if (videos.length > 0) {
    await supabase.from("videos").insert(
      videos.map((v) => ({
        restaurant_id: created.id,
        youtube_url: v.youtube_url,
        title: v.title || null,
      })),
    );
  }

  revalidateRestaurantPaths(created.id);
  return { success: true, id: created.id };
}

/** Actualiza un establecimiento, reemplazando platos y vídeos. */
export async function updateRestaurantAction(
  id: string,
  values: RestaurantFormValues,
): Promise<ActionResult> {
  const parsed = restaurantSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  const { favorite_dishes, videos, ...restaurant } = parsed.data;

  const { error } = await supabase
    .from("restaurants")
    .update({ ...restaurant, updated_by: user.id })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // Reemplazo completo de platos y vídeos (más simple y auditable).
  await supabase.from("favorite_dishes").delete().eq("restaurant_id", id);
  if (favorite_dishes.length > 0) {
    await supabase.from("favorite_dishes").insert(
      favorite_dishes.map((d, i) => ({
        restaurant_id: id,
        name: d.name,
        position: i,
      })),
    );
  }

  await supabase.from("videos").delete().eq("restaurant_id", id);
  if (videos.length > 0) {
    await supabase.from("videos").insert(
      videos.map((v) => ({
        restaurant_id: id,
        youtube_url: v.youtube_url,
        title: v.title || null,
      })),
    );
  }

  revalidateRestaurantPaths(id);
  return { success: true, id };
}

/** Elimina un establecimiento (RLS: solo admin) y sus fotos de Storage. */
export async function deleteRestaurantAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Recoger rutas de fotos antes de borrar (el borrado es en cascada).
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("restaurant_id", id);

  const { error, count } = await supabase
    .from("restaurants")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  if (!count) {
    return {
      success: false,
      error: "No tienes permisos para eliminar (solo administradores)",
    };
  }

  if (photos && photos.length > 0) {
    await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove(photos.map((p) => p.storage_path));
  }

  revalidateRestaurantPaths(id);
  return { success: true };
}

/** Marca o desmarca un establecimiento como favorito. */
export async function toggleFavoriteAction(
  id: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("restaurants")
    .update({ is_favorite: isFavorite, updated_by: user.id })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidateRestaurantPaths(id);
  return { success: true };
}

/**
 * Expande un enlace corto de Google Maps (maps.app.goo.gl) siguiendo
 * la redirección en servidor, para poder extraer las coordenadas.
 */
export async function resolveGoogleMapsUrlAction(
  url: string,
): Promise<{ success: boolean; resolvedUrl?: string; error?: string }> {
  const trimmed = url.trim();
  // Solo dominios de enlaces cortos de Google (evita usar esto como proxy).
  if (!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(trimmed)) {
    return { success: false, error: "Enlace no válido" };
  }

  try {
    const res = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    return { success: true, resolvedUrl: res.url };
  } catch {
    return { success: false, error: "No se pudo resolver el enlace" };
  }
}

/**
 * Importa una imagen arrastrada desde otra web: se descarga en el
 * servidor (evita problemas de CORS) y se sube a Storage.
 */
export async function importPhotoFromUrlAction(
  restaurantId: string,
  imageUrl: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return { success: false, error: "URL de imagen no válida" };
  }

  // Solo HTTPS hacia hosts públicos (protección SSRF básica).
  if (parsed.protocol !== "https:") {
    return { success: false, error: "Solo se admiten imágenes por HTTPS" };
  }
  if (
    /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[)/i.test(
      parsed.hostname,
    )
  ) {
    return { success: false, error: "Host no permitido" };
  }

  const EXT_BY_TYPE: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };

  try {
    const res = await fetch(parsed, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { success: false, error: `No se pudo descargar la imagen (${res.status})` };
    }

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0];
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) {
      return {
        success: false,
        error: "El enlace no es una imagen compatible (JPG, PNG, WebP o AVIF)",
      };
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return { success: false, error: "La imagen supera el límite de 5 MB" };
    }
    if (buffer.byteLength === 0) {
      return { success: false, error: "La imagen está vacía" };
    }

    const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, buffer, {
        contentType,
        cacheControl: "31536000",
      });
    if (uploadError) return { success: false, error: uploadError.message };

    return addPhotoAction(restaurantId, path, false);
  } catch {
    return { success: false, error: "No se pudo descargar la imagen" };
  }
}

/** Registra una foto subida a Storage en la tabla photos. */
export async function addPhotoAction(
  restaurantId: string,
  storagePath: string,
  isMain: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sesión expirada" };

  const { data: existing } = await supabase
    .from("photos")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .limit(1);

  const shouldBeMain = isMain || !existing || existing.length === 0;

  if (shouldBeMain) {
    await supabase
      .from("photos")
      .update({ is_main: false })
      .eq("restaurant_id", restaurantId)
      .eq("is_main", true);
  }

  const { error } = await supabase.from("photos").insert({
    restaurant_id: restaurantId,
    storage_path: storagePath,
    is_main: shouldBeMain,
    created_by: user.id,
  });

  if (error) return { success: false, error: error.message };
  revalidateRestaurantPaths(restaurantId);
  return { success: true };
}

/** Elimina una foto (tabla + Storage). */
export async function deletePhotoAction(photoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("photos")
    .select("id, restaurant_id, storage_path, is_main")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) return { success: false, error: "Foto no encontrada" };

  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) return { success: false, error: error.message };

  await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);

  // Si era la principal, promover otra foto.
  if (photo.is_main) {
    const { data: next } = await supabase
      .from("photos")
      .select("id")
      .eq("restaurant_id", photo.restaurant_id)
      .order("position")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("photos").update({ is_main: true }).eq("id", next.id);
    }
  }

  revalidateRestaurantPaths(photo.restaurant_id);
  return { success: true };
}

/** Cambia la foto principal de un establecimiento. */
export async function setMainPhotoAction(photoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("photos")
    .select("id, restaurant_id")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) return { success: false, error: "Foto no encontrada" };

  await supabase
    .from("photos")
    .update({ is_main: false })
    .eq("restaurant_id", photo.restaurant_id)
    .eq("is_main", true);

  const { error } = await supabase
    .from("photos")
    .update({ is_main: true })
    .eq("id", photoId);

  if (error) return { success: false, error: error.message };
  revalidateRestaurantPaths(photo.restaurant_id);
  return { success: true };
}
