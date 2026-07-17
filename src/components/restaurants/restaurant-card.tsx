"use client";

import {
  Heart,
  ImageOff,
  MapPin,
  Pencil,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteRestaurantAction,
  toggleFavoriteAction,
} from "@/app/actions/restaurants";
import { StarRating } from "@/components/restaurants/star-rating";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ESTABLISHMENT_TYPE_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { getMainPhotoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";
import type { RestaurantWithRelations } from "@/types/database";

interface RestaurantCardProps {
  restaurant: RestaurantWithRelations;
  isAdmin: boolean;
}

export function RestaurantCard({ restaurant, isAdmin }: RestaurantCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const photoUrl = getMainPhotoUrl(restaurant.photos);
  const mainDish = restaurant.favorite_dishes?.[0]?.name;

  const handleToggleFavorite = () => {
    startTransition(async () => {
      const result = await toggleFavoriteAction(
        restaurant.id,
        !restaurant.is_favorite,
      );
      if (result.success) {
        toast.success(
          restaurant.is_favorite
            ? "Eliminado de favoritos"
            : "Añadido a favoritos",
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al actualizar");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteRestaurantAction(restaurant.id);
      if (result.success) {
        toast.success("Establecimiento eliminado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al eliminar");
      }
      setConfirmDelete(false);
    });
  };

  return (
    <Card className="group gap-0 overflow-hidden py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Link
          href={`/restaurantes/${restaurant.id}`}
          aria-label={`Ver ficha de ${restaurant.name}`}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={`Foto de ${restaurant.name}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-10" aria-hidden="true" />
            </div>
          )}
        </Link>

        <Badge className="absolute left-3 top-3 shadow-sm" variant="secondary">
          {ESTABLISHMENT_TYPE_LABELS[restaurant.type]}
        </Badge>

        <Button
          variant="secondary"
          size="icon"
          disabled={isPending}
          onClick={handleToggleFavorite}
          aria-label={
            restaurant.is_favorite
              ? `Quitar ${restaurant.name} de favoritos`
              : `Añadir ${restaurant.name} a favoritos`
          }
          aria-pressed={restaurant.is_favorite}
          className="absolute right-3 top-3 size-8 rounded-full shadow-sm"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              restaurant.is_favorite && "fill-red-500 text-red-500",
            )}
            aria-hidden="true"
          />
        </Button>
      </div>

      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/restaurantes/${restaurant.id}`}
            className="line-clamp-1 font-semibold tracking-tight hover:text-primary hover:underline"
          >
            {restaurant.name}
          </Link>
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {formatPrice(restaurant.avg_price)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {[restaurant.municipio, restaurant.provincia?.nombre]
              .filter(Boolean)
              .join(", ") || "Sin ubicación"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <StarRating rating={restaurant.rating} size="sm" />
          {mainDish && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <UtensilsCrossed className="size-3" aria-hidden="true" />
              <span className="line-clamp-1">{mainDish}</span>
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 border-t p-3">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/restaurantes/${restaurant.id}/editar`}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link
            href={
              restaurant.latitude != null
                ? `/mapa?focus=${restaurant.id}`
                : "/mapa"
            }
          >
            <MapPin className="size-3.5" aria-hidden="true" />
            Mapa
          </Link>
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Eliminar ${restaurant.name}`}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </CardFooter>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {restaurant.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también sus fotos, platos y vídeos. Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
