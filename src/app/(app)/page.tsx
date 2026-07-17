import { Heart, MapPin, Plus, Star, TrendingUp, Utensils } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomeMap } from "@/components/map/home-map";
import { RestaurantFilters } from "@/components/restaurants/restaurant-filters";
import { RestaurantGrid } from "@/components/restaurants/restaurant-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isCurrentUserAdmin } from "@/services/profile";
import {
  getComunidades,
  getProvincias,
  getRestaurantsForMap,
  getStats,
} from "@/services/restaurants";

export const metadata: Metadata = {
  title: "Inicio",
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold tabular-nums">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  const [stats, mapData, provincias, comunidades, isAdmin] = await Promise.all([
    getStats(),
    getRestaurantsForMap(),
    getProvincias(),
    getComunidades(),
    isCurrentUserAdmin(),
  ]);

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Los rincones gastronómicos
            <span className="block text-primary">de Álvaro y Mariano</span>
          </h1>
          <p className="text-muted-foreground">
            {stats.total} establecimientos descubiertos por toda España
          </p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link href="/restaurantes/nuevo">
            <Plus className="size-5" aria-hidden="true" />
            Añadir establecimiento
          </Link>
        </Button>
      </section>

      {/* Estadísticas rápidas */}
      <section
        aria-label="Estadísticas"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          icon={<Utensils className="size-5" />}
          label="Establecimientos"
          value={stats.total}
        />
        <StatCard
          icon={<Star className="size-5" />}
          label="Valoración media"
          value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
        />
        <StatCard
          icon={<Heart className="size-5" />}
          label="Favoritos"
          value={stats.favorites}
        />
        <StatCard
          icon={<MapPin className="size-5" />}
          label="Provincias visitadas"
          value={stats.byProvincia.length}
        />
      </section>

      {/* Buscador + filtros rápidos */}
      <section aria-label="Buscador y filtros">
        <RestaurantFilters
          provincias={provincias}
          comunidades={comunidades}
        />
      </section>

      {/* Mapa de España */}
      <section aria-label="Mapa de establecimientos" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Mapa de España
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/mapa">Ver mapa completo →</Link>
          </Button>
        </div>
        <div className="h-[420px] overflow-hidden rounded-xl border shadow-sm">
          <HomeMap restaurants={mapData} />
        </div>
      </section>

      {/* Últimos añadidos */}
      <section aria-label="Últimos añadidos" className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">
            Últimos añadidos
          </h2>
        </div>
        <RestaurantGrid
          restaurants={stats.latest}
          isAdmin={isAdmin}
          emptyMessage="Todavía no hay establecimientos. ¡Añade el primero!"
        />
      </section>

      {/* Mejor valorados */}
      <section aria-label="Mejor valorados" className="space-y-3">
        <div className="flex items-center gap-2">
          <Star className="size-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">
            Mejor valorados
          </h2>
        </div>
        <RestaurantGrid
          restaurants={stats.top.slice(0, 8)}
          isAdmin={isAdmin}
          emptyMessage="Aún no hay establecimientos valorados."
        />
      </section>
    </div>
  );
}
