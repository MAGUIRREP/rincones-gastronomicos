import type { Restaurant } from "@/types/database";

/**
 * Enlace a Google Maps para ver el establecimiento (y sus reseñas).
 * Se busca por nombre + dirección para aterrizar en la ficha del
 * negocio; si no hay dirección se usan las coordenadas.
 */
export function getGoogleMapsUrl(
  restaurant: Pick<
    Restaurant,
    "name" | "address" | "municipio" | "latitude" | "longitude"
  >,
): string {
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
