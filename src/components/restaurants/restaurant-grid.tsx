import { SearchX } from "lucide-react";

import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import type { RestaurantWithRelations } from "@/types/database";

interface RestaurantGridProps {
  restaurants: RestaurantWithRelations[];
  /** true si hay sesión iniciada (muestra botones de edición). */
  canEdit: boolean;
  isAdmin: boolean;
  emptyMessage?: string;
}

export function RestaurantGrid({
  restaurants,
  canEdit,
  isAdmin,
  emptyMessage = "No se han encontrado establecimientos con esos criterios.",
}: RestaurantGridProps) {
  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
