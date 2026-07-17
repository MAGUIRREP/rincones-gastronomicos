"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { createPinIcon } from "@/components/map/map-icons";
import { Button } from "@/components/ui/button";
import { SPAIN_CENTER, SPAIN_ZOOM } from "@/lib/constants";
import { getPhotoUrl } from "@/lib/photos";

export interface MapRestaurant {
  id: string;
  name: string;
  type: string;
  address: string | null;
  municipio: string | null;
  rating: number | null;
  latitude: number;
  longitude: number;
  is_favorite: boolean;
  photoPath: string | null;
}

interface RestaurantsMapProps {
  restaurants: MapRestaurant[];
  /** Id de establecimiento a enfocar al cargar (parámetro ?focus). */
  focusId?: string;
  className?: string;
}

/** Centra el mapa en el establecimiento indicado por ?focus. */
function FocusHandler({
  restaurants,
  focusId,
}: {
  restaurants: MapRestaurant[];
  focusId?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusId) return;
    const target = restaurants.find((r) => r.id === focusId);
    if (target) {
      map.setView([target.latitude, target.longitude], 16, { animate: true });
    }
  }, [focusId, restaurants, map]);

  return null;
}

export default function RestaurantsMap({
  restaurants,
  focusId,
  className,
}: RestaurantsMapProps) {
  const icons = useMemo(
    () => ({
      normal: createPinIcon(false),
      favorite: createPinIcon(true),
    }),
    [],
  );

  return (
    <MapContainer
      center={SPAIN_CENTER}
      zoom={SPAIN_ZOOM}
      scrollWheelZoom
      className={className ?? "h-full w-full"}
      aria-label="Mapa de establecimientos"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
        {restaurants.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={r.is_favorite ? icons.favorite : icons.normal}
            alt={r.name}
          >
            <Popup minWidth={220} maxWidth={260}>
              <div className="space-y-2">
                {r.photoPath && (
                  <div className="relative h-28 w-full overflow-hidden rounded-md">
                    <Image
                      src={getPhotoUrl(r.photoPath)}
                      alt={`Foto de ${r.name}`}
                      fill
                      sizes="260px"
                      className="object-cover"
                    />
                  </div>
                )}
                <p className="font-semibold leading-tight">{r.name}</p>
                {r.rating != null && (
                  <p className="flex items-center gap-1 text-sm">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {r.rating}/5
                  </p>
                )}
                {(r.address || r.municipio) && (
                  <p className="text-xs text-muted-foreground">
                    {[r.address, r.municipio].filter(Boolean).join(", ")}
                  </p>
                )}
                <Button asChild size="sm" className="w-full">
                  <Link href={`/restaurantes/${r.id}`}>Ver ficha</Link>
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      <FocusHandler restaurants={restaurants} focusId={focusId} />
    </MapContainer>
  );
}
