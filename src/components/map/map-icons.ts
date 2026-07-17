import L from "leaflet";

/**
 * Iconos de marcador como SVG inline (divIcon): sin dependencias de
 * imágenes estáticas de Leaflet y con soporte de color por estado.
 */
function pinSvg(fill: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"
      fill="${fill}" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 2px 3px rgb(0 0 0 / .4))">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
    </svg>`;
}

export function createPinIcon(isFavorite: boolean) {
  return L.divIcon({
    html: pinSvg(isFavorite ? "#e11d48" : "#ea580c"),
    className: "bg-transparent border-0",
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}
