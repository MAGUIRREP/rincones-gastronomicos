import type { Restaurant } from "@/types/database";

/** Dominios válidos para un enlace de Google Maps. */
export const GOOGLE_MAPS_URL_REGEX =
  /^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i;

/** ¿Es un enlace corto (compartir) que hay que expandir en servidor? */
export function isShortGoogleMapsUrl(url: string): boolean {
  return /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url.trim());
}

/**
 * Extrae latitud/longitud de un enlace de Google Maps.
 *
 * Se prueba en este orden:
 *  1. `!3d<lat>!4d<lng>` — la chincheta exacta del lugar (más precisa)
 *  2. `q=`, `query=`, `ll=`, `destination=` con coordenadas
 *  3. `@<lat>,<lng>` — el centro del visor (menos precisa)
 */
export function extractCoordsFromGoogleMapsUrl(
  url: string,
): { latitude: number; longitude: number } | null {
  const decoded = decodeURIComponent(url);

  const patterns = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/i,
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180
      ) {
        return { latitude, longitude };
      }
    }
  }
  return null;
}

/**
 * Enlace a Google Maps del establecimiento (para ver reseñas).
 * Si se guardó el enlace copiado de Google Maps se usa tal cual;
 * si no, se construye una búsqueda por nombre + dirección.
 */
export function getGoogleMapsUrl(
  restaurant: Pick<
    Restaurant,
    "name" | "address" | "municipio" | "latitude" | "longitude"
  > & { google_maps_url?: string | null },
): string {
  if (restaurant.google_maps_url) return restaurant.google_maps_url;

  const query = [restaurant.name, restaurant.address, restaurant.municipio]
    .filter(Boolean)
    .join(", ");

  if (query.length > restaurant.name.length) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  if (restaurant.latitude != null && restaurant.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}`;
}
