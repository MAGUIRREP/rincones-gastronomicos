/**
 * Tipos de la base de datos de Supabase.
 *
 * Mantenidos a mano para no depender de la generación automática.
 * Si cambias el esquema, actualiza también estos tipos
 * (o regenera con `npx supabase gen types typescript`).
 */

export type UserRole = "admin" | "usuario";

export type EstablishmentType =
  | "bar"
  | "restaurante"
  | "cafeteria"
  | "chiringuito"
  | "taberna"
  | "otro";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface Comunidad {
  id: number;
  nombre: string;
}

export interface Provincia {
  id: number;
  nombre: string;
  comunidad_id: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  type: EstablishmentType;
  address: string | null;
  postal_code: string | null;
  municipio: string | null;
  provincia_id: number | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  google_maps_url: string | null;
  schedule: string | null;
  avg_price: number | null;
  rating: number | null;
  personal_comment: string | null;
  observations: string | null;
  visit_date: string | null;
  would_return: boolean | null;
  is_favorite: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  restaurant_id: string;
  storage_path: string;
  is_main: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
}

export interface FavoriteDish {
  id: string;
  restaurant_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Video {
  id: string;
  restaurant_id: string;
  youtube_url: string;
  title: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: AuditAction;
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

/** Restaurante con sus relaciones cargadas (joins de Supabase). */
export interface RestaurantWithRelations extends Restaurant {
  provincia: (Provincia & { comunidad: Comunidad }) | null;
  photos: Photo[];
  favorite_dishes: FavoriteDish[];
  videos: Video[];
}

/** Fila de auditoría con el perfil de quien hizo el cambio. */
export interface AuditLogWithProfile extends AuditLogEntry {
  profile: Pick<Profile, "email" | "full_name"> | null;
}
