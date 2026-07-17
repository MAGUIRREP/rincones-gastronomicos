"use client";

import { MapView, type MapRestaurant } from "@/components/map/map-view";

/** Fila tal y como llega de getRestaurantsForMap(). */
export interface MapRow {
  id: string;
  name: string;
  type: string;
  address: string | null;
  municipio: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  is_favorite: boolean;
  photos: { storage_path: string; is_main: boolean }[];
}

export function toMapRestaurants(rows: MapRow[]): MapRestaurant[] {
  return rows
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      address: r.address,
      municipio: r.municipio,
      rating: r.rating,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      is_favorite: r.is_favorite,
      photoPath:
        r.photos.find((p) => p.is_main)?.storage_path ??
        r.photos[0]?.storage_path ??
        null,
    }));
}

interface HomeMapProps {
  restaurants: MapRow[];
  focusId?: string;
}

export function HomeMap({ restaurants, focusId }: HomeMapProps) {
  return <MapView restaurants={toMapRestaurants(restaurants)} focusId={focusId} />;
}
