import {
  Heart,
  MapPin,
  Star,
  Trophy,
  Utensils,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomeMap } from "@/components/map/home-map";
import { RestaurantGrid } from "@/components/restaurants/restaurant-grid";
import { StarRating } from "@/components/restaurants/star-rating";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import { getCurrentProfile } from "@/services/profile";
import { getRestaurantsForMap, getStats } from "@/services/restaurants";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Estadísticas de los rincones gastronómicos",
};

function RankingList({
  title,
  items,
}: {
  title: string;
  items: { nombre: string; count: number }[];
}) {
  const max = items[0]?.count ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
        ) : (
          <ul className="space-y-3">
            {items.slice(0, 8).map((item) => (
              <li key={item.nombre} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.nombre}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.count}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [stats, mapData, profile] = await Promise.all([
    getStats(),
    getRestaurantsForMap(),
    getCurrentProfile(),
  ]);
  const canEdit = Boolean(profile && !profile.is_blocked);
  const isAdmin = canEdit && profile!.role === "admin";

  const statCards = [
    {
      icon: <Utensils className="size-5" />,
      label: "Establecimientos",
      value: stats.total,
    },
    {
      icon: <Star className="size-5" />,
      label: "Valoración media",
      value: stats.avgRating ? stats.avgRating.toFixed(1) : "—",
    },
    {
      icon: <Heart className="size-5" />,
      label: "Favoritos",
      value: stats.favorites,
    },
    {
      icon: <MapPin className="size-5" />,
      label: "Provincias",
      value: stats.byProvincia.length,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de vuestros descubrimientos gastronómicos.
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <section
        aria-label="Estadísticas generales"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {statCards.map((s) => (
          <Card key={s.label} className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                aria-hidden="true"
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-bold tabular-nums">
                  {s.value}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Rankings por provincia y comunidad */}
      <section
        aria-label="Distribución geográfica"
        className="grid gap-4 lg:grid-cols-2"
      >
        <RankingList title="Por provincia" items={stats.byProvincia} />
        <RankingList title="Por comunidad autónoma" items={stats.byComunidad} />
      </section>

      {/* Top 10 */}
      <section aria-label="Top 10" className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">
            Top 10 mejor valorados
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Ubicación</TableHead>
                <TableHead>Valoración</TableHead>
                <TableHead className="hidden md:table-cell">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.top.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Aún no hay establecimientos valorados.
                  </TableCell>
                </TableRow>
              )}
              {stats.top.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {i < 3 ? (
                      <Badge
                        className="size-6 justify-center rounded-full p-0"
                        variant={i === 0 ? "default" : "secondary"}
                      >
                        {i + 1}
                      </Badge>
                    ) : (
                      <span className="pl-2 text-muted-foreground">{i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/restaurantes/${r.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {[r.municipio, r.provincia?.nombre].filter(Boolean).join(", ")}
                  </TableCell>
                  <TableCell>
                    <StarRating rating={r.rating} size="sm" />
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {formatPrice(r.avg_price)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Mapa resumen */}
      <section aria-label="Mapa resumen" className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Mapa resumen</h2>
        <div className="h-96 overflow-hidden rounded-xl border shadow-sm">
          <HomeMap restaurants={mapData} />
        </div>
      </section>

      {/* Últimos añadidos */}
      <section aria-label="Últimos añadidos" className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Últimos añadidos
        </h2>
        <RestaurantGrid
          restaurants={stats.latest.slice(0, 4)}
          canEdit={canEdit}
          isAdmin={isAdmin}
          emptyMessage="Todavía no hay establecimientos."
        />
      </section>
    </div>
  );
}
