import {
  CalendarDays,
  Camera,
  Clock,
  Euro,
  Globe,
  Heart,
  MapPin,
  MessageSquareText,
  Music2,
  Pencil,
  Phone,
  RotateCcw,
  StickyNote,
  ThumbsUp,
  UtensilsCrossed,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MiniMapView } from "@/components/map/mini-map-view";
import { PhotoGallery } from "@/components/restaurants/photo-gallery";
import { StarRating } from "@/components/restaurants/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ESTABLISHMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { getRestaurantById } from "@/services/restaurants";

export async function generateMetadata(
  props: PageProps<"/restaurantes/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const restaurant = await getRestaurantById(id).catch(() => null);
  if (!restaurant) return { title: "No encontrado" };
  return {
    title: restaurant.name,
    description: `${ESTABLISHMENT_TYPE_LABELS[restaurant.type]} en ${
      [restaurant.municipio, restaurant.provincia?.nombre]
        .filter(Boolean)
        .join(", ") || "España"
    }`,
  };
}

function DataRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words">{children}</div>
      </div>
    </div>
  );
}

export default async function RestauranteDetallePage(
  props: PageProps<"/restaurantes/[id]">,
) {
  const { id } = await props.params;
  const restaurant = await getRestaurantById(id).catch(() => null);
  if (!restaurant) notFound();

  const fullAddress = [
    restaurant.address,
    restaurant.postal_code,
    restaurant.municipio,
    restaurant.provincia?.nombre,
    restaurant.provincia?.comunidad?.nombre,
  ]
    .filter(Boolean)
    .join(", ");

  const socials = [
    { url: restaurant.website, label: "Página web", icon: <Globe className="size-4" /> },
    { url: restaurant.instagram, label: "Instagram", icon: <Camera className="size-4" /> },
    { url: restaurant.facebook, label: "Facebook", icon: <ThumbsUp className="size-4" /> },
    { url: restaurant.tiktok, label: "TikTok", icon: <Music2 className="size-4" /> },
  ].filter((s) => s.url);

  const dishes = [...restaurant.favorite_dishes].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <article className="space-y-6">
      {/* Cabecera */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {ESTABLISHMENT_TYPE_LABELS[restaurant.type]}
            </Badge>
            {restaurant.is_favorite && (
              <Badge className="gap-1 bg-red-500/10 text-red-600 dark:text-red-400">
                <Heart className="size-3 fill-current" aria-hidden="true" />
                Favorito
              </Badge>
            )}
            {restaurant.would_return != null && (
              <Badge variant="outline" className="gap-1">
                <RotateCcw className="size-3" aria-hidden="true" />
                {restaurant.would_return ? "Repetiríamos" : "No repetiríamos"}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <StarRating rating={restaurant.rating} size="lg" />
            {restaurant.avg_price != null && (
              <span className="text-lg font-semibold text-muted-foreground">
                {formatPrice(restaurant.avg_price)}{" "}
                <span className="text-sm font-normal">/ persona</span>
              </span>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/restaurantes/${restaurant.id}/editar`}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Link>
        </Button>
      </header>

      {/* Galería */}
      <PhotoGallery photos={restaurant.photos} restaurantName={restaurant.name} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Comentario personal */}
          {restaurant.personal_comment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
                  Comentario personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line leading-relaxed">
                  {restaurant.personal_comment}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Platos favoritos */}
          {dishes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UtensilsCrossed className="size-4 text-primary" aria-hidden="true" />
                  Platos favoritos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {dishes.map((dish) => (
                    <li key={dish.id}>
                      <Badge variant="secondary" className="px-3 py-1 text-sm">
                        {dish.name}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          {restaurant.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="size-4 text-primary" aria-hidden="true" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line leading-relaxed">
                  {restaurant.observations}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Vídeos */}
          {restaurant.videos.length > 0 && (
            <section aria-label="Vídeos" className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Vídeos</h2>
              {restaurant.videos.map((video) => {
                const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
                if (!embedUrl) return null;
                return (
                  <div
                    key={video.id}
                    className="overflow-hidden rounded-xl border shadow-sm"
                  >
                    <iframe
                      src={embedUrl}
                      title={video.title ?? `Vídeo de ${restaurant.name}`}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Mapa pequeño */}
          {restaurant.latitude != null && restaurant.longitude != null && (
            <div className="h-56 overflow-hidden rounded-xl border shadow-sm">
              <MiniMapView
                latitude={restaurant.latitude}
                longitude={restaurant.longitude}
                isFavorite={restaurant.is_favorite}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fullAddress && (
                <DataRow icon={<MapPin className="size-4" />} label="Dirección">
                  {fullAddress}
                </DataRow>
              )}
              {restaurant.phone && (
                <DataRow icon={<Phone className="size-4" />} label="Teléfono">
                  <a
                    href={`tel:${restaurant.phone.replaceAll(" ", "")}`}
                    className="hover:text-primary hover:underline"
                  >
                    {restaurant.phone}
                  </a>
                </DataRow>
              )}
              {restaurant.schedule && (
                <DataRow icon={<Clock className="size-4" />} label="Horario">
                  {restaurant.schedule}
                </DataRow>
              )}
              {restaurant.avg_price != null && (
                <DataRow icon={<Euro className="size-4" />} label="Precio medio">
                  {formatPrice(restaurant.avg_price)} por persona
                </DataRow>
              )}
              {restaurant.visit_date && (
                <DataRow
                  icon={<CalendarDays className="size-4" />}
                  label="Fecha de visita"
                >
                  {formatDate(restaurant.visit_date)}
                </DataRow>
              )}

              {socials.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {socials.map((s) => (
                      <Button
                        key={s.label}
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <a
                          href={s.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span aria-hidden="true">{s.icon}</span>
                          {s.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </article>
  );
}
