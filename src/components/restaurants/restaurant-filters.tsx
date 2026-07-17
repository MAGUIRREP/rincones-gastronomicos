"use client";

import { Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ESTABLISHMENT_TYPES, SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Comunidad, Provincia } from "@/types/database";

interface RestaurantFiltersProps {
  provincias: (Provincia & { comunidad: Comunidad })[];
  comunidades: Comunidad[];
  className?: string;
}

const ALL = "all";

/**
 * Barra de filtros: buscador con debounce + filtros rápidos +
 * panel lateral con filtros avanzados. El estado vive en la URL,
 * por lo que los filtros son compartibles y sobreviven a recargas.
 */
export function RestaurantFilters({
  provincias,
  comunidades,
  className,
}: RestaurantFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === ALL) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page"); // cualquier cambio de filtro vuelve a página 1
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Buscador con debounce de 400 ms.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const timeout = setTimeout(() => setParams({ q: search || null }), 400);
    return () => clearTimeout(timeout);
  }, [search, searchParams, setParams]);

  const comunidadFilter = searchParams.get("comunidad");
  const filteredProvincias = comunidadFilter
    ? provincias.filter((p) => p.comunidad_id === Number(comunidadFilter))
    : provincias;

  const activeFilterCount = [
    "type",
    "provincia",
    "comunidad",
    "municipio",
    "minRating",
    "favorites",
    "maxPrice",
    "visitedFrom",
    "visitedTo",
  ].filter((k) => searchParams.has(k)).length;

  const favoritesActive = searchParams.get("favorites") === "true";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            role="searchbox"
            aria-label="Buscar por nombre, comentario, dirección, plato, municipio o provincia"
            placeholder="Buscar por nombre, plato, municipio…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {/* Orden */}
          <Select
            value={searchParams.get("sort") ?? "created_at.desc"}
            onValueChange={(v) => setParams({ sort: v })}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Ordenar por">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Panel de filtros avanzados */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="size-5 justify-center rounded-full p-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filtros avanzados</SheetTitle>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={searchParams.get("type") ?? ALL}
                    onValueChange={(v) => setParams({ type: v })}
                  >
                    <SelectTrigger aria-label="Filtrar por tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {ESTABLISHMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Comunidad Autónoma</Label>
                  <Select
                    value={comunidadFilter ?? ALL}
                    onValueChange={(v) =>
                      setParams({ comunidad: v, provincia: null })
                    }
                  >
                    <SelectTrigger aria-label="Filtrar por comunidad autónoma">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas</SelectItem>
                      {comunidades.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Select
                    value={searchParams.get("provincia") ?? ALL}
                    onValueChange={(v) => setParams({ provincia: v })}
                  >
                    <SelectTrigger aria-label="Filtrar por provincia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas</SelectItem>
                      {filteredProvincias.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-municipio">Municipio</Label>
                  <Input
                    id="filter-municipio"
                    defaultValue={searchParams.get("municipio") ?? ""}
                    placeholder="Ej: Cudillero"
                    onBlur={(e) => setParams({ municipio: e.target.value || null })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setParams({
                          municipio: (e.target as HTMLInputElement).value || null,
                        });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valoración mínima</Label>
                  <Select
                    value={searchParams.get("minRating") ?? ALL}
                    onValueChange={(v) => setParams({ minRating: v })}
                  >
                    <SelectTrigger aria-label="Valoración mínima">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Cualquiera</SelectItem>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {"★".repeat(n)} o más
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-maxprice">Precio máximo (€)</Label>
                  <Input
                    id="filter-maxprice"
                    type="number"
                    min={0}
                    defaultValue={searchParams.get("maxPrice") ?? ""}
                    placeholder="Ej: 30"
                    onBlur={(e) => setParams({ maxPrice: e.target.value || null })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="filter-from">Visitado desde</Label>
                    <Input
                      id="filter-from"
                      type="date"
                      defaultValue={searchParams.get("visitedFrom") ?? ""}
                      onChange={(e) =>
                        setParams({ visitedFrom: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-to">Visitado hasta</Label>
                    <Input
                      id="filter-to"
                      type="date"
                      defaultValue={searchParams.get("visitedTo") ?? ""}
                      onChange={(e) =>
                        setParams({ visitedTo: e.target.value || null })
                      }
                    />
                  </div>
                </div>
              </div>

              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push(pathname);
                    setSearch("");
                    setSheetOpen(false);
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                  Limpiar filtros
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filtros rápidos"
      >
        <Button
          variant={favoritesActive ? "default" : "outline"}
          size="sm"
          className="h-8 rounded-full"
          aria-pressed={favoritesActive}
          onClick={() =>
            setParams({ favorites: favoritesActive ? null : "true" })
          }
        >
          <Heart
            className={cn("size-3.5", favoritesActive && "fill-current")}
            aria-hidden="true"
          />
          Favoritos
        </Button>
        {ESTABLISHMENT_TYPES.map((t) => {
          const active = searchParams.get("type") === t.value;
          return (
            <Button
              key={t.value}
              variant={active ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-full"
              aria-pressed={active}
              onClick={() => setParams({ type: active ? null : t.value })}
            >
              {t.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
