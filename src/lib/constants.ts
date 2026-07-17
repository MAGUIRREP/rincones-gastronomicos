import type { EstablishmentType } from "@/types/database";

export const APP_NAME = "Los rincones gastronómicos de Álvaro y Mariano";
export const APP_DESCRIPTION =
  "Los mejores bares y restaurantes de España, descubiertos y catalogados por Álvaro y Mariano.";

/** Minutos de inactividad antes de cerrar la sesión automáticamente. */
export const SESSION_TIMEOUT_MINUTES = 30;

/** Cookie que registra la última actividad del usuario. */
export const LAST_ACTIVITY_COOKIE = "rg_last_activity";

export const ESTABLISHMENT_TYPES: {
  value: EstablishmentType;
  label: string;
}[] = [
  { value: "bar", label: "Bar" },
  { value: "restaurante", label: "Restaurante" },
  { value: "cafeteria", label: "Cafetería" },
  { value: "chiringuito", label: "Chiringuito" },
  { value: "taberna", label: "Taberna" },
  { value: "otro", label: "Otro" },
];

export const ESTABLISHMENT_TYPE_LABELS: Record<EstablishmentType, string> =
  Object.fromEntries(
    ESTABLISHMENT_TYPES.map((t) => [t.value, t.label]),
  ) as Record<EstablishmentType, string>;

export const SORT_OPTIONS = [
  { value: "created_at.desc", label: "Más recientes" },
  { value: "name.asc", label: "Nombre (A-Z)" },
  { value: "name.desc", label: "Nombre (Z-A)" },
  { value: "rating.desc", label: "Mejor valorados" },
  { value: "rating.asc", label: "Peor valorados" },
  { value: "avg_price.asc", label: "Precio (menor a mayor)" },
  { value: "avg_price.desc", label: "Precio (mayor a menor)" },
  { value: "visit_date.desc", label: "Visita más reciente" },
  { value: "provincia.asc", label: "Provincia" },
] as const;

/** Centro geográfico aproximado de España para el mapa inicial. */
export const SPAIN_CENTER: [number, number] = [40.0, -3.7];
export const SPAIN_ZOOM = 6;

/** Bucket de Supabase Storage donde se guardan las fotos. */
export const PHOTOS_BUCKET = "photos";

/** Tamaño máximo (MB) al que se comprimen las fotos antes de subirlas. */
export const PHOTO_MAX_SIZE_MB = 1.5;
export const PHOTO_MAX_DIMENSION = 1920;

export const PAGE_SIZE = 12;
