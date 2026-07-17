"use client";

import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, TileLayer } from "react-leaflet";

import { createPinIcon } from "@/components/map/map-icons";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  isFavorite?: boolean;
}

/** Mapa pequeño de solo lectura para la vista detalle. */
export default function MiniMap({
  latitude,
  longitude,
  isFavorite = false,
}: MiniMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      dragging
      className="h-full w-full"
      aria-label="Ubicación del establecimiento"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={createPinIcon(isFavorite)} />
    </MapContainer>
  );
}
