import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import type { RestaurantFilters } from "@/lib/validations/restaurant";
import type {
  Comunidad,
  Provincia,
  RestaurantWithRelations,
} from "@/types/database";

const RESTAURANT_SELECT = `
  *,
  provincia:provincias (id, nombre, comunidad_id, comunidad:comunidades (id, nombre)),
  photos (id, restaurant_id, storage_path, is_main, position, created_by, created_at),
  favorite_dishes (id, restaurant_id, name, position, created_at),
  videos (id, restaurant_id, youtube_url, title, created_at)
`;

export interface RestaurantListResult {
  restaurants: RestaurantWithRelations[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Listado de establecimientos con filtros, orden y paginación.
 * Toda la consulta pasa por RLS (usuarios activos).
 */
export async function getRestaurants(
  filters: RestaurantFilters,
): Promise<RestaurantListResult> {
  const supabase = await createClient();

  let dishRestaurantIds: string[] | null = null;

  // Búsqueda por plato: obtener primero los ids que coinciden.
  if (filters.q) {
    const { data: dishes } = await supabase
      .from("favorite_dishes")
      .select("restaurant_id")
      .ilike("name", `%${filters.q}%`)
      .limit(500);
    dishRestaurantIds = [...new Set((dishes ?? []).map((d) => d.restaurant_id))];
  }

  // Filtro por comunidad: traducir a lista de provincias.
  let provinciaIds: number[] | null = null;
  if (filters.comunidad && !filters.provincia) {
    const { data: provs } = await supabase
      .from("provincias")
      .select("id")
      .eq("comunidad_id", filters.comunidad);
    provinciaIds = (provs ?? []).map((p) => p.id);
  }

  let query = supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT, { count: "exact" });

  if (filters.q) {
    const q = filters.q.replaceAll(",", " ").replaceAll("(", "").replaceAll(")", "");
    const orParts = [
      `name.ilike.%${q}%`,
      `personal_comment.ilike.%${q}%`,
      `observations.ilike.%${q}%`,
      `address.ilike.%${q}%`,
      `municipio.ilike.%${q}%`,
    ];
    if (dishRestaurantIds && dishRestaurantIds.length > 0) {
      orParts.push(`id.in.(${dishRestaurantIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.provincia) query = query.eq("provincia_id", filters.provincia);
  if (provinciaIds) {
    query = provinciaIds.length
      ? query.in("provincia_id", provinciaIds)
      : query.eq("provincia_id", -1); // comunidad sin provincias: sin resultados
  }
  if (filters.municipio) query = query.ilike("municipio", `%${filters.municipio}%`);
  if (filters.minRating) query = query.gte("rating", filters.minRating);
  if (filters.favorites) query = query.eq("is_favorite", true);
  if (filters.maxPrice != null) query = query.lte("avg_price", filters.maxPrice);
  if (filters.visitedFrom) query = query.gte("visit_date", filters.visitedFrom);
  if (filters.visitedTo) query = query.lte("visit_date", filters.visitedTo);

  // Orden
  const [sortField, sortDir] = (filters.sort ?? "created_at.desc").split(".");
  const ascending = sortDir === "asc";
  const validSortFields = [
    "name",
    "rating",
    "avg_price",
    "visit_date",
    "created_at",
  ];
  if (sortField === "provincia") {
    query = query.order("provincia_id", { ascending, nullsFirst: false });
  } else if (validSortFields.includes(sortField)) {
    query = query.order(sortField, { ascending, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Paginación
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Error cargando establecimientos: ${error.message}`);

  const total = count ?? 0;
  return {
    restaurants: (data ?? []) as unknown as RestaurantWithRelations[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Ficha completa de un establecimiento, con nombre de quién lo creó/editó. */
export async function getRestaurantById(
  id: string,
): Promise<RestaurantWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Error cargando el establecimiento: ${error.message}`);
  if (!data) return null;

  const restaurant = data as unknown as RestaurantWithRelations;

  // Nombres del creador y del último editor a través de la vista pública
  // (profiles es privado; public_profiles solo expone id + nombre).
  const ids = [restaurant.created_by, restaurant.updated_by].filter(
    (v): v is string => Boolean(v),
  );
  if (ids.length > 0) {
    const { data: people } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", [...new Set(ids)]);

    const byId = new Map((people ?? []).map((p) => [p.id, p.full_name]));
    restaurant.creator_name = restaurant.created_by
      ? byId.get(restaurant.created_by) ?? null
      : null;
    restaurant.updater_name = restaurant.updated_by
      ? byId.get(restaurant.updated_by) ?? null
      : null;
  }

  return restaurant;
}

/** Todos los establecimientos con coordenadas (para el mapa). */
export async function getRestaurantsForMap() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, type, address, municipio, rating, latitude, longitude, is_favorite,
       photos (storage_path, is_main)`,
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(2000);

  if (error) throw new Error(`Error cargando el mapa: ${error.message}`);
  return data ?? [];
}

/** Provincias con su comunidad (para selects y filtros). */
export async function getProvincias(): Promise<
  (Provincia & { comunidad: Comunidad })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("provincias")
    .select("id, nombre, comunidad_id, comunidad:comunidades (id, nombre)")
    .order("nombre");
  return (data ?? []) as unknown as (Provincia & { comunidad: Comunidad })[];
}

export async function getComunidades(): Promise<Comunidad[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comunidades")
    .select("id, nombre")
    .order("nombre");
  return data ?? [];
}

/** Estadísticas para la home y el dashboard. */
export async function getStats() {
  const supabase = await createClient();

  const [statsRes, byProvinciaRes, latestRes, topRes] = await Promise.all([
    supabase.from("restaurant_stats").select("*").single(),
    supabase
      .from("restaurants")
      .select(
        "provincia_id, provincia:provincias (nombre, comunidad:comunidades (id, nombre))",
      ),
    supabase
      .from("restaurants")
      .select(RESTAURANT_SELECT)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("restaurants")
      .select(RESTAURANT_SELECT)
      .not("rating", "is", null)
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Agregación por provincia y comunidad en memoria (pocos registros).
  const byProvincia = new Map<string, number>();
  const byComunidad = new Map<string, number>();
  for (const row of byProvinciaRes.data ?? []) {
    const prov = row.provincia as unknown as {
      nombre: string;
      comunidad: { nombre: string } | null;
    } | null;
    if (!prov) continue;
    byProvincia.set(prov.nombre, (byProvincia.get(prov.nombre) ?? 0) + 1);
    if (prov.comunidad) {
      byComunidad.set(
        prov.comunidad.nombre,
        (byComunidad.get(prov.comunidad.nombre) ?? 0) + 1,
      );
    }
  }

  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);

  return {
    total: statsRes.data?.total ?? 0,
    avgRating: Number(statsRes.data?.avg_rating ?? 0),
    favorites: statsRes.data?.favorites ?? 0,
    byProvincia: sortDesc(byProvincia),
    byComunidad: sortDesc(byComunidad),
    latest: (latestRes.data ?? []) as unknown as RestaurantWithRelations[],
    top: (topRes.data ?? []) as unknown as RestaurantWithRelations[],
  };
}
