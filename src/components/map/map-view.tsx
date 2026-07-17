"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Wrapper con carga dinámica (sin SSR) del mapa principal.
 * Leaflet necesita `window`, por lo que solo puede renderizarse en cliente.
 */
export const MapView = dynamic(
  () => import("@/components/map/restaurants-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-xl" />,
  },
);

export type { MapRestaurant } from "@/components/map/restaurants-map";
