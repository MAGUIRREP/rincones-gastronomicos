"use client";

import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import { createPinIcon } from "@/components/map/map-icons";
import { SPAIN_CENTER, SPAIN_ZOOM } from "@/lib/constants";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onChange }: { onChange: LocationPickerProps["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      );
    },
  });
  return null;
}

/** Mapa interactivo del formulario: clic para fijar latitud/longitud. */
export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const hasPosition = latitude != null && longitude != null;

  return (
    <MapContainer
      center={hasPosition ? [latitude, longitude] : SPAIN_CENTER}
      zoom={hasPosition ? 15 : SPAIN_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
      aria-label="Selector de ubicación: haz clic en el mapa para fijar las coordenadas"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasPosition && (
        <Marker position={[latitude, longitude]} icon={createPinIcon(false)} />
      )}
      <ClickHandler onChange={onChange} />
    </MapContainer>
  );
}
