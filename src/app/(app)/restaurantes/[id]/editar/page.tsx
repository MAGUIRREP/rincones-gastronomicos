import { Images } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhotoManager } from "@/components/restaurants/photo-manager";
import { RestaurantForm } from "@/components/restaurants/restaurant-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getComunidades,
  getProvincias,
  getRestaurantById,
} from "@/services/restaurants";

export async function generateMetadata(
  props: PageProps<"/restaurantes/[id]/editar">,
): Promise<Metadata> {
  const { id } = await props.params;
  const restaurant = await getRestaurantById(id).catch(() => null);
  return { title: restaurant ? `Editar ${restaurant.name}` : "Editar" };
}

export default async function EditarRestaurantePage(
  props: PageProps<"/restaurantes/[id]/editar">,
) {
  const { id } = await props.params;
  const [restaurant, provincias, comunidades] = await Promise.all([
    getRestaurantById(id).catch(() => null),
    getProvincias(),
    getComunidades(),
  ]);

  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Editar {restaurant.name}
        </h1>
        <p className="text-muted-foreground">
          Actualiza la ficha o gestiona sus fotografías.
        </p>
      </div>

      {/* Gestión de fotografías */}
      <Card id="fotos">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Images className="size-5" />
          </div>
          <div>
            <CardTitle>Fotografías</CardTitle>
            <CardDescription>
              Sube varias, elige la principal o elimina las que sobren
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PhotoManager
            restaurantId={restaurant.id}
            photos={restaurant.photos}
          />
        </CardContent>
      </Card>

      <RestaurantForm
        provincias={provincias}
        comunidades={comunidades}
        restaurant={restaurant}
      />
    </div>
  );
}
