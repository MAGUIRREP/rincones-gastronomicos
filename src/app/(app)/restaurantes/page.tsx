import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListPagination } from "@/components/restaurants/list-pagination";
import { RestaurantFilters } from "@/components/restaurants/restaurant-filters";
import { RestaurantGrid } from "@/components/restaurants/restaurant-grid";
import { RestaurantGridSkeleton } from "@/components/restaurants/restaurant-skeleton";
import { Button } from "@/components/ui/button";
import { restaurantFiltersSchema } from "@/lib/validations/restaurant";
import { isCurrentUserAdmin } from "@/services/profile";
import {
  getComunidades,
  getProvincias,
  getRestaurants,
} from "@/services/restaurants";

export const metadata: Metadata = {
  title: "Establecimientos",
  description: "Listado de todos los bares y restaurantes guardados",
};

async function RestaurantList({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Validación en servidor de los parámetros de la URL.
  const parsed = restaurantFiltersSchema.safeParse({
    q: searchParams.q,
    type: searchParams.type,
    provincia: searchParams.provincia,
    comunidad: searchParams.comunidad,
    municipio: searchParams.municipio,
    minRating: searchParams.minRating,
    favorites: searchParams.favorites === "true" ? true : undefined,
    maxPrice: searchParams.maxPrice,
    visitedFrom: searchParams.visitedFrom,
    visitedTo: searchParams.visitedTo,
    sort: searchParams.sort,
    page: searchParams.page ?? 1,
  });

  const filters = parsed.success ? parsed.data : { page: 1 };
  const [{ restaurants, total, page, pageCount }, isAdmin] = await Promise.all([
    getRestaurants(filters),
    isCurrentUserAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground" role="status">
        {total} {total === 1 ? "establecimiento encontrado" : "establecimientos encontrados"}
      </p>
      <RestaurantGrid restaurants={restaurants} isAdmin={isAdmin} />
      <ListPagination page={page} pageCount={pageCount} />
    </div>
  );
}

export default async function RestaurantesPage(
  props: PageProps<"/restaurantes">,
) {
  const searchParams = await props.searchParams;
  const [provincias, comunidades] = await Promise.all([
    getProvincias(),
    getComunidades(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Establecimientos</h1>
        <Button asChild>
          <Link href="/restaurantes/nuevo">
            <Plus className="size-4" aria-hidden="true" />
            Añadir nuevo
          </Link>
        </Button>
      </div>

      <RestaurantFilters provincias={provincias} comunidades={comunidades} />

      <Suspense fallback={<RestaurantGridSkeleton />}>
        <RestaurantList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
